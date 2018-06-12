'use strict';

const os = require('os');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');

const barrkeep = require('barrkeep');

const regExpPattern = /^\/(.*?)\/([gim]*)$/;
const escapePattern = /[|\\{}()[\]^$+*?.]/g;

function Util(pulley) {
  const self = this;

  self.noop = () => undefined;

  self.camelize = barrkeep.camelize;
  self.clone = barrkeep.deepClone;
  self.merge = barrkeep.merge;

  self.generateId = function() {
    return uuidv4();
  };

  self.computeHash = function(input, hash = 'sha1') {
    if (typeof input !== 'string') {
      input = JSON.stringify(input);
    }
    return crypto.createHash(hash).update(input).digest('hex');
  };

  self.timestamp = function(date) {
    if (date) {
      return new Date(date).getTime();
    } else {
      return Date.now();
    }
  };

  self.generateLocalPassword = function() {
    let localPassword = `${os.type() }/${ os.arch() }/${ os.platform() }/${ os.release() }-${ os.cpus().map((item) => item.model) }:${ os.totalmem() }-${ os.hostname() }:${ os.homedir() }>${ JSON.stringify(os.userInfo()) }`.replace(/\s+/g, ' ').replace(/["']/g, '');
    localPassword = self.computeHash(localPassword, 'sha256');
    pulley.config.localPassword = pulley.config.localPassword || localPassword;
  };

  self.callback = function(callback) {
    if (callback) {
      return function(error, data) {
        setTimeout(function() {
          callback(error, data);
        }, 0);
      };
    } else {
      return self.noop;
    }
  };

  self.done = function(callback, error, data) {
    if (callback) {
      setTimeout(() => callback(error, data), 0);
    }
  };

  self.placeHolder = function(req, res, next) {
    if (!pulley.config.silent) {
      console.log('%s: %s %s', 'UNIMPLEMENTED ENDPOINT'.rgb('#005fd7'),
                  req.method, req.url);
    }
    res.send(200, {
      message: 'placeholder'
    });

    next();
  };

  self.print = function() {
    if (!pulley.config.silent) {
      console.log.apply(this, arguments);
    }
  };

  self.pp = self.pretty = function(object) {
    if (!pulley.config.silent) {
      console.pp(object, {
        lineNumbers: true
      });
    }
  };

  self.toRegularExpression = function(string) {
    if (!string) {
      return /.*/;
    }

    const parts = string.match(regExpPattern);
    if (parts) {
      return new RegExp(parts[1], parts[2]);
    }
    return new RegExp('^' + string.replace(escapePattern, '\\$&') + '$');
  };

  ////////////////////
  // Shims

  Object.defineProperty(Array.prototype, 'add', {
    value: function(item) {
      if (!this.includes(item)) {
        this.push(item).sort();
      }
      return this;
    },
    enumerable: false
  });

  Object.defineProperty(Array.prototype, 'has', {
    value: function(item) {
      return this.includes(item);
    },
    enumerable: false
  });

  return self;
}

module.exports = function(pulley) {
  return new Util(pulley);
};
