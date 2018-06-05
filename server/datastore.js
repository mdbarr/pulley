'use strict';

// pulley.store.table('test').find({}, function(err, result));

const async = require('async');

function DataStore(pulley) {
  const self = this;

  const expectations = {
    tables: [ 'configuration', 'organizations', 'projects', 'users', 'groups' ], // define
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

  function generateWrappers() {
    for (const name of expectations.tables) {
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
      self.table[name] = wrapper;
      self[name] = wrapper;
    }
  }

  //////////

  self.id = self.generateId = pulley.util.generateId;
  self.timestamp = pulley.util.timestamp;

  const _engine = parseEngine();

  //////////

  self.table = function(name) {
    if (store.wrappers[name]) {
      return store.wrappers[name];
    } else {
      return undefined;
    }
  };

  self.load = function(callback) {
    _engine.load(function(error) {
      if (error) {
        return callback(error);
      }

      generateWrappers();

      pulley.store.configuration.
        find({
          configured: true
        }, function(error, result) {
          if (error) {
            return callback(error);
          }

          if (result) {
            callback(null);
          } else {
            pulley.util.print('Initial bootstrapping of Pulley...');

            const organization = pulley.models.organization({
              name: 'Pulley',
              description: 'Default Organization'
            });

            const admin = pulley.models.user({
              username: 'admin',
              password: pulley.config.localPassword,
              organization: organization._id,
              name: 'Administrator',
              email: 'blackhole@pulley.blue'
            });

            async.parallel([
              (next) => pulley.store.organizations.add(organization, next),
              (next) => pulley.store.users.add(admin, next),
              (next) => pulley.store.configuration.add({
                configured: true
              }, next)
            ], function(error, results) {
              if (!error) {
                pulley.util.print('username: admin');
                pulley.util.print('password: %s', admin.password);
                pulley.util.print();
              }
              callback(error, results);
            });
          }
        });
    });
  };

  return self;
}

module.exports = function(pulley) {
  return new DataStore(pulley);
};
