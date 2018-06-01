'use strict';

const async = require('async');
const rimraf = require('rimraf');
const mime = require('mime-types');
const nodegit = require('nodegit');

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

  const repositories = {};

  self.cloneRepository = function(project, callback) {
    try {
      rimraf.sync(project.path);
    } catch (error) {
      return callback(error);
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
        repositories[project.origin] = repository;

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
    const review = pulley.models.review({
      project: project,
      source: sourceBranch,
      target: targetBranch,
      owner: owner,
      hidden: false
    });

    return self.generateReviewChangeset(review, project.repository, sourceBranch, targetBranch).
      then(function(changeset) {
        review.head = changeset.sourceCommit;
        review.versions.unshift(changeset);

        return callback(null, review);
      }).
      catch(function(error) {
        return callback(error);
      });
  };

  self.updateReview = function(project, review, callback) {
    return project.repository.getBranchCommit(review.source).
      then(function(currentHead) {
        if (currentHead.sha() === review.head) {
          callback(null, review); // no-op
        } else {
          self.generateReviewChangeset(review, project.repository).
            then(function(changeset) {
              review.head = changeset.sourceCommit;
              review.versions.unshift(changeset);

              review.updated = Date.now();

              callback(null, review);
            });
        }
      }).
      catch(function(error) {
        callback(error);
      });
  };

  self.generateReviewChangeset = function(review, repository) {
    let sourceCommit;
    let targetCommit;
    let mergebase;
    let sourceTree;
    let targetTree;
    const commits = [];

    const changeset = pulley.models.changeset(review);

    return repository.getBranchCommit(review.target).
      then(function(firstCommitOnMaster) {
        targetCommit = firstCommitOnMaster;
        changeset.targetCommit = targetCommit.id().toString();
        return targetCommit.getTree();
      }).
      then(function(tree) {
        targetTree = tree;
        return repository.getBranchCommit(review.source);
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

        return nodegit.Merge.commits(repository, targetCommit, sourceCommit);
      }).
      then(function(mergeIndex) {
        review.mergeable = changeset.mergeable = !mergeIndex.hasConflicts();
        return mergeIndex.clear();
      }).
      then(function() {
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
            if (review.commits[commit.sha()]) {
              return next(null, commit.sha());
            }

            const change = pulley.models.change(commit);

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
                            const patchChange = {
                              _id: pulley.store.generateId(),
                              previous: patch.oldFile().path(),
                              filename: patch.newFile().path(),
                              chunks: []
                            };
                            change.files.add(patchChange.filename);
                            change.patches.push(patchChange);
                            patchChain = patchChain.
                              then(function() {
                                return patch.hunks().
                                  then(function(hunks) {
                                    let hunkChain = Promise.resolve();
                                    for (const hunk of hunks) {
                                      const hunkChange = {
                                        header: hunk.header().trim(),
                                        lines: []
                                      };
                                      patchChange.chunks.push(hunkChange);
                                      hunkChain = hunkChain.then(function() {
                                        return hunk.lines().then(function(lines) {
                                          lines.forEach(function(line) {
                                            hunkChange.lines.push(
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
                    change.fingerprint = pulley.util.computeHash(change.patches);
                    change.files = Array.from(change.files);
                    change.blobs = {};

                    let entryChain = Promise.resolve();
                    for (const file of change.files) {
                      entryChain = entryChain.then(function() {
                        return sourceCommit.getEntry(file).
                          then(function(entry) {
                            return entry.getBlob().
                              then(function(blob) {
                                const binary = !!blob.isBinary();
                                change.blobs[file] = {
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
                    review.commits[change.commit] = change;
                    next(null, change.commit);
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

  self.isMergeable = function(review, repository, callback) {
    let targetCommit;
    let sourceCommit;

    const changeset = review.versions[0];
    if (!changeset) {
      return callback(new Error('no versions in review'));
    }

    return repository.getBranchCommit(review.target).
      then(function(firstCommitOnMaster) {
        targetCommit = firstCommitOnMaster;
        changeset.targetCommit = targetCommit.id().toString();
        return repository.getBranchCommit(review.source);
      }).
      then(function(firstCommitOnBranch) {
        sourceCommit = firstCommitOnBranch;
        return nodegit.Merge.commits(repository, targetCommit, sourceCommit);
      }).
      then(function(mergeIndex) {
        review.mergeable = changeset.mergeable = !mergeIndex.hasConflicts();
        return mergeIndex.clear();
      }).
      then(function() {
        callback(null, review.mergeable);
      }).
      catch(function(error) {
        callback(error);
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
