'use strict';

const Pulley = require('../server/pulley');

describe('Basic Spec', function() {
  let pulley;
  let project;
  let review;

  after(function() {
    if (pulley) {
      pulley.shutdown();
    }
  });

  it('should create and verify a new instance of Pulley', function() {
    pulley = new Pulley({
      silent: true,
      email: {
        incoming: {
          port: 2525
        }
      }
    });

    pulley.should.have.property('config');

    pulley.should.have.property('store');
    pulley.store.should.be.instanceOf(Object);
    pulley.store.should.have.property('engine');
    pulley.store.engine.should.equal('memory');
  });

  it('should boot pulley', function(done) {
    pulley.boot(done);
  });

  it('should create a test project', function(done) {
    this.timeout(60000);

    const testProject = {
      name: 'pulley-test',
      origin: 'git@github.com:mdbarr/pulley-test.git'
    };

    pulley.store.createProject(testProject, function(error, proj) {
      if (error) {
        return done(error);
      } else {
        project = proj;
        done();
      }
    });
  });

  it('should verify the project repository clone', function() {
    project.should.have.property('progress', 100);

    project.should.have.property('branches');
    project.branches.should.be.instanceOf(Array);
    project.branches.should.not.have.length(0);
  });

  it('should create a new review', function(done) {
    project.createReview('pulley', 'origin/one-ahead', 'origin/master', function(error, rev) {
      if (error) {
        done(error);
      } else {
        review = rev;
        review.should.be.ok();

        done();
      }
    });
  });

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
});
