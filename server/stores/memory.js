'use strict';

function MemoryStore(pulley, expectations, register, provide) {
  const self = this;

  provide('engine', 'memory');

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

    for (const id of table.reference) {
      if (contains(table.reference[id], find)) {
        return callback(null, table.reference[id]);
      }
    }

    callback(null, null);
  };

  self.query = function(table, query, callback) {
    callback = wrap(callback);
    const results = [];

    for (const id of table.reference) {
      if (contains(table.reference[id], query)) {
        results.push(table.reference[id]);
      }
    }

    callback(null, results);
  };

  self.remove = function(table, item, callback) {
    callback = wrap(callback);

    if (item._id) {
      delete table.reference[item._id];
      return callback(null, true);
    } else {
      for (const id of table.reference) {
        if (contains(table.reference[id], item)) {
          delete table.reference[id];
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

      register({
        name: table,
        reference: tables[table],
        add: self.add,
        find: self.find,
        query: self.query,
        remove: self.remove,
        update: self.update
      });
    }

    callback(null);
  };

  return this;
}

module.exports = MemoryStore;
