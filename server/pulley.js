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
      port: 25
    },
    outgoing: {
      enabled: true,
      replyAddress: 'no-reply@pulley.blue'
    }
  },

  plugins: {},

  datastore: {
    engine: 'memory'
  },

  git: {
    path: '/tmp/',
    credentials: {
      type: 'local-key',
      publicKey: path.join(process.env.HOME, '.ssh/id_rsa.pub'),
      privateKey: path.join(process.env.HOME, '.ssh/id_rsa'),
      passphrase: ''
    }
  }
};

////////////////////////////////////////////////

function Pulley(config) {
  const self = this;

  ////////////////////

  self.version = require('../package.json').version;

  self.config = Object.assign(defaults, config);

  ////////////////////

  self.store = require('./datastore')(self);

  self.api = require('./apiServer')(self);
  self.smtp = require('./smtpServer')(self);

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
  };

  ////////////////////

  return self;
}

//////////////////////////////////////////////////

module.exports = Pulley;
