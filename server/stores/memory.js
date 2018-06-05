'use strict';

function MemoryStore(pulley, expectations, registration) {
  const self = this;

  registration.provide('engine', 'memory');

  const tables = {};

  function wrap(callback) {
    return function(error, data) {
      setTimeout(function() {
        callback(error, data);
      }, 0);
    };
  }

  function contains(container, subset) {
    if (subset._id && container._id !== subset._id) {
      return false;
    }

    for (const item in subset) {
      if (!container[item] || container[item] !== subset[item]) {
        return false;
      }
    }

    return true;
  }

  self.index = function() {
    // define an index
  };

  self.add = function(table, item, callback) {
    callback = wrap(callback);
    item._id = item._id || pulley.store;
    // upsert check?
    table.reference[item._id] = item;
    callback(null, item);
  };

  self.find = function(table, find, callback) {
    callback = wrap(callback);

    for (const item in table.reference) {
      if (contains(table.reference[item], find)) {
        return callback(null, table.reference[item]);
      }
    }

    callback(null, null);
  };

  self.query = function(table, query, callback) {
    callback = wrap(callback);
    const results = [];

    for (const item in table.reference) {
      if (contains(table.reference[item], query)) {
        results.push(table.reference[item]);
      }
    }

    callback(null, results);
  };

  self.remove = function(table, record, callback) {
    callback = wrap(callback);

    if (record._id) {
      delete table.reference[record._id];
      return callback(null, true);
    } else {
      for (const item in table.reference) {
        if (contains(table.reference[item], record)) {
          delete table.reference[item];
          return callback(null, true);
        }
      }
    }

    callback(null, false);
  };

  self.update = function(table, find, update, callback) {
    callback = wrap(callback);

    self.find(table, find, function(err, item) {
      const updated = Object.assign(item, update);
      callback(null, updated);
    });
  };

  /*
    self.createProject = function(options, callback) {
    return new Project(pulley, options).cloneRepository(function(err, project) {
    if (err) {
    return callback(err);
    }
    self.projects[project.name] = project;
    callback(err, project);
    });
    };

    self.createUser = function(options, callback) {
    callback(null);
    };

    //////////

    */

  self.load = function(callback) {
    callback = wrap(callback);

    for (const table of expectations.tables) {
      tables[table] = tables[table] || {};

      registration.define({
        name: table,
        reference: tables[table]
      });
    }

    registration.implement('add', self.add);
    registration.implement('find', self.find);
    registration.implement('query', self.query);
    registration.implement('remove', self.remove);
    registration.implement('update', self.update);

    callback(null);
  };

  return this;
}

module.exports = MemoryStore;
