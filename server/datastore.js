'use strict';

const MemoryStore = require('./stores/memory');

module.exports = function(pulley) {
  switch (pulley.config.datastore.engine) {
    case 'memory':
    default:
      return new MemoryStore(pulley);
  }
};
