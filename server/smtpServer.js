'use strict';

function SmtpServer() {
  const self = this;

  self.boot = function(callback) {
    if (callback) {
      callback();
    }
  };

  return self;
}

module.exports = function (pulley) {
  return new SmtpServer(pulley);
};
