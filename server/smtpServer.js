'use strict';

const SMTPServer = require('smtp-server').SMTPServer;
const simpleParser = require('mailparser').simpleParser;

function SmtpServer(pulley) {
  const self = this;

  self.connect = function(session, callback) {
    callback(null);
  };

  self.auth = function(auth, session, callback) {
    callback(null);
  };

  self.mailFrom = function(address, session, callback) {
    callback(null);
  };

  self.rcptTo = function(address, session, callback) {
    if (!address.address.endsWith(pulley.config.email.incoming.domain)) {
      callback(new Error(`${ pulley.config.name } only accepts mail for ${ pulley.config.email.incoming.domain }`));
    } else {
      callback(null);
    }
  };

  self.message = function(session, message, callback) {
    callback(null);
  };

  self.data = function(stream, session, callback) {
    simpleParser(stream, function(err, message) {
      if (err) {
        callback(err);
      } else {
        self.message(session, message, callback);
      }
    });
  };

  ////////////////////

  pulley.smtpServer = new SMTPServer({
    authOptional: true,
    name: pulley.config.email.incoming.name || pulley.config.name,
    onAuth: self.auth,
    onConnect: self.connect,
    onData: self.data,
    onMailFrom: self.mailFrom,
    onRcptTo: self.rcptTo,
    size: pulley.config.email.incoming.size || 10485760 // 10 mb
  });

  self.boot = function(callback) {
    if (pulley.config.email.incoming.enabled) {
      pulley.smtpServer.listen(pulley.config.email.incoming.port, function() {
        if (!pulley.config.silent) {
          console.log(`Pulley SMTP Server running on ${ pulley.config.email.incoming.port }`);
        }
        if (callback) {
          callback(null);
        }
      });
    } else {
      if (callback) {
        callback(null);
      }
    }
  };

  return self;
}

module.exports = function (pulley) {
  return new SmtpServer(pulley);
};
