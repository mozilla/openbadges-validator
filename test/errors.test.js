const test = require('tap').test;
const nock = require('nock');
const _ = require('underscore');
const validator = require('..');
const generators = require('./test-generators');
const jws = require('jws');
const keys = require('./test-keys');
const util = require('util');

var UNREACHABLE = 'http://nope.example.org/'; // not sure how to do this with nock
var ORIGIN = 'https://example.org';
var httpScope = function() {
  nock.cleanAll();
  return nock(ORIGIN);
}

errorTest('input', {
  'validateHosted: non-object argument': function(cb) {
    validator.validateHosted('string', cb);
  },
  'validateHosted: 1.0 assertion without verify': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      verify: undefined
    });
    validator.validateHosted(assertion, cb);
  },
  'validateHostedUrl: non-url argument': function(cb) {
    validator.validateHostedUrl('not a url', cb);
  },
  'validateSigned: non-string argument': function(cb) {
    validator.validateSigned({}, cb);
  },
  'validateSigned: malformed signed badge': function(cb) {
    validator.validateSigned('abcd', cb);
  },
  'validate: non-string, non-object argument': function(cb) {
    validator(5, cb);
  },
  'validate: invalid string argument': function(cb) {
    validator('NOPE', cb);
  }
});

// TODO: add the rest of the getUrl cases
// TODO: test signed with unavailable public key
errorTest('http-status', {
  'validateHostedUrl: url 404s': function(cb) {
    httpScope()
      .get('/assertion').reply(404);
    validator.validateHostedUrl(ORIGIN + '/assertion', cb);
  },
});

// TODO: test makeOptionalValidator and makeRequiredValidator failures
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
  },
  'validateHosted: poorly structured 1.0': function (cb) {
    const assertion = generators['1.0.0-assertion']({
      uid: undefined
    });
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}')
    validator.validateHosted(assertion, cb);
  },
  'validateSigned: poorly structured 1.0': function (cb) {
    const assertion = generators['1.0.0-assertion']({
      uid: undefined
    });
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    const signature = jws.sign({
      header: { alg: 'rs256' },
      payload: assertion,
      privateKey: keys.private
    });
    httpScope()
      .get('/').reply(200, 'root')
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}')
    validator.validateSigned(signature, cb);
  },
'validateHosted: poorly structured 0.5': function (cb) {
    const assertion = generators['0.5.0']({
      recipient: undefined
    });
    validator.validateHosted(assertion, cb);
  },
});

errorTest('resources', {
  'getLinkedResources: 0.5 assertion with non-existant badge image': function(cb) {
    httpScope()
      .get('/image').reply(404);
    const assertion = generators['0.5.0']();
    validator.getLinkedResources(assertion, cb.with(function(err, data, t){
      t.ok(err.extra['badge.image'], 'correct extra');
    }));
  },
  'getLinkedResources: 1.0 assertion with non-existant badge image': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope()
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
      validator.getLinkedResources(structures, cb.with(function(err, data, t){
        t.ok(err.extra['badge.image'], 'correct extra');
      }));
    });
  },
  'getLinkedResources: 1.0 assertion with non-existant assertion image': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope()
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
      validator.getLinkedResources(structures, cb.with(function(err, data, t){
        t.ok(err.extra['assertion.image'], 'correct extra');
      }));
    });
  },
  'getLinkedResources: 1.0 assertion with non-existant assertion verify url': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope()
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
      validator.getLinkedResources(structures, cb.with(function(err, data, t){
        t.ok(err.extra['assertion.verify.url'], 'correct extra');
      }));
    });
  },
  'getLinkedResources: 1.0 assertion with non-existant issuer image': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope()
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
      validator.getLinkedResources(structures, cb.with(function(err, data, t){
        t.ok(err.extra['issuer.image'], 'correct extra');
      }));
    });
  },
  'getLinkedResources: 1.0 assertion with non-existant issuer revocation list': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope()
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
      validator.getLinkedResources(structures, cb.with(function(err, data, t){
        t.ok(err.extra['issuer.revocationList'], 'correct extra');
      }));
    });
  },
});

