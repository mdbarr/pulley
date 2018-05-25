'use strict';

function Users(pulley) {
  const self = this;

  self.create = function(options, callback) {
    const user = pulley.model.user(options);

    callback(null, user);
  };

  return self;
}

module.exports = function(pulley) {
  return new Users(pulley);
};
