'use strict';

const async = require('async');
const rimraf = require('rimraf');
const mime = require('mime-types');
const nodegit = require('nodegit');
const barrkeep = require('barrkeep');

////////////////////////////////////////

function branchFilter(refs) {
  return refs.filter(ref => ref.startsWith('refs/remotes/')).
    map(branch => branch.replace(/^refs\/remotes\//, ''));
}

function calculateProgress(progress) {
  let percent = progress.receivedObjects() / progress.totalObjects();
  percent = Math.floor(percent * 100);
  percent = Math.min(percent, 99);

  return percent;
}

////////////////////////////////////////

function Git(pulley) {
  const self = this;

  self.cloneRepository = function(project, callback) {
    try {
      rimraf.sync(project.path);
    } catch (error) {
      console.log('cleanup error', error);
    }

    return nodegit.Clone(project.origin, project.path, {
      fetchOpts: {
        callbacks: {
          credentials: function(repo, user) {
            return self.credentials(project, user);
          },
          transferProgress: function(progress) {
            project.progress = calculateProgress(progress);
          }
        }
      }
    }).
      then(function(repository) {
        project.repository = repository;
        return nodegit.Reference.list(repository);
      }).
      then(function(refs) {
        const branches = branchFilter(refs);
        project.branches = branches;

        project.progress = 100;
        callback(null, project);
      }).
      catch(function(error) {
        callback(error);
      });
  };

  self.updateRepository = function(project, callback) {
    return project.repository.fetch('origin', {
      callbacks: {
        credentials: function(repo, user) {
          return self.credentials(project, user);
        },
        transferProgress: function(progress) {
          project.progress = calculateProgress(progress);
        }
      }
    }).
      then(function() {
        return project.repository.refreshIndex();
      }).
      then(function() {
        return nodegit.Reference.list(project.repository);
      }).
      then(function(refs) {
        const branches = branchFilter(refs);
        project.branches = branches;

        project.progress = 100;
        callback(null, project);
      }).
      catch(function(error) {
        callback(error);
      });
  };

  self.openRepository = function(project, callback) {
    nodegit.Repository.open(project.gitPath).
      then(function(repo) {
        project.repository = repo;
        callback(null, project);
      }).
      catch(function(error) {
        callback(error);
      });
  };

  self.createReview = function(project, owner, sourceBranch, targetBranch, callback) {
    const review = {
      _id: pulley.store.generateId(),
      project: project._id,
      source: sourceBranch,
      target: targetBranch,
      owner: owner,
      timestamp: Date.now(),
      private: false,
      state: 'in-review',
      reviewers: [],
      commits: {
        list: [],
        versions: {},
        remaps: {}
      },
      versions: []
    };

    return self.generateBranchChangeset(project.repository, sourceBranch, targetBranch).
      then(function(changeset) {
        review.versions.push(changeset);

        changeset.commits.forEach(function(commit) {
          review.commits.list.push(commit.commit);
          review.commits.versions[commit.commit] = 0; // review version
        });

        return callback(null, review);
      }).
      catch(function(error) {
        return callback(error);
      });
  };

  self.generateBranchChangeset = function(repository, sourceBranch, targetBranch) {
    let sourceCommit;
    let targetCommit;
    let mergebase;
    let sourceTree;
    let targetTree;
    const commits = [];

    const changeset = {
      _id: pulley.store.generateId(),
      sourceCommit: null,
      targetCommit: null,
      mergebase: null,
      diff: null,
      commits: null
    };

    return repository.getBranchCommit(targetBranch).
      then(function(firstCommitOnMaster) {
        targetCommit = firstCommitOnMaster;
        changeset.targetCommit = targetCommit.id().toString();
        return targetCommit.getTree();
      }).
      then(function(tree) {
        targetTree = tree;
        return repository.getBranchCommit(sourceBranch);
      }).
      then(function(firstCommitOnBranch) {
        sourceCommit = firstCommitOnBranch;
        changeset.sourceCommit = sourceCommit.id().toString();
        return sourceCommit.getTree();
      }).
      then(function(tree) {
        sourceTree = tree;
        return nodegit.Diff.treeToTree(repository, targetTree, sourceTree);
      }).
      then(function(diff) {
        return diff.toBuf(nodegit.Diff.FORMAT.PATCH);
      }).
      then(function(buf) {
        changeset.diff = buf.toString();
        return nodegit.Merge.base(repository, targetCommit, sourceCommit);
      }).
      then(function(base) {
        mergebase = base;
        changeset.mergebase = mergebase.toString();

        return new Promise(function(resolve) {
          let done = false;
          const history = sourceCommit.history();
          history.on('commit', function(commit) {
            const id = commit.id();
            if (mergebase.equal(id)) {
              done = true;
            }

            if (!done) {
              commits.push(commit);
            }
          });

          history.on('end', function() {
            return resolve(commits);
          });

          history.start();
        });
      }).
      then(function(commitList) {
        return new Promise(function(resolve, reject) {

          async.map(commitList, function(commit, next) {
            const record = {
              _id: pulley.store.generateId(),
              commit: commit.sha(),
              author: commit.author().name() +
                ' <' + commit.author().email() + '>',
              date: new Date(commit.date()).getTime(),
              message: commit.message(),
              fingerprint: null,
              files: new Set(),
              patches: []
            };

            commit.getDiff().
              then(function(diffList) {
                let diffChain = Promise.resolve();
                for (const diff of diffList) {
                  diffChain = diffChain.
                    then(function() {
                      return diff.patches().
                        then(function(patches) {
                          let patchChain = Promise.resolve();
                          for (const patch of patches) {
                            const patchRecord = {
                              _id: pulley.store.generateId(),
                              previous: patch.oldFile().path(),
                              filename: patch.newFile().path(),
                              chunks: []
                            };
                            record.files.add(patchRecord.filename);
                            record.patches.push(patchRecord);
                            patchChain = patchChain.
                              then(function() {
                                return patch.hunks().
                                  then(function(hunks) {
                                    let hunkChain = Promise.resolve();
                                    for (const hunk of hunks) {
                                      const hunkRecord = {
                                        header: hunk.header().trim(),
                                        lines: []
                                      };
                                      patchRecord.chunks.push(hunkRecord);
                                      hunkChain = hunkChain.then(function() {
                                        return hunk.lines().then(function(lines) {
                                          lines.forEach(function(line) {
                                            hunkRecord.lines.push(
                                              String.fromCharCode(line.origin()) +
                                                line.content().trimRight());
                                          });
                                        });
                                      });
                                    }
                                    return hunkChain;
                                  });
                              });
                          }
                          return patchChain;
                        });
                    });
                }
                return diffChain.
                  then(function() {
                    record.fingerprint = barrkeep.getSHA1Hex(record.patches);
                    record.files = Array.from(record.files);
                    record.blobs = {};

                    let entryChain = Promise.resolve();
                    for (const file of record.files) {
                      entryChain = entryChain.then(function() {
                        return sourceCommit.getEntry(file).
                          then(function(entry) {
                            return entry.getBlob().
                              then(function(blob) {
                                const binary = !!blob.isBinary();
                                record.blobs[file] = {
                                  binary: binary,
                                  content: binary ? blob.content() : blob.toString(),
                                  type: mime.lookup(file)
                                };
                              });
                          });
                      });
                    }
                    return entryChain;
                  }).
                  then(function() {
                    next(null, record);
                  }).
                  catch(function(error) {
                    next(error);
                  });
              });
          }, function(error, results) {
            if (error) {
              return reject(error);
            } else {
              changeset.commits = results;
              return resolve(changeset);
            }
          });
        });
      });
  };

  self.credentials = function(project, user) {
    switch (project.credentials.type) {
      case 'key':
        return project.creds = nodegit.Cred.sshKeyMemoryNew(user,
                                                          project.credentials.publicKey,
                                                          project.credentials.privateKey,
                                                          project.credentials.passphrase);
      case 'local-key':
      default:
        return project.creds = nodegit.Cred.sshKeyNew(user,
                                                    project.credentials.publicKey,
                                                    project.credentials.privateKey,
                                                    project.credentials.passphrase);

    }
  };
}

////////////////////////////////////////

module.exports = function(pulley) {
  return new Git(pulley);
};

/*
  cloneRepository(testProject).
  then(function(project) {
  return updateRepository(project);
  }).
  then(function(project) {
  return createReview(project, 'origin/master', 'origin/master', process.env.USER);
  }).
  then(function(review) {
  console.pp(review);
  }).
  catch(function(error) {
  console.log(error);
  });
*/
