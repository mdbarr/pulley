'use strict';

function Roles() {
  const self = this;

  const roles = {
    'global.admin': 'Global administrator',

    'organization.create': 'Able to create an organization',

    'user.create': 'Able to create new users',
    'user.edit': 'Able to edit users',
    'user.delete': 'Able to delete users',
    'user.password.reset': 'Able to reset passwords',
    'user.list': 'Able to list all users',

    'user.email.validate': 'Able to mark a users email address as valid',
    'user.email.view': 'Able to view a users email',

    'user.self.reset.password': 'Able to reset own password',
    'user.self.edit': 'Able to edit own user',

    'group.create': 'Able to create a new group',

    'project.create': 'Able to create a new project',
    'project.edit': 'Able to edit projects',
    'project.list.users': 'Able to list users associated with the project',
    'project.list.groups': 'Able to list groupss associated with the project'
  };

  self.defaultRoles = [
    'user.self.edit',
    'pullRequest.create',
    'pullRequest.owner.edit',
    'pullRequest.owner.update'
  ];

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
