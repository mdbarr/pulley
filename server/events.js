'use strict';

const EventEmitter = require('events');
const inherits = require('util').inherits;

function Events(pulley) {
  const self = this;

  EventEmitter.call(this);

  self.pulley = pulley;

  return self;
}

inherits(Events, EventEmitter);

module.exports = function(pulley) {
  return new Events(pulley);
};
