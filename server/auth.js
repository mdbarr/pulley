'use strict';

function Auth(pulley) {
  const self = this;

  const cookieName = pulley.config.api.cookie || pulley.config.name;

  ////////////////////

  self.createSession = function(context, user) {
    user.metadata.lastLogin = Date.now();
    // Update?

    const session = pulley.models.session({
      user
    });

    pulley.cache.set(session._id, session, function(error) {
      if (error) {
        return context.error(500, 'cache error');
      }
      context.response.setCookie(cookieName, session._id);

      const response = Object.clone(session);
      response.user = user;
      context.send(200, response);
    });

    return session;
  };

  ////////////////////

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

    pulley.cache.get(req.session._id, function(error, session) {
      if (error) {
        return context.error(500, 'no such session');
      } else {
        pulley.store.users.find(session.user, function(error, user) {
          if (error) {
            return context.error(500, 'no such user');
          } else {
            const response = Object.clone(session);
            response.user = user;
            context.send(200, response);
          }
        });
      }
    });
  };

  ////////////////////

  self.authenticate = function(req, res, next) {
    const context = pulley.models.context(req, res, next);
    const sessionId = req.cookies[cookieName];

    if (!sessionId) {
      return context.error(401, 'no such session');
    }

    pulley.cache.get(sessionId, function(error, session) {
      if (error || !session) {
        return context.error(401, 'no such session');
      } else {
        pulley.store.users.find(session.user, function(error, user) {
          if (error || !user) {
            return context.error(401, 'no such user');
          } else {

            context.request.session = Object.clone(session);
            context.request.session.user = Object.clone(user);

            next();
          }
        });
      }
    });
  };

  self.role = function(role) {
    return function(req, res, next) {
      const context = pulley.models.context(req, res, next);

      if (!req.session.user.roles.includes(role)) {
        context.error(403, `forbidden - requires role ${ role }.`);
      } else {
        next();
      }
    };
  };

  ////////////////////

  pulley.apiServer.post('/api/session', self.login);
  pulley.apiServer.get('/api/session',
                       self.authenticate,
                       self.getSession);

  ////////////////////

  return self;
}

module.exports = function(pulley) {
  return new Auth(pulley);
};
