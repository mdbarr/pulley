'use strict';

function Events(pulley) {
  const self = this;

  const events = [];

  self.event = function(type, data) {
    const event = {
      id: pulley.store.generateId(),
      type,
      timestamp: Date.now(),
      data
    };
    events.push(event);
  };

  return self;
}

module.exports = function(pulley) {
  return new Events(pulley);
};
