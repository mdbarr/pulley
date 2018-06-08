'use strict';

function PullRequests(pulley) {
  const self = this;

  //////////

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

  self.updatePullRequest = function(req, res, next) {
    next();
  };

  //////////

  pulley.apiServer.get('/api/pulls/:id',
                       pulley.auth.requireUser,
                       //pulley.resource.read('project', 'id'),
                       self.getPullRequest);

  //////////

  return self;
}

module.exports = function(pulley) {
  return new PullRequests(pulley);
};
