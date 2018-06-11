'use strict';

function PullRequests(pulley) {
  const self = this;

  ////////////////////

  self.generateChangeset = function(pullRequest, callback) {
    switch (pullRequest.vcs) {
      case 'git':
      default:
        return pulley.git.generateChangeset(pullRequest, callback);
    }
  };

  ////////////////////

  self.getPullRequest = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    pulley.store.pullRequests.find(req.params.id, function(error, pullRequest) {
      if (error) {
        return context.error(500, 'pull request lookup failed');
      }
      if (!pullRequest) {
        return context.error(404, 'pull request not found');
      }
      if (pullRequest.organization !== context.organization) {
        return context.error(403, 'forbidden');
      }

      context.send(pullRequest);
    });
  };

  self.createPullRequest = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    if (!req.body || !req.body.title || !req.body.description ||
        !req.body.source || !req.body.target) {
      return context.error(400, 'missing parameters');
    }

    pulley.store.projects.find(req.params.id, function(error, project) {
      if (error) {
        return context.error(500, 'project lookup failed');
      }
      if (!project) {
        return context.error(404, 'project not found');
      }

      const pullRequest = pulley.models.pullRequest({
        organization: context.organization,
        project: project._id,
        vcs: project.vcs,
        source: req.body.source,
        target: req.body.target,
        author: context.user,
        title: req.body.title,
        description: req.body.description,
        reviewers: req.body.reviewers,
        metadata: req.body.metadata
      });

      self.generateChangeset(pullRequest, function(error) {
        if (error) {
          return context.error(500, 'changeset generation failed');
        }

        pulley.store.pullRequests.add(pullRequest, function(error) {
          if (error) {
            return context.error(500, 'pull request creation failed');
          }

          context.send(pullRequest);
        });
      });
    });
  };

  self.updatePullRequest = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    pulley.store.pullRequests.find(req.params.id, function(error, pullRequest) {
      if (error) {
        return context.error(500, 'pull request lookup failed');
      }
      if (!pullRequest) {
        return context.error(404, 'pull request not found');
      }
      if (pullRequest.organization !== context.organization) {
        return context.error(403, 'forbidden');
      }

      const update = Object.merge(pullRequest, req.body, true);
      update.updated = pulley.util.timestamp();

      pulley.store.pullRequests.update({
        _id: pullRequest._id
      }, update, function(error) {
        if (error) {
          return context.error(500, 'pull request update failed');
        }

        context.send(update);
      });
    });
  };

  self.updatePullRequestChanges = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    pulley.store.pullRequests.find(req.params.id, function(error, pullRequest) {
      if (error) {
        return context.error(500, 'pull request lookup failed');
      }
      if (!pullRequest) {
        return context.error(404, 'pull request not found');
      }
      if (pullRequest.organization !== context.organization) {
        return context.error(403, 'forbidden');
      }

      self.generateChangeset(pullRequest, function(error) {
        if (error) {
          return context.error(500, 'changeset generation failed');
        }

        pullRequest.updated = pulley.util.timestamp();

        pulley.store.pullRequests.update({
          _id: pullRequest._id
        }, pullRequest, function(error) {
          if (error) {
            return context.error(500, 'pull request creation failed');
          }

          context.send(pullRequest);
        });
      });
    });
  };

  ////////////////////

  pulley.apiServer.get('/api/pulls/:id',
                       pulley.auth.requireUser,
                       pulley.resource.read('params.id', 'pullRequest'),
                       self.getPullRequest);

  pulley.apiServer.put('/api/pulls/:id',
                       pulley.auth.requireUser,
                       //pulley.resource.edit('project', 'id'),
                       self.updatePullRequest);

  pulley.apiServer.post('/api/pulls/:id/changes',
                        pulley.auth.requireUser,
                        //pulley.resource.edit('project', 'id'),
                        self.updatePullRequestChanges);

  ////////////////////

  return self;
}

module.exports = function(pulley) {
  return new PullRequests(pulley);
};
