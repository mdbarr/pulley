'use strict';

const os = require('os');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');

const barrkeep = require('barrkeep');

function Util(pulley) {
  const self = this;

  self.noop = () => undefined;

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

  return self;
}

module.exports = function(pulley) {
  return new Util(pulley);
};
