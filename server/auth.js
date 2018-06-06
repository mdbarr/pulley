'use strict';

function Auth(pulley) {
  const self = this;

  const cookieName = pulley.config.api.cookie || pulley.config.name;

  //////////

  self.createSession = function(context, user) {

    user.metadata.lastLogin = Date.now();

    const session = pulley.models.session({
      user
    });

    pulley.cache.set(session._id, session, function(error) {
      if (error) {
        return context.error(500, 'cache error');
      }

      context.response.setCookie(cookieName, session._id);

      context.send(200, session);
    });

    return session;
  };

  //////////

  self.login = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    if (!req.body || !req.body.username || !req.body.password) {
      return context.error(401, 'Invalid login');
    }

    if (req.body.username.includes('@')) {
      pulley.store.users.find({
        email: req.body.username,
        password: req.body.password
      }, function(error, user) {
        if (error || !user) {
          return context.error(401, 'Invalid login');
        }
        self.createSession(context, user);
      });
    } else {
      pulley.store.users.find({
        username: req.body.username,
        password: req.body.password
      }, function(error, user) {
        if (error || !user) {
          return context.error(401, 'Invalid login');
        }
        self.createSession(context, user);
      });
    }
  };

  self.getSession = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    const session = {
      valid: true
    };

    context.send(session);
  };

  //////////

  self.requireUser = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    const sessionId = req.cookies[cookieName];
    if (!sessionId) {
      return context.error(401, 'no such session');
    }

    req.authorization = {
      session: sessionId
    };

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

  pulley.apiServer.post('/api/session', self.login);
  pulley.apiServer.get('/api/session', self.requireUser, self.getSession);

  //////////

  return self;
}

module.exports = function(pulley) {
  return new Auth(pulley);
};
