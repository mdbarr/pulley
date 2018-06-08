'use strict';

const path = require('path');
const async = require('async');

////////////////////////////////////////////////

const defaults = {
  name: 'pulley',

  api: {
    port: 2929
  },

  email: {
    incoming: {
      enabled: true,
      domain: 'pulley.blue',
      port: 25 // iptables -I INPUT -p tcp -m tcp --dport 25 -j ACCEPT
    },
    outgoing: {
      enabled: true,
      replyAddress: 'no-reply@pulley.blue'
    }
  },

  plugins: {},

  datastore: {
    engine: 'memory',
    database: 'pulley',
    user: 'pulley',
    password: 'pulley'
  },

  cache: {
    engine: 'memory',
    sessionTTL: 86400000,
    defaultTTL: 300000
  },

  git: {
    path: '/tmp/pulley/',
    credentials: {
      type: 'local-key',
      publicKey: path.join(process.env.HOME, '.ssh/id_rsa.pub'),
      privateKey: path.join(process.env.HOME, '.ssh/id_rsa'),
      passphrase: ''
    }
  },

  options: {
    branchPattern: '/^r/(.*?)/(.*?)$/'
  },

  silent: false
};

////////////////////////////////////////////////

function Pulley(config = {}) {
  const self = this;

  ////////////////////

  self.util = require('./util')(self);

  self.version = require('../package.json').version;
  self.config = Object.merge(defaults, config);
  self.util.generateLocalPassword();

  ////////////////////

  self.events = require('./events')(self);

  self.cache = require('./cache')(self);
  self.store = require('./datastore')(self);

  self.api = require('./apiServer')(self);
  self.smtp = require('./smtpServer')(self);

  self.auth = require('./auth')(self);

  self.roles = require('./roles')(self);
  self.models = require('./models')(self);

  self.git = require('./git')(self);

  self.organizations = require('./organizations')(self);
  self.users = require('./users')(self);
  self.groups = require('./groups')(self);
  self.projects = require('./projects')(self);
  self.pullRequests = require('./pullRequests')(self);

  ////////////////////

  self.boot = function (callback) {
    async.parallel([ self.store.load, self.api.boot, self.smtp.boot ], function(error) {
      if (callback) {
        callback(error);
      }
    });
  };

  self.shutdown = function() {
    if (self.apiServer) {
      self.apiServer.close();
    }
    if (self.smtpServer) {
      self.smtpServer.close();
    }
    if (self.cache) {
      self.cache.close();
    }
  };

  ////////////////////

  return self;
}

//////////////////////////////////////////////////

module.exports = Pulley;
