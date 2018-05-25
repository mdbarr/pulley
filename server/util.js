'use strict';

const os = require('os');
const crypto = require('crypto');

const barrkeep = require('barrkeep');

function Util(pulley) {
  const self = this;

  self.clone = barrkeep.deepClone;
  self.merge = barrkeep.merge;

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

  return self;
}

module.exports = function(pulley) {
  return new Util(pulley);
};
