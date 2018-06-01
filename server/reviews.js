'use strict';

function Reviews(pulley) {
  const self = this;

  self.createReview = function(project, options, callback) {
    switch (project.type) {
      case 'git':
      default:
        return pulley.git.createReview(project, options, callback);
    }
  };

  self.updateReview = function(project, review, callback) {
    switch (project.type) {
      case 'git':
      default:
        return pulley.git.updateReview(project, review, callback);
    }
  };

  return self;
}

module.exports = function(pulley) {
  return new Reviews(pulley);
};
