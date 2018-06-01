'use strict';

const restify = require('restify');

function ApiServer(pulley) {
  const self = this;

  pulley.apiServer = restify.createServer({
    name: pulley.config.name + ' API Server',
    ignoreTrailingSlash: true,
    strictNext: true
  });

  ////////////////////

  pulley.apiServer.use(restify.pre.sanitizePath());
  pulley.apiServer.use(restify.plugins.dateParser());
  pulley.apiServer.use(restify.plugins.queryParser());
  pulley.apiServer.use(restify.plugins.bodyParser());
  pulley.apiServer.use(restify.plugins.authorizationParser());

  pulley.apiServer.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST, PUT');
    res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization');

    res.header(pulley.config.name + '-version', pulley.version);

    if (!pulley.config.silent) {
      //pulley.util.logger(req);
    }
    next();
  });

  ////////////////////

  pulley.apiServer.get('/api', pulley.util.placeHolder);

  ////////////////////

  self.boot = function(callback) {
    pulley.apiServer.listen(pulley.config.api.port, function() {
      if (!pulley.config.silent) {
        console.log(`Pulley API Server running on ${ pulley.config.api.port }`);
      }
      if (callback) {
        callback(null);
      }
    });
  };

  ////////////////////

  return self;
}

module.exports = function (pulley) {
  return new ApiServer(pulley);
};
