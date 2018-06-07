'use strict';

function Projects(pulley) {
  const self = this;

  //////////
  self.repository = function(project) {
    switch (project.type) {
      case 'git':
      default:
        return pulley.git.repository(project);
    }
  };

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

  self.formatProject = function(project, repository) {
    repository = repository || self.repository(project);

    const response = Object.assign({}, project, {
      state: repository.state,
      progress: repository.progress,
      head: repository.head,
      branches: repository.branches
    });

    return response;
  };

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
      metadata: req.body.metadata,
      branchPattern: req.body.branchPattern
    });

    pulley.store.projects.add(project, function(error) {
      if (error) {
        return context.error(500, 'project creation failed');
      }

      self.cloneRepository(project);

      const response = self.formatProject(project);

      context.send(response);
    });
  };

  self.getProjects = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    pulley.store.projects.query({
      organization: context.organization
    }, function(error, projects) {
      if (error) {
        return context.error(500, 'project query failed');
      }

      const response = {
        items: projects,
        count: projects.length
      };

      context.send(response);
    });
  };

  //////////

  pulley.apiServer.post('/api/projects',
                        pulley.auth.requireRole('admin'),
                        self.createProject);

  pulley.apiServer.get('/api/projects',
                       pulley.auth.requireUser,
                       self.getProjects);

  pulley.apiServer.get('/api/projects/:id',
                       pulley.auth.requireUser
                      );

  //////////

  return self;
}

module.exports = function(pulley) {
  return new Projects(pulley);
};
