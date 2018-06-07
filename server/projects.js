'use strict';

function Projects(pulley) {
  const self = this;

  //////////

  self.createProject = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    if (!req.body || !req.body.name || !req.body.origin) {
      return context.error(400, 'missing parameters');
    }

    const project = pulley.models.project({
      name: req.body.name,
      organization: req.authorization.organization,
      description: req.body.description,
      origin: req.body.origin,
      credentials: req.body.credentials,
      rules: req.body.rules,
      scheme: req.body.scheme,
      users: req.body.users,
      groups: req.body.groups,
      options: req.body.options,
      metadata: req.body.metadata
    });

    self.cloneRepository(project, function(error, model) {
      if (error) {
        console.log(error);
        context.error(500, 'project clone failed');
      } else {
        console.pp(model);
        console.pp(project);
        context.send(project);
      }
    });
  };

  //////////

  self.cloneRepository = function(project, callback) {
    switch (project.type) {
      case 'git':
      default:
        return pulley.git.cloneRepository(project, callback);
    }
  };

  self.openRepository = function(project, callback) {
    switch (project.type) {
      case 'git':
      default:
        return pulley.git.openRepository(project, callback);
    }
  };

  self.updateRepository = function(project, callback) {
    switch (project.type) {
      case 'git':
      default:
        return pulley.git.updateRepository(project, callback);
    }
  };

  //////////

  pulley.apiServer.post('/api/projects',
                        pulley.auth.requireRole('admin'),
                        self.createProject);

  //////////

  return self;
}

module.exports = function(pulley) {
  return new Projects(pulley);
};
