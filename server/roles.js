'use strict';

function Roles() {
  const self = this;

  const roles = {
    'global.admin': 'Global administrator',

    'organization.create': 'Able to create an organization',
    'organization.read': 'Able to read an organization',
    'organization.update': 'Able to update an organization',
    'organization.delete': 'Able to delete an organization',

    'organization.users.list': 'Able to list all users in an organization',
    'organization.groups.list': 'Able to list all groups in an organization',
    'organization.projects.list': 'Able to list all projects in an organization',

    'user.create': 'Able to create new users',
    'user.read': 'Able to read user details',
    'user.update': 'Able to edit users',
    'user.delete': 'Able to delete users',

    'user.update.password-reset': 'Able to reset passwords',

    'user.email.validate': 'Able to mark a users email address as valid',
    'user.email.view': 'Able to view a users email',

    'user.self.reset.password': 'Able to reset own password',
    'user.self.edit': 'Able to edit own user',

    'group.create': 'Able to create a new group',

    'project.create': 'Able to create a new project',
    'project.read': 'Able to read project details (users and groups)',
    'project.update': 'Able to edit projects',
    'project.delete': 'Able to delete a project',
    'project.users.list': 'Able to list users associated with the project',
    'project.groups.list': 'Able to list groupss associated with the project',
    'project.pull-requests.list': 'Able to list pull reqyests in a project'
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
