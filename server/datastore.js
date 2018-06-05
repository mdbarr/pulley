'use strict';

// pulley.store.table('test').find({}, function(err, result));

function DataStore(pulley) {
  const self = this;

  const expectations = {
    tables: [ 'pulley', 'organizations', 'projects', 'users', 'groups' ], // define
    methods: [ 'add', 'find', 'query', 'remove', 'update' ], // implement
    providers: [ 'engine', 'generateId', 'id', 'timestamp' ] // provide
  };

  const store = {
    tables: {},
    methods: {},
    wrappers: {}
  };

  //////////

  const registration = {
    define: function(options) {
      const table = {
        name: options.name,
        reference: options.reference || null,
        metadata: options.metadata || {}
      };
      store.tables[table.name] = table;
      return table;
    },

    implement: function(name, value) {
      if (expectations.methods.includes(name)) {
        store.methods[name] = value;
      }
    },

    provide: function(name, value) {
      if (expectations.providers.includes(name)) {
        self[name] = value;
        return true;
      } else {
        return false;
      }
    }
  };

  function parseEngine() {
    switch (pulley.config.datastore.engine) {
      case 'memory':
      default:
        const MemoryStore = require('./stores/memory');
        return new MemoryStore(pulley, expectations, registration);
    }
  }

  const _engine = parseEngine();

  //////////

  self.id = self.generateId = pulley.util.generateId;
  self.timestamp = pulley.util.timestamp;

  self.table = function(name) {
    if (store.wrappers.name) {
      return store.wrappers.name;
    } else {
      if (expectations.tables.includes(name)) {
        const wrapper = {};
        for (const method in store.methods) {
          wrapper[method] = function() {
            const reference = store.tables[name] || name;
            const args = Array.prototype.slice.call(arguments);
            args.unshift(reference);
            return store.methods[method].apply(this, args);
          };
        }
        store.wrappers[name] = wrapper;
        return wrapper;
      } else {
        return undefined;
      }
    }
  };

  //////////

  self.load = function(callback) {
    _engine.load(function(error) {
      if (error) {
        return callback(error);
      }

      pulley.store.table('pulley').
        find({
          configured: true
        }, function(err, result) {
          if (err) {
            return callback(err);
          }

          if (result) {
            callback(null);
          } else {
            console.log('Initial bootstrapping of Pulley');

            // Organization create
            // User create
            // Project create

            callback(null);
          }
        });
    });
  };

  return self;
}

module.exports = function(pulley) {
  return new DataStore(pulley);
};
