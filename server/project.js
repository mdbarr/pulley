'use strict';

const path = require('path');

function Project(pulley, {
  _id, name, created, type, origin, credentials, webhook, rules
} = {}) {
  const self = this;

  self._id = _id || pulley.store.generateId();
  self.name = name || 'Unnamed Project';

  self.created = created || Date.now();

  self.type = type || 'git';
  self.origin = origin;
  self.repoName = path.basename(self.origin, '.git');
  self.path = path.join(pulley.config.git.path, self.repoName);
  self.gitPath = path.join(self.path, '.git');

  self.credentials = credentials || pulley.config[self.type].credentials;

  self.webhook = webhook || {
    url: `/api/webhooks/${ pulley.store.generateId() }`,
    secret: pulley.store.generateId(),
    requireSecret: false
  };

  self.rules = rules || {};

  self.repository = null;
  self.progress = 0;

  self.reviews = [];

  //////////
  Object.defineProperty(self, '_pulley', {
    value: pulley,
    enumerable: false,
    writable: false
  });

  return self;
};

Project.prototype.serialize = function() {
  return {
    _id: this._id,
    name: this.name,
    created: this.created,
    type: this.type,
    origin: this.origin,
    repoName: this.repoName,
    path: this.path,
    gitPath: this.gitPath,
    credentials: this.credentials,
    webhook: this.webhook,
    rules: this.rules
  };
};

Project.prototype.cloneRepository = function(callback) {
  switch (this.type) {
    case 'git':
    default:
      return this._pulley.git.cloneRepository(this, callback);
  }
};

Project.prototype.openRepository = function(callback) {
  switch (this.type) {
    case 'git':
    default:
      return this._pulley.git.openRepository(this, callback);
  }
};

Project.prototype.updateRepository = function(callback) {
  switch (this.type) {
    case 'git':
    default:
      return this._pulley.git.updateRepository(this, callback);
  }
};

Project.prototype.createReview = function(owner, branch, target, callback) {
  switch (this.type) {
    case 'git':
    default:
      return this._pulley.git.createReview(this, owner, branch, target, callback);
  }
};

Project.prototype.updateReview = function(review, callback) {
  switch (this.type) {
    case 'git':
    default:
      return this._pulley.git.updateReview(this, review, callback);
  }
};

module.exports = Project;
