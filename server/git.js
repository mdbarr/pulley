'use strict';

const async = require('async');
const rimraf = require('rimraf');
const mime = require('mime-types');
const nodegit = require('nodegit');

////////////////////////////////////////

function branchFilter(pattern, master, refs) {
  return refs.filter(ref => ref.startsWith('refs/remotes/')).
    map(branch => branch.replace(/^refs\/remotes\//, '')).
    filter(branch => pattern.test(branch) || branch === master);
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

  //////////

  const repositories = {};

  self.repository = function(project) {
    return repositories[project._id];
  };

  //////////

  self.cloneRepository = function(project, callback) {
    callback = pulley.util.callback(callback);

    pulley.events.emit('repo.git.cloning', project);

    const model = pulley.models.repository(project);
    repositories[project._id] = model;

    try {
      rimraf.sync(project.localPath);
    } catch (error) {
      model.state = 'error';
      return callback(error);
    }

    return nodegit.Clone(project.origin, project.localPath, {
      fetchOpts: {
        callbacks: {
          credentials: function(repo, user) {
            return self.credentials(model, project, user);
          },
          transferProgress: function(progress) {
            model.progress = calculateProgress(progress);
          }
        }
      }
    }).
      then(function(repository) {
        model.repository = repository;
        return nodegit.Reference.list(repository);
      }).
      then(function(refs) {
        const branches = branchFilter(model.pattern, project.masterBranch, refs);
        model.branches = branches;

        model.state = 'up-to-date';
        model.progress = 100;

        pulley.events.emit('repo.git.cloned', project, model);
        callback(null, model);
      }).
      catch(function(error) {
        model.state = 'error';
        callback(error);
      });
  };

  self.updateRepository = function(project, callback) {
    callback = pulley.util.callback(callback);

    pulley.events.emit('repo.git.updating', project);

    const model = repositories[project._id];

    return model.repository.fetch('origin', {
      callbacks: {
        credentials: function(repo, user) {
          return self.credentials(model, project, user);
        },
        transferProgress: function(progress) {
          model.progress = calculateProgress(progress);
        }
      }
    }).
      then(function() {
        return model.repository.refreshIndex();
      }).
      then(function() {
        return nodegit.Reference.list(model.repository);
      }).
      then(function(refs) {
        const branches = branchFilter(model.pattern, project.masterBranch, refs);
        model.branches = branches;

        model.state = 'up-to-date';
        model.progress = 100;

        pulley.events.emit('repo.git.updated', project, model);
        callback(null, project);
      }).
      catch(function(error) {
        callback(error);
      });
  };

  self.openRepository = function(project, callback) {
    callback = pulley.util.callback(callback);

    pulley.events.emit('repo.git.opening', project);

    const model = pulley.models.repository(project);
    repositories[project._id] = model;

    model.state = 'opening';

    nodegit.Repository.open(project.gitPath).
      then(function(repo) {
        model.repository = repo;
        model.state = 'updating';

        self.updateRepository(project, callback);
      }).
      catch(function(error) {
        model.state = 'error';
        callback(error);
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

  self.generateBranchChangeset = function(pullRequest, callback) {
    let sourceCommit;
    let targetCommit;
    let mergebase;
    let sourceTree;
    let targetTree;
    const commits = [];

    pulley.events.emit('pull-request.changeset.generating', pullRequest);

    callback = pulley.util.callback(callback);

    const model = repositories[pullRequest.project];

    const changeset = pulley.models.changeset(pullRequest);

    return model.repository.getBranchCommit(pullRequest.target).
      then(function(firstCommitOnMaster) {
        targetCommit = firstCommitOnMaster;
        changeset.targetCommit = targetCommit.id().toString();
        return targetCommit.getTree();
      }).
      then(function(tree) {
        targetTree = tree;
        return model.repository.getBranchCommit(pullRequest.source);
      }).
      then(function(firstCommitOnBranch) {
        sourceCommit = firstCommitOnBranch;
        changeset.sourceCommit = sourceCommit.id().toString();
        return sourceCommit.getTree();
      }).
      then(function(tree) {
        sourceTree = tree;
        return nodegit.Diff.treeToTree(model.repository, targetTree, sourceTree);
      }).
      then(function(diff) {
        return diff.toBuf(nodegit.Diff.FORMAT.PATCH);
      }).
      then(function(buf) {
        changeset.diff = buf.toString();
        return nodegit.Merge.base(model.repository, targetCommit, sourceCommit);
      }).
      then(function(base) {
        mergebase = base;
        changeset.mergebase = mergebase.toString();

        return nodegit.Merge.commits(model.repository, targetCommit, sourceCommit);
      }).
      then(function(mergeIndex) {
        pullRequest.mergeable = changeset.mergeable = !mergeIndex.hasConflicts();
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
            if (pullRequest.commits[commit.sha()]) {
              return next(null, commit.sha());
            }

            const change = pulley.models.commit(commit);

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
                    }).
                    catch(function(error) {
                      next(error);
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
                                  content: binary ? blob.content().toString('base64') :
                                    blob.toString(),
                                  original: null,
                                  type: mime.lookup(file)
                                };

                                return targetCommit.getEntry(file);
                              }).
                              then(function(targetEntry) {
                                return targetEntry.getBlob();
                              }).
                              then(function(blob) {
                                const binary = !!blob.isBinary();
                                change.blobs[file].original = binary ?
                                  blob.content().toString('base64') :
                                  blob.toString();
                              });
                          });
                      });
                    }
                    return entryChain;
                  }).
                  then(function() {
                    pullRequest.commits[change.commit] = change;
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
      }).
      then(function(branchChanges) {
        pulley.events.emit('pull-request.changeset.generated', branchChanges);
        return callback(null, branchChanges);
      }).
      catch(function(error) {
        callback(error);
      });
  };

  self.isMergeable = function(pullRequest, callback) {
    let targetCommit;
    let sourceCommit;

    const model = repositories[pullRequest.project];

    const changeset = pullRequest.versions[0];
    if (!changeset) {
      return callback(new Error('no versions in review'));
    }

    return model.repository.getBranchCommit(pullRequest.target).
      then(function(firstCommitOnMaster) {
        targetCommit = firstCommitOnMaster;
        changeset.targetCommit = targetCommit.id().toString();
        return model.repository.getBranchCommit(pullRequest.source);
      }).
      then(function(firstCommitOnBranch) {
        sourceCommit = firstCommitOnBranch;
        return nodegit.Merge.commits(model.repository, targetCommit, sourceCommit);
      }).
      then(function(mergeIndex) {
        pullRequest.mergeable = changeset.mergeable = !mergeIndex.hasConflicts();
        return mergeIndex.clear();

      }).
      then(function() {
        callback(null, pullRequest.mergeable);
      }).
      catch(function(error) {
        callback(error);
      });
  };

  self.credentials = function(model, project, user) {
    switch (project.credentials.type) {
      case 'key':
        return nodegit.Cred.sshKeyMemoryNew(user,
                                            project.credentials.publicKey,
                                            project.credentials.privateKey,
                                            project.credentials.passphrase);
      case 'local-key':
      default:
        return nodegit.Cred.sshKeyNew(user,
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
