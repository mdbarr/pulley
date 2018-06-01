'use strict';

const path = require('path');

function Models(pulley) {
  const self = this;

  self.context = function(request, response, next) {
    const timestamp = pulley.util.timestamp();
    const model = {
      requestId: pulley.store.generateId(),
      timestamp,
      next
    };

    model.send = function(statusCode, object) {
      if (!pulley.config.silent) {
        console.pp(object);
      }

      response.send(statusCode, object);
      response.end();
      next();
    };

    model.error = function(statusCode, message) {
      if (!pulley.config.silent) {
        console.log('ERROR', message);
      }

      response.send(statusCode, {
        code: statusCode,
        message
      });

      next(false);
    };

    return model;
  };

  self.user = function({
    _id, created, username, password, name, email,
    avatar, preferences, roles, token, metadata
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      created: created || pulley.util.timestamp(),
      username,
      password,
      name,
      email,
      avatar,
      preferences: preferences || {},
      roles: roles || [],
      token: token || pulley.store.generateId(),
      metadata: metadata || {}
    };

    return model;
  };

  self.project = function({
    _id, name, created, type, description,
    origin, isRemote, repoName, localPath, gitPath,
    credentials, rules, webhook,
    users, groups, options, metadata
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      name: name || 'Unnamed Project',
      created: created || Date.now(),
      type: type || 'git',
      description,
      origin,
      isRemote: isRemote || true,
      credentials: credentials || pulley.config[self.type].credentials,
      rules: rules || {},
      users: users || [],
      groups: groups || [],
      options: {
        requireFullApproval: options.requireFullApproval
      },
      metadata: metadata || {}
    };

    model.repoName = repoName || path.basename(self.origin, '.git');
    model.localPath = localPath || path.join(pulley.config.git.path, self.repoName);
    model.gitPath = gitPath || path.join(self.path, '.git');

    model.webhook = webhook || {
      url: `/api/webhooks/${ pulley.store.generateId() }`,
      secret: pulley.store.generateId(),
      requireSecret: false
    };

    return model;
  };

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

  return self;
}

module.exports = function(pulley) {
  return new Models(pulley);
};
