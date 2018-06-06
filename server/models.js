'use strict';

const path = require('path');

function Models(pulley) {
  const self = this;

  ////////////////////
  // Context
  self.context = function(request, response, next) {
    const timestamp = pulley.util.timestamp();
    const model = {
      requestId: pulley.store.generateId(),
      timestamp,
      request,
      response,
      next
    };

    model.send = function(statusCode, object) {
      if (!pulley.config.silent) {
        console.pp(object);
      }

      if (typeof statusCode !== 'number') {
        object = statusCode;
        statusCode = 200;
      }

      response.send(statusCode, object);
      response.end();
      next();
    };

    model.error = function(statusCode, message) {
      if (!pulley.config.silent) {
        console.log('ERROR'.rgb('#bf2c30'), message);
      }

      response.send(statusCode, {
        code: statusCode,
        message
      });

      next(false);
    };

    return model;
  };

  ////////////////////
  // Session
  self.session = function({
    _id, user, ttl
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      user,
      ttl: ttl || pulley.config.cache.sessionTTL
    };

    return model;
  };

  ////////////////////
  // Organization
  self.organization = function({
    _id, created, name, description, logo
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      created: created || pulley.util.timestamp(),
      name,
      description,
      logo
    };

    return model;
  };

  ////////////////////
  // User <- Organization
  self.user = function({
    _id, created, organization, username, password, name, email,
    avatar, preferences, roles, token, metadata
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      created: created || pulley.util.timestamp(),
      organization,
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

  ////////////////////
  // Group <- Organization
  self.group = function({}) {
    const model = {};

    return model;
  };

  ////////////////////
  // Project <- Organization
  self.project = function({
    _id, name, created, organization, type, description,
    origin, isRemote, repoName, localPath, gitPath,
    credentials, rules, webhook,
    users, groups, options, metadata
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      name,
      created: created || Date.now(),
      organization,
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
    model.localPath = localPath || path.join(pulley.config.git.path, organization, self.repoName);
    model.gitPath = gitPath || path.join(self.path, '.git');

    model.webhook = webhook || {
      url: `/api/webhooks/${ pulley.store.generateId() }`,
      secret: pulley.store.generateId(),
      requireSecret: false
    };

    return model;
  };

  ////////////////////
  // Review (Pull Request)
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

  ////////////////////
  // Change Set <- Pull Request
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

  ////////////////////
  // Commit <- Change Set <- Pull Request
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
