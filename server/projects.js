'use strict';

function Projects(pulley) {
  const self = this;

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

  return self;
}

module.exports = function(pulley) {
  return new Projects(pulley);
};
