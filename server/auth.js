'use strict';

function Auth(pulley) {
  const self = this;

  //////////

  self.sessions = {};

  self.createSession = function(user) {
    const session = pulley.models.session(user);

    self.sessions[session._id] = session;

    return session;
  };

  //////////

  self.requireUser = function(req, res, next) {
    req.authorization = {};

    next();
  };

  self.requireRole = function(role) {
    return function(req, res, next) {
      req.authorization = {
        role
      };

      next();
    };
  };

  //////////

  return self;
}

module.exports = function(pulley) {
  return new Auth(pulley);
};
