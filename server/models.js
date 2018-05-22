'use strict';

function Models(pulley) {
  const self = this;

  self.review = function({
    project, source, target, owner, hidden
  }) {
    const model = {
      _id: pulley.store.generateId(),
      project,
      source,
      target,
      owner,
      timestamp: Date.now(),
      hidden,
      state: 'draft',
      reviewers: [],
      commits: {
        list: [],
        versions: {},
        remaps: {}
      },
      versions: []
    };

    return model;
  };

  self.changeset = function() {
    const model = {
      _id: pulley.store.generateId(),
      sourceCommit: null,
      targetCommit: null,
      mergebase: null,
      diff: null,
      commits: null
    };

    return model;
  };

  self.record = function(commit) {
    const model = {
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

    return model;
  };

  return self;
}

module.exports = function(pulley) {
  return new Models(pulley);
};
