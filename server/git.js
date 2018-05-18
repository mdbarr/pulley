'use strict';

const fs = require('fs');
const async = require('async');
const rimraf = require('rimraf');
const uuidv4 = require('uuid/v4');
const nodegit = require('nodegit');
const barrkeep = require('barrkeep');

const testProject = {
  _id: uuidv4(),
  type: 'git',
  name: 'vcsi',
  origin: 'git@github.com:mdbarr/pulley-test.git',
  method: 'ssh',
  credentials: {
    type: 'key',
    publicKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa.pub').toString(),
    privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa').toString(),
    passphrase: ''
  },
  path: '/tmp/pulley-test',
  git: '/tmp/pulley-test/.git',
  webhook: {
    path: `/api/webhooks/${ uuidv4() }`,
    secret: uuidv4(),
    authenticate: false
  },
  rules: {},
  repository: null,
  progress: 1
};

function cloneRepository(project) {
  try {
    rimraf.sync(project.path);
  } catch (error) {
    console.log('cleanup error', error);
  }

  return nodegit.Clone(project.origin, project.path, {
    fetchOpts: {
      callbacks: {
        credentials: function(repo, user) {
          return nodegit.Cred.sshKeyMemoryNew(user,
                                              project.credentials.publicKey,
                                              project.credentials.privateKey,
                                              project.credentials.passphrase);
        },
        transferProgress: function(progress) {
          project.progress = progress.receivedObjects() / progress.totalObjects();
          //console.log('progress', progress.receivedObjects(), progress.totalObjects());
        }
      }
    }
  }).
    then(function(repository) {
      project.repository = repository;
      project.progress = 1;
      return project;
    });
}

function updateRepository(project) {
  return project.repository.fetch('origin', {
    callbacks: {
      credentials: function(repo, user) {
        return nodegit.Cred.sshKeyMemoryNew(user,
                                            project.credentials.publicKey,
                                            project.credentials.privateKey,
                                            project.credentials.passphrase);
      },
      transferProgress: function(progress) {
        project.progress = progress.receivedObjects() / progress.totalObjects();
        //console.log('progress', progress.receivedObjects(), progress.totalObjects());
      }
    }
  }).
    then(function() {
      project.progress = 1;
      return project;
    });
}

function createReview(project, sourceBranch, targetBranch, owner) {
  const review = {
    _id: uuidv4(),
    project: project._id,
    source: sourceBranch,
    target: targetBranch,
    owner: owner,
    timestamp: Date.now(),
    private: false,
    state: 'in-review',
    reviewers: [],
    versions: []
  };

  return generateChangeset(project.repository, sourceBranch, targetBranch).
    then(function(changeset) {
      review.versions.push(changeset);
      return review;
    });
}

function generateChangeset(repository, sourceBranch, targetBranch) {
  let sourceCommit;
  let targetCommit;
  let mergebase;
  const commits = [];

  const changeset = {
    _id: uuidv4(),
    sourceCommit: null,
    targetCommit: null,
    mergebase: null,
    commits: null
  };

  return repository.getBranchCommit(targetBranch).
    then(function(firstCommitOnMaster) {
      targetCommit = firstCommitOnMaster;
      changeset.targetCommit = targetCommit.id().toString();
      return repository.getBranchCommit(sourceBranch);
    }).
    then(function(firstCommitOnBranch) {
      sourceCommit = firstCommitOnBranch;
      changeset.sourceCommit = sourceCommit.id().toString();
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
      return new Promise(function(resolve) {

        async.map(commitList, function(commit, next) {
          const record = {
            _id: uuidv4(),
            commit: commit.sha(),
            author: commit.author().name() +
              ' <' + commit.author().email() + '>',
            date: commit.date(),
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
                            _id: uuidv4(),
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
                                          hunkRecord.lines.push(String.fromCharCode(line.origin()) +
                                                                line.content().trim());
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
                                content: binary ? blob.content() : blob.toString()
                              };
                            });
                        });
                    });
                  }
                  return entryChain;
                }).
                then(function() {
                  next(null, record);
                });
            });
        }, function(err, results) {
          changeset.commits = results;
          resolve(changeset);
        });
      });
    });
}

//////////

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
