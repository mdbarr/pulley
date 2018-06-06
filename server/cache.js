'use strict';

function Cache(pulley) {
  const self = this;

  let _engine;

  switch (pulley.config.cache.engine) {
    case 'memory':
    default:
      const MemoryCache = require('./caches/memory-cache');
      _engine = new MemoryCache(pulley);
  };

  self.set = function() {
    let key;
    let value;
    let ttl;
    let callback;

    if (arguments.length === 1) {
      value = arguments[0];
      key = value._id;
      ttl = pulley.config.cache.defaultTTL;
      callback = pulley.util.noop;
    } else if (arguments.length === 2) {
      value = arguments[0];
      callback = arguments[1];
      key = value._id;
      ttl = pulley.config.cache.defaultTTL;
    } else if (arguments.length === 3) {
      key = arguments[0];
      value = arguments[1];
      callback = arguments[2];
      ttl = pulley.config.cache.defauktTTL;
    } else if (arguments.length === 4) {
      key = arguments[0];
      value = arguments[1];
      ttl = arguments[2];
      callback = arguments[3];
    } else {
      return null;
    }

    ttl = ttl || value.ttl || pulley.config.cache.defaultTTL;

    _engine.set(key, value, ttl, callback);
  };

  self.get = function(key, callback) {
    _engine.get(key, function(error, value) {
      if (error) {
        pulley.events.emit('cache.error', key);
      } else if (value !== undefined) {
        pulley.events.emit('cache.hit', key);
      } else {
        pulley.events.emit('cache.miss', key);
      }

      callback(error, value);
    });
  };

  self.del = function(key, callback) {
    _engine.del(key, callback);
  };

  self.close = function(callback) {
    _engine.close(callback);
  };

  return self;
}

module.exports = function(pulley) {
  return new Cache(pulley);
};
