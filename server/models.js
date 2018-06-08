'use strict';

const path = require('path');

function Models(pulley) {
  const self = this;

  ////////////////////
  // Context
  self.context = function(request, response, next) {
    const timestamp = pulley.util.timestamp();
    const model = {
      object: 'context',
      requestId: pulley.store.generateId(),
      timestamp,
      request,
      response,
      next,

      session: null,
      user: null,
      organization: null
    };

    if (request.authorization) {
      model.session = request.authorization.session;
      model.user = request.authorization.user;
      model.organization = request.authorization.organization;
    }

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

      if (typeof statusCode !== 'number') {
        message = statusCode;
        statusCode = 400;
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
      object: 'session',
      ttl: ttl || pulley.config.cache.sessionTTL,
      organization: user.organization,
      user: user._id
    };

    return model;
  };

  ////////////////////
  // Repository
  self.repository = function(project) {
    const model = {
      _id: pulley.store.generateId(),
      object: 'repository',
      project: project._id,
      organization: project.organization,
      state: 'initializing',
      progress: 0,
      pattern: pulley.util.toRegularExpression(project.branchPattern),
      branches: [],
      repository: null
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
      object: 'organization',
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
    verified, avatar, preferences, roles, token, metadata
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      object: 'user',
      created: created || pulley.util.timestamp(),
      organization,
      username,
      password,
      name,
      email,
      verified,
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
  self.group = function({
    _id, created, name, description, users
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      object: 'group',
      created: created || pulley.util.timestamp(),
      name,
      description,
      users: users || []
    };

    return model;
  };

  ////////////////////
  // Project <- Organization
  self.project = function({
    _id, name, created, organization, vcs, description,
    origin, isRemote, repoName, localPath, gitPath,
    credentials, rules, webhook, branchPattern, masterBranch,
    scheme, users, groups, options, metadata
  }) {
    const model = {
      _id: _id || pulley.store.generateId(),
      object: 'project',
      created: created || Date.now(),
      organization,
      vcs: vcs || 'git',
      name,
      description: description || '',
      origin,
      isRemote: isRemote || true,
      rules: rules || {},
      scheme: scheme || 'implicit',
      users: users || [],
      groups: groups || [],
      options: options || {
        requireFullApproval: true
      },
      metadata: metadata || {},
      branchPattern: branchPattern || pulley.config.options.branchPattern,
      masterBranch: masterBranch || 'origin/master'
    };

    model.credentials = credentials || pulley.config[model.vcs].credentials;

    model.repoName = repoName || path.basename(model.origin, '.git');
    model.localPath = localPath || path.join(pulley.config.git.path,
                                             model._id,
                                             model.repoName);
    model.gitPath = gitPath || path.join(model.localPath, '.git');

    model.webhook = webhook || {
      url: `/api/webhooks/${ model._id }`,
      secret: pulley.store.generateId(),
      requireSecret: false
    };

    return model;
  };

  ////////////////////
  // Pull Request
  self.pullRequest = function({
    _id, organization, project, source, target, head, author,
    title, description, created, updated, hidden, state,
    reviewers, commits, versions, metadata
  }) {
    const timestamp = Date.now();

    const model = {
      _id: _id || pulley.store.generateId(),
      object: 'pull-request',
      organization,
      project,
      source,
      target,
      head: head || null,
      author,
      title,
      description,
      created: created || timestamp,
      updated: updated || timestamp,
      hidden,
      state: state || 'draft',
      reviewers: reviewers || {
        users: [],
        groups: []
      },
      commits: commits || {},
      versions: versions || [],
      metadata: metadata || {}
    };

    return model;
  };

  ////////////////////
  // Change Set <- Pull Request
  self.changeset = function(pullRequest) {
    const model = {
      _id: pulley.store.generateId(),
      object: 'changeset',
      review: pullRequest._id,
      title: pullRequest.title,
      description: pullRequest.description,
      version: pullRequest.versions.length + 1,
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
  self.commit = function(commit) {
    const model = {
      _id: pulley.store.generateId(),
      object: 'commit',
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
