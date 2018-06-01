'use strict';

function Users(pulley) {
  const self = this;

  self.createUser = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    const user = pulley.models.user({});

    context.send(200, user);
  };

  return self;
}

module.exports = function(pulley) {
  return new Users(pulley);
};