errorTest('required', {
  'getLinkedStructures: missing required url': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      'badge': undefined
    });
    validator.getLinkedStructures(assertion, cb);
  }
});

errorTest('unreachable', {
  'getLinkedStructures: unreachable url': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      'badge': UNREACHABLE
    });
    validator.getLinkedStructures(assertion, cb);
  },
  'validateHostedUrl: url unreachable': function(cb) {
    validator.validateHostedUrl(UNREACHABLE + '/assertion', cb);
  },
});

errorTest('jws-decode', {
  'unpackJWS: bad signature': function(cb) {
    validator.unpackJWS('nope', cb);
  }
});

errorTest('jws-algorithm', {
  'unpackJWS: hs* algorithm': function(cb) {
    const signature = jws.sign({
      header: { alg: 'HS256' },
      payload: {},
      privateKey: keys.private
    });
    validator.unpackJWS(signature, cb);
  }
});

errorTest('jws-payload-parse', {
  'unpackJWS: unparsable JSON payload': function(cb) {
    const signature = jws.sign({
      header: { alg: 'rs256' },
      payload: 'hey there',
      privateKey: keys.private
    });
    validator.unpackJWS(signature, cb);
  }
});

errorTest('verify-type-mismatch', {
  'validateHosted: 1.0 signed type': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      verify: { type: 'signed' }
    });
    validator.validateHosted(assertion, cb);
  }
});

errorTest('verify-hosted', {
  'validateHosted: hosted differs from local': function(cb) {
    const assertion = generators['1.0.0-assertion']();
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}')
    validator.validateHosted(_.extend(assertion, {uid: 'different'}), cb);
  }
});

errorTest('verify-signature', {
  'validateSigned: signature mismatch': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      verify: {
        type: 'signed',
        url: 'https://example.org/public-key'
      }
    });
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    const signature = jws.sign({
      header: { alg: 'rs256' },
      payload: assertion,
      privateKey: keys.private
    });
    httpScope()
      .get('/').reply(200, 'root')
      .get('/public-key').reply(200, keys.wrongPublic)
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found": true}')
    validator.validateSigned(signature, cb);
  }
});

errorTest('verify-revoked', {
  'validateSigned: revoked assertion': function(cb) {
    const assertion = generators['1.0.0-assertion']({
      uid: 'abc123',
      verify: {
        type: 'signed',
        url: 'https://example.org/public-key'
      }
    });
    const badge = generators['1.0.0-badge']();
    const issuer = generators['1.0.0-issuer']();
    const signature = jws.sign({
      header: { alg: 'rs256' },
      payload: assertion,
      privateKey: keys.private
    });
    httpScope()
      .get('/').reply(200, 'root')
      .get('/public-key').reply(200, keys.public)
      .get('/assertion').reply(200, JSON.stringify(assertion))
      .get('/badge').reply(200, JSON.stringify(badge))
      .get('/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"abc123": "my bad"}')
    validator.validateSigned(signature, cb);
  }
});


function errorTest(code, scenarios, extras) {
  extras = extras || function(){};
  _.pairs(scenarios).forEach(function(pair) {
    var name = pair[0];
    var scenario = pair[1];
    test(util.format('[%s] %s', code, name), function (t) {
      var callback = function(err, data) {
        // All error tests have to pass these assertions
        t.ok(err, 'should have error');
        if (err) {
          t.same(err.code, code, 'code is correct');
          t.ok(err.message, 'has a message');
          // Per-error and per-scenario checks can be defined as well
          extras(err, data, t);
          callback.extras(err, data, t);
        }
        t.end();
      };
      callback.extras = function(){};
      callback.with = function(extras) {
        callback.extras = extras;
        return callback;
      };
      scenario(callback);
    });
  });
}
