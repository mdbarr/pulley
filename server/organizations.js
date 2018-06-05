'use strict';

function Organizations(pulley) {
  const self = this;

  self.createOrganization = function(req, res, next) {
    const context = pulley.models.context(req, res, next);

    const organization = pulley.models.organization({});

    context.send(200, organization);
  };

  return self;
}

module.exports = function(pulley) {
  return new Organizations(pulley);
};
