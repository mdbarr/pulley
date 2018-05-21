'use strict';

const uuidv4 = require('uuid/v4');

const Project = require('../project');

function MemoryStore(pulley) {
  const self = this;

  self.engine = 'memory';

  self.projects = {};

  self.load = function() {};

  self.generateId = function() {
    return uuidv4();
  };

  self.createProject = function(options, callback) {
    return new Project(pulley, options).cloneRepository(function(err, project) {
      if (err) {
        return callback(err);
      }
      self.projects[project.name] = project;
      callback(err, project);
    });
  };

  //////////

  self.load = function(callback) {
    if (callback) {
      callback();
    }
  };

  return this;
}

module.exports = MemoryStore;
