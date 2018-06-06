'use strict';

const request = require('request');
const Pulley = require('../server/pulley');

////////////////////////////////////////////////////////////

global.Client = function({
  endpoint = 'http://localhost:2929/api', token
} = {}) {
  const self = this;

  const session = {
    jar: new request.jar(),
    headers: {},
    token
  };

  if (session.token) {
    session.headers.Authorization = 'Bearer ' + token;
  };

  function genericRequest(method, options, body) {
    if (typeof options === 'string') {
      options = {
        url: options
      };
    }

    const object = {
      method,
      url: endpoint + options.url,
      json: true,
      headers: session.headers,
      jar: session.jar
    };

    if (body) {
      object.body = body;
    } else if (options.body) {
      object.body = options.body;
    }

    if (options.qs || options.query) {
      object.qs = options.qs || options.query;
    }

    return new Promise(function(resolve, reject) {
      request(object, function (error, response, body) {
        if (error || !response) {
          return reject(error);
        }
        if (!options.statusCode &&
            !(response.statusCode >= 200 && response.statusCode <= 299)) {
          return reject(new Error(`[${ response.statusCode }] ${ object.method } ${ options.url } failed: ${ JSON.stringify(body) }`));
        } else if (options.statusCode && response.statusCode !== options.statusCode) {
          return reject(new Error(`[${ response.statusCode }] ${ object.method } ${ options.url } expected ${ options.statusCode } response: ${ JSON.stringify(body) }`));
        }

        resolve(body);
      });
    });
  }

  self.del = function(options, body) {
    return genericRequest('DELETE', options, body);
  };

  self.get = function(options, body) {
    return genericRequest('GET', options, body);
  };

  self.head = function(options, body) {
    return genericRequest('HEAD', options, body);
  };

  self.post = function(options, body) {
    return genericRequest('POST', options, body);
  };

  self.put = function(options, body) {
    return genericRequest('PUT', options, body);
  };

  return self;
};

////////////////////////////////////////////////////////////

before(function() {
  global.pulley = new Pulley({
    silent: true,
    email: {
      incoming: {
        port: 2525
      }
    }
  });

  return new Promise(function(resolve, reject) {
    global.pulley.boot(function(error) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});

after(function() {
  if (pulley) {
    pulley.shutdown();
  }
  return validation.ok();
});
