'use strict';

const async = require('async');

function Resource(pulley) {
  const self = this;

  function preprocess(resources, args) {
    if (!Array.isArray(resources)) {
      resources = [
        Array.from(args)
      ];
    }

    if (resources.length && !Array.isArray(resources[0])) {
      resources = [ resources ];
    }

    return resources;
  }

  const checkAccess = {};

  checkAccess.pullRequests = function(access, object) {
    if (access === 'read' && object.type === 'pull-request') {
      return true;
    }
    return true;
  };

  function loadResources(resources, access) {
    return function(req, res, next) {
      const context = pulley.models.context(req, res, next);

      req.resource = req.resource || {};
      pulley.events.emit('resource.read', req.authorization);

      async.each(resources, function(resource, done) {
        const id = Object.resolve(req, resource[0]);
        const binding = resource[2] || resource[1];
        const type = (resource[1] === binding) ? binding + 's' : resource[1];

        console.log('id = %s, type = %s, binding = %s', id, type, binding);
        pulley.store[type].find({
          _id: id
        }, function(error, object) {
          if (error) {
            context.error(500, 'lookup failed');
            return done(true);
          }
          if (!object) {
            context.error(404, `${ id } not found`);
            return done(true);
          }

          req.resource[binding] = object;

          const permitted = checkAccess[type] ? checkAccess[type](access, object) : true;

          if (!permitted) {
            context.error(403, `forbidden access to ${ object._id }`);
            return done(true);
          }

          done();
        });
      }, function(error) {
        if (error) {
          next(false);
        } else {
          next();
        }
      });
    };
  }

  self.read = function(resources = []) {
    resources = preprocess(resources, arguments);
    return loadResources(resources, 'read');
  };

  self.write = function(resources = []) {
    resources = preprocess(resources, arguments);
    return loadResources(resources, 'write');
  };

  self.edit = function(resources = []) {
    resources = preprocess(resources, arguments);
    return loadResources(resources, 'edit');
  };

  self.del = function(resources = []) {
    resources = preprocess(resources, arguments);
    return loadResources(resources, 'delete');
  };

  return self;
}

module.exports = function(pulley) {
  return new Resource(pulley);
};
