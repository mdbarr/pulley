'use strict';

function MemoryCache(pulley) {
  const self = this;

  const cache = {};

  //////////

  self.set = function(key, value, ttl, callback) {
    callback = pulley.util.callback(callback);

    cache[key] = {
      created: pulley.util.timestamp(),
      ttl,
      value
    };

    callback(null, value);
  };

  self.get = function(key, callback) {
    callback = pulley.util.callback(callback);

    if (cache[key] && cache[key].value) {
      callback(null, cache[key].value);
    } else {
      callback(null, undefined);
    }
  };

  self.del = function(key, callback) {
    callback = pulley.util.callback(callback);

    if (cache[key]) {
      delete cache[key];
    }

    callback(null);
  };

  ///////////

  function reaper() {
    for (const key in cache) {
      const item = cache[key];
      if (Date.now() > (item.created + item.ttl)) {
        delete cache[key];
      }
    }
  }

  const timer = setInterval(reaper, pulley.config.cache.period || 300000);

  self.close = function(callback) {
    callback = pulley.util.callback(callback);

    clearInterval(timer);
    callback(null);
  };

  //////////

  return self;
}

module.exports = MemoryCache;
