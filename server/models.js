'use strict';

function Models(pulley) {
  const self = this;

  self.review = function({
    project, source, target, owner, hidden
  }) {
    const timestamp = Date.now();

    const model = {
      _id: pulley.store.generateId(),
      rId: project.reviews.length + 1,
      project: project._id,
      source,
      target,
      head: null,
      owner,
      created: timestamp,
      updated: timestamp,
      hidden,
      state: 'draft',
      reviewers: [],
      commits: {},
      versions: []
    };

    project.reviews.unshift(model);

    return model;
  };

  self.changeset = function(review) {
    const model = {
      _id: pulley.store.generateId(),
      review: review._id,
      version: review.versions.length + 1,
      sourceCommit: null,
      targetCommit: null,
      mergebase: null,
      mergeable: false,
      diff: null,
      commits: null
    };

    return model;
  };

  self.change = function(commit) {
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

  self.user = function({
    username, name, email, avatar, preferences, roles
  }) {
    const model = {
      _id: pulley.store.generateId(),
      created: pulley.util.timestamp(),
      username,
      name,
      email,
      avatar,
      preferences: preferences || {},
      roles: roles || []
    };

    return model;
  };

  return self;
}

module.exports = function(pulley) {
  return new Models(pulley);
};
