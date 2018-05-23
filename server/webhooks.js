'use strict';

function Webhooks() {
  const self = this;

  return self;
}

module.exports = function(pulley) {
  return new Webhooks(pulley);
};
