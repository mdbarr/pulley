'use strict';

// pulley.store.table('test').find({}, function(err, result));

function DataStore(pulley) {
  const self = this;

  const expectations = {
    tables: [ 'users', 'groups', 'projects' ],
    methods: [ 'add', 'find', 'query', 'remove', 'update' ],
    providers: [ 'engine', 'generateId', 'id', 'timestamp' ]
  };

  const tables = {};
  let _default = null;

  function parseEngine() {
    switch (pulley.config.datastore.engine) {
      case 'memory':
      default:
        const MemoryStore = require('./stores/memory');
        return new MemoryStore(pulley, expectations, register, provide);
    }
  }

  function register(options) {
    const table = {
      name: options.name,
      reference: options.reference || null,
      metadata: options.metadata || {}
    };

    for (const method of expectations.methods) {
      table[method] = (object, callback) =>
        options[method](table, object, callback);
    }

    tables[table.name] = table;

    if (options._default || _default === null) {
      _default = table;
    }

    return table;
  }

  function provide(name, value) {
    if (expectations.providers.includes(name)) {
      self[name] = value;
      return true;
    } else {
      return false;
    }
  }

  const _engine = parseEngine();

  //////////

  self.id = self.generateId = pulley.util.generateId;
  self.timestamp = pulley.util.timestamp;

  self.table = function(name) {
    return tables[name] || _default;
  };

  //////////

  self.load = function(callback) {
    return _engine.load(callback);
  };

  return self;
}

module.exports = function(pulley) {
  return new DataStore(pulley);
};
