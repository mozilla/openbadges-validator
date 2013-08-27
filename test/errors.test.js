const test = require('tap').test;
const nock = require('nock');
const _ = require('underscore');
const validator = require('..');
const generators = require('./test-generators');
const jws = require('jws');
const keys = require('./test-keys');

var ORIGIN = 'https://example.org';
var httpScope = nock(ORIGIN);

errorTest('input', {
  'validateHosted: on non-object argument': function(cb) {
    validator.validateHosted('string', cb);
  },
  'validateHosted: 1.0 assertion without verify': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      verify: undefined
    });
    validator.validateHosted(assertion, cb);
  },
});

errorTest('verify-type-mismatch', {
  'validateHosted: 1.0 signed type': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      verify: { type: 'signed' }
    });
    validator.validateHosted(assertion, cb);
  }
});

errorTest('structure', {
  'getAssertionGuid: invalid signed badged': function (cb) {
    const assertion = generators['1.0.0-assertion']({
      badge: undefined
    });
    const signature = jws.sign({
      header: { alg: 'rs256' },
      payload: assertion,
      privateKey: keys.private
    });
    validator.getAssertionGUID(signature, cb);
  }
});

errorTest('resources', {
  'getLinkedResources: 0.5 assertion with unreachable badge image': function(cb) {
    httpScope
      .get('/badge-image').reply(404);
    const assertion = generators['0.5.0']({
      'badge.image': '/badge-image'
    });
    validator.getLinkedResources(assertion, cb);
  },
  'getLinkedResources: 1.0 assertion with unreachable badge image': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope
      .get('/').reply(200, 'root')
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(404)
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}')
    validator.getLinkedStructures(assertion, function(err, structures) {
      validator.getLinkedResources(structures, cb);
    });
  },
  'getLinkedResources: 1.0 assertion with unreachable assertion image': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope
      .get('/').reply(200, 'root')
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(404)
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}')
    validator.getLinkedStructures(assertion, function(err, structures) {
      validator.getLinkedResources(structures, cb);
    });
  },
  'getLinkedResources: 1.0 assertion with unreachable assertion verify url': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope
      .get('/').reply(200, 'root')
      .get('/assertion').reply(404)
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}')
    validator.getLinkedStructures(assertion, function(err, structures) {
      validator.getLinkedResources(structures, cb);
    });
  },
  'getLinkedResources: 1.0 assertion with unreachable issuer image': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope
      .get('/').reply(200, 'root')
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(404)
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}')
    validator.getLinkedStructures(assertion, function(err, structures) {
      validator.getLinkedResources(structures, cb);
    });
  },
  'getLinkedResources: 1.0 assertion with unreachable issuer revocation list': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope
      .get('/').reply(200, 'root')
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(404)
    validator.getLinkedStructures(assertion, function(err, structures) {
      validator.getLinkedResources(structures, cb);
    });
  },
});


function errorTest(code, scenarios, extras) {
  extras = extras || function(){};
  test('Error code: ' + code, function (t) {
    _.pairs(scenarios).forEach(function(pair) {
      var name = pair[0];
      var scenario = pair[1];
      t.test(name, function (t) {
        // All tests have to pass the assertions in callback
        var callback = function(err, data) {
          t.ok(err, 'should have error');
          if (err) {
            t.same(err.code, code, 'code is correct');
            t.ok(err.message, 'has a message');
            // Per-error checks can be defined as well
            extras(err, data, t);
          }
          t.end();
        };
        scenario(callback);
      });
    });
  });
}
