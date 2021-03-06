'use strict';

describe('Basic Spec', function() {
  const client = new Client();

  let project;
  let pullRequest;

  it('should verify a running instance of Pulley', function() {
    pulley.should.have.property('config');

    pulley.should.have.property('store');
    pulley.store.should.be.instanceOf(Object);
    pulley.store.should.have.property('engine');
    pulley.store.engine.should.equal('memory');

    return validation.ok();
  });

  it('should create a client and verify the api server is running', function() {
    return client.get('/version').
      then(function(info) {
        info.should.have.property('version');
        info.version.should.equal(pulley.version);
      });
  });

  it('should login as the default admin', function() {
    return client.post('/session', {
      username: 'admin',
      password: pulley.config.localPassword
    }).
      then(function(session) {
        session.should.have.property('object', 'session');
        session.should.have.property('user');
        session.user.should.be.instanceOf(Object);
      });
  });

  it('should validation the current session', function() {
    return client.get('/session').
      then(function(session) {
        session.should.have.property('object', 'session');
        session.should.have.property('user');
        session.user.should.be.instanceOf(Object);
      });
  });

  it('should get the list of projects and find none', function() {
    return client.get('/projects').
      then(function(projects) {
        projects.items.should.be.instanceOf(Array);
        projects.items.should.have.length(0);
      });
  });

  it('should create a test project', function() {
    const testProject = {
      name: 'pulley-test',
      origin: 'git@github.com:mdbarr/pulley-test.git',
      branchPattern: '/.*/'
    };

    return client.post('/projects', testProject).
      then(function(createdProject) {
        project = createdProject;
        project.should.have.property('object', 'project');
      });
  });

  rit('should get the project details verify it is up to date', function() {
    return client.get(`/projects/${ project._id }`).
      then(function(details) {
        details.should.have.property('_id', project._id);
        details.should.have.property('object', 'project');

        details.should.have.property('state', 'up-to-date');
        details.should.have.property('progress', 100);

        details.should.have.property('branches');
        details.branches.should.be.instanceOf(Array);
        details.branches.should.not.have.length(0);
      });
  });

  it('should get the list of projects and find one', function() {
    return client.get('/projects').
      then(function(projects) {
        projects.items.should.be.instanceOf(Array);
        projects.items.should.have.length(1);
        projects.items[0]._id.should.equal(project._id);
      });
  });

  it('should force a repository update', function(done) {
    pulley.projects.updateRepository(project, done);
  });

  it('should get the project details verify it is up to date', function() {
    return client.get(`/projects/${ project._id }`).
      then(function(details) {
        details.should.have.property('_id', project._id);
        details.should.have.property('object', 'project');

        details.should.have.property('state', 'up-to-date');
        details.should.have.property('progress', 100);

        details.should.have.property('branches');
        details.branches.should.be.instanceOf(Array);
        details.branches.should.not.have.length(0);
      });
  });

  it('should create a pull request', function() {
    const pull = {
      title: 'One Ahead',
      description: 'The thing...',
      source: 'origin/one-ahead',
      target: 'origin/master'
    };

    return client.post(`/projects/${ project._id }/pull`, pull).
      then(function(pr) {
        pullRequest = pr;

        pullRequest.should.be.ok();
        pullRequest.should.have.property('object', 'pull-request');
        pullRequest.should.have.property('source', pull.source);
        pullRequest.should.have.property('target', pull.target);
      });
  });

  it('should get and verify the pull request', function() {
    return client.get(`/pulls/${ pullRequest._id }`).
      then(function(pr) {
        pr.should.be.ok();
        pr.should.have.property('_id', pullRequest._id);
      });
  });

  it('should update the pull request source branch', function() {
    return client.put(`/pulls/${ pullRequest._id }`, {
      source: 'origin/two-ahead'
    }).
      then(function(pr) {
        pr.should.have.property('_id', pullRequest._id);
        pr.should.have.property('source', 'origin/two-ahead');

        pullRequest = pr;
        //console.pp(pr);
      });
  });

  /*
  it('should update the review mimicking a new commit', function(done) {
    review.source = 'origin/two-ahead'; // hack to advance the HEAD

    project.updateReview(review, function(error, updated) {

      done(error, updated);
    });
  });

  it('should update the review mimicking a rebase', function(done) {
    review.source = 'origin/two-ahead-rebase'; // hack to advance the HEAD

    project.updateReview(review, function(error, updated) {

      done(error, updated);
    });
  });
  */
});
