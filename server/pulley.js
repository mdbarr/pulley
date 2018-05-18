#!/usr/bin/env node

'use strict';

////////////////////////////////////////////////

const defaultConfig = {
  apiPort: 2929,
  smtpPort: 25
};

const defaultOptions = {
  name: 'pulley'
};

////////////////////////////////////////////////

function Pulley(config, options) {
  const self = this;

  ////////////////////

  self.version = require('../package.json').version;

  self.config = Object.assign(defaultConfig, config);
  self.options = Object.assign(defaultOptions, options);

  ////////////////////

  self.api = require('./apiServer')(self);
  self.smtp = require('./smtpServer')(self);

  ////////////////////

  self.boot = function () {
    self.api.boot();
  };

  ////////////////////

  return self;
}

//////////////////////////////////////////////////

const pulley = new Pulley();

pulley.boot();
