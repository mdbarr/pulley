'use strict';

function Roles() {
  const self = this;

  const roles = {
    'user.create': 'Able to create new users',
    'user.edit': 'Able to edit users',
    'user.delete': 'Able to delete users',
    'user.password.reset': 'Able to reset passwords',

    'user.email.validate': 'Able to mark a users email address as valid',
    'user.email.view': 'Able to view a users email',

    'user.self.reset.password': 'Able to reset own password',
    'user.self.edit': 'Able to edit own user',

    'group.create': 'Able to create a new group',

    'project.create': 'Able to create a new project',
    'project.edit': 'Able to edit projects'
  };

  global.ROLES = roles;

  self.isCapable = function(user, role) {
    return user && Array.isArray(user.roles) && user.roles.includes(role);
  };

  self.enableRole = function(user, role) {
    if (user) {
      user.roles.add(role);
    }
    return user;
  };

  self.disableRole = function(user, role) {
    if (user) {
      user.roles.del(role);
    }
    return false;
  };

  self.describeRoles = function(user) {
    return user && user.roles.map(role => roles[role]).sort();
  };

  return self;
}

module.exports = function(pulley) {
  return new Roles(pulley);
};
