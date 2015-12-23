const test = require('tap').test;
const nock = require('nock');
const sinon = require('sinon');
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

test('validateHosted', function (t) {

  // TODO: categorize in appropriate error group or create new
  t.test('1.0 assertion, hashed true, identity unhashed', function (t) {
    const assertion = generators['1.0.0-assertion']({
      'recipient.identity': 'someone@somewhere.org' 
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
    validator.validateHosted(assertion, function(err, data) {
      t.ok(err, 'should have error');
      // FIXME: err has no code or message
      //t.same(err.code, '<CODE HERE>');
      //t.ok(err.message, 'has message');
      t.end();
    });
  });

  t.test('input error', function (t) { 
    t.test('non-object argument', function (t) {
      validator.validateHosted('string', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    t.test('1.0 assertion without verify', function (t) {
      const assertion = generators['1.0.0-assertion']({
        verify: undefined
      });
      validator.validateHosted(assertion, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('structure error', function (t) {
    t.test('1.0 missing required element', function (t) {
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
      validator.validateHosted(assertion, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'structure');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    t.test('1.0 incorrect optional element', function (t) {
      const assertion = generators['1.0.0-assertion']({
        evidence: '/some/relative/url'
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
      validator.validateHosted(assertion, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'structure');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    t.test('0.5 missing required element', function (t) {
      const assertion = generators['0.5.0']({
        recipient: undefined
      });
      validator.validateHosted(assertion, function(err, data){
        t.ok(err, 'should have error');
        t.same(err.code, 'structure');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    t.test('0.5 incorrect optional element', function (t) {
      const assertion = generators['0.5.0']({
        evidence: 'not a url'
      });
      validator.validateHosted(assertion, function(err, data){
        t.ok(err, 'should have error');
        t.same(err.code, 'structure');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('resources error', function (t) {
    t.test('0.5 assertion with non-existant badge image', function(t) {
      httpScope()
        .get('/image').reply(404);
      const assertion = generators['0.5.0']();
      validator.validateHosted(assertion, function(err, data) {
        console.log(err);
        t.ok(err, 'should have error');
        t.same(err.code, 'resources');
        t.ok(err.message, 'has message');
        t.ok(err.extra['badge.image'], 'correct extra');
        var extra = err.extra['badge.image'];
        t.same(extra.code, 'http-status');
        t.end();
      });
    });
  });

  t.test('required error', function (t) {
    t.test('missing required url', function(t) {
      const assertion = generators['1.0.0-assertion']({
        'badge': undefined
      });
      validator.validateHosted(assertion, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'required');
        t.same(err.field, 'badge');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('unreachable error', function (t) {
    t.test('unreachable url', function(t) {
      const assertion = generators['1.0.0-assertion']({
        'badge': UNREACHABLE
      });
      validator.validateHosted(assertion, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'unreachable');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('parse error', function(t) {
    t.test('1.0 assertion, non-JSON linked object', function (t) {
      const assertion = generators['1.0.0-assertion']();
      const issuer = generators['1.0.0-issuer']();
      httpScope()
        .get('/').reply(200, 'root')
        .get('/assertion').reply(200, JSON.stringify(assertion))
        .get('/badge').reply(200, 'imma badge')
        .get('/issuer').reply(200, JSON.stringify(issuer))
        .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
        .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
        .get('/issuer-image').reply(200, 'issuer-image')
        .get('/evidence').reply(200, 'evidence')
        .get('/criteria').reply(200, 'criteria')
        .get('/revocation-list').reply(200, '{"found":true}')
      validator.validateHosted(assertion, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'parse');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('verify-type-mismatch error', function (t) {
    t.test('1.0 metadata argument with signed type', function(t) {
      const assertion = generators['1.0.0-assertion']({
        verify: { type: 'signed' }
      });
      validator.validateHosted(assertion, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'verify-type-mismatch');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('verify-hosted error', function (t) {
    t.test('hosted differs from local', function(t) {
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
      validator.validateHosted(_.extend(assertion, {uid: 'different'}), function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'verify-hosted');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });
});

test('validateHostedUrl', function (t) {

  t.test('input error', function (t) {
    t.test('non-url argument', function(t) {
      validator.validateHostedUrl('not a url', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('http-status error', function (t) {
    t.test('assertion url 404s', function(t) {
      httpScope()
        .get('/assertion').reply(404);
      validator.validateHostedUrl(ORIGIN + '/assertion', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'http-status');
        t.same(err.url, ORIGIN + '/assertion');
        t.same(err.received, 404);
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('unreachable error', function (t) {
    t.test('assertion url unreachable', function(t) {
      validator.validateHostedUrl(UNREACHABLE + '/assertion', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'unreachable');
        t.same(err.url, UNREACHABLE + '/assertion');
        t.ok(err.reason, 'has reason');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('delegates to validateHosted', function (t) {
    httpScope()
      .get('/assertion').reply(200, { 'hiphip': 'hooray' });
    sinon.stub(validator, 'validateHosted').callsArgWith(1, null, 'ok');
    validator.validateHostedUrl(ORIGIN + '/assertion', function(err, data) {
      t.ok(validator.validateHosted.calledOnce, 'validateHosted called');
      t.ok(validator.validateHosted.calledWith({ 'hiphip': 'hooray' }), 'called with assertion data');
      validator.validateHosted.restore();
      t.end();
    });
  });

});

test('validateSigned', function (t) {

  t.test('input error', function (t) {
    t.test('non-string argument', function(t) {
      validator.validateSigned({}, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    t.test('malformed signed badge', function(t) {
      validator.validateSigned('abcd', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    // TODO: include level of detail returned by unpackJWS/getAssertionGUID
    t.test('bad signature', function(t) {
      validator.validateSigned('nope', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    // TODO: include level of detail returned by unpackJWS/getAssertionGUID
    t.test('hs* algorithm', function(t) {
      const signature = jws.sign({
        header: { alg: 'HS256' },
        payload: {},
        privateKey: keys.private
      });
      validator.validateSigned(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    // TODO: include level of detail returned by unpackJWS/getAssertionGUID
    t.test('unparsable JSON payload', function(t) {
      const signature = jws.sign({
        header: { alg: 'rs256' },
        payload: 'hey there',
        privateKey: keys.private
      });
      validator.validateSigned(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('structure error', function (t) {
    t.test('poorly structured signed 1.0', function (t) {
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
      validator.validateSigned(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'structure');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('verify-signature error', function (t) {
    t.test('signature mismatch', function(t) {
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
      validator.validateSigned(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'verify-signature');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('verify-revoked error', function (t) {
    t.test('revoked assertion', function(t) {
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
      validator.validateSigned(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'verify-revoked');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

});

test('validate', function(t) {

  t.test('input error', function (t) {
    t.test('non-string, non-object argument', function(t) {
      validator(5, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
    t.test('invalid string argument', function(t) {
      validator('NOPE', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'input');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('delegation', function (t) {
    t.test('delegates to validateHosted', function (t) {
      sinon.stub(validator, 'validateHosted').callsArgWith(1, null, 'ok');
      validator({}, function(err, data) {
        t.ok(validator.validateHosted.called, 'calls validateHosted');
        validator.validateHosted.restore();
        t.end();
      });
    });
    t.test('delegates to validateHostedUrl', function (t) {
      sinon.stub(validator, 'validateHostedUrl').callsArgWith(1, null, 'ok');
      validator('http://whereever.com/assertion', function(err, data) {
        t.ok(validator.validateHostedUrl.called, 'calls validateHostedUrl');
        validator.validateHostedUrl.restore();
        t.end();
      });
    });
    t.test('delegates to validateSigned', function (t) {
      sinon.stub(validator, 'validateSigned').callsArgWith(1, null, 'ok');
      const signature = jws.sign({
        header: { alg: 'HS256' },
        payload: { recipient: 'yup' },
        privateKey: keys.private
      });
      validator(signature, function(err, data) {
        t.ok(validator.validateSigned.called, 'calls validateSigned');
        validator.validateSigned.restore();
        t.end();
      });
    });
  });

});

test('getAssertionGuid', function (t) {

  t.test('structure error', function (t) {
    t.test('invalid signed badged', function (t) {
      const assertion = generators['1.0.0-assertion']({
        badge: undefined
      });
      const signature = jws.sign({
        header: { alg: 'rs256' },
        payload: assertion,
        privateKey: keys.private
      });
      validator.getAssertionGUID(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'structure');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('jws-decode error', function (t) {
    t.test('bad signature', function(t) {
      validator.getAssertionGUID('nope', function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'jws-decode');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('jws-algorithm error', function (t) {
    t.test('hs* algorithm', function(t) {
      const signature = jws.sign({
        header: { alg: 'HS256' },
        payload: {},
        privateKey: keys.private
      });
      validator.getAssertionGUID(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'jws-algorithm');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

  t.test('jws-payload-parse error', function (t) {
    t.test('unparsable JSON payload', function(t) {
      const signature = jws.sign({
        header: { alg: 'rs256' },
        payload: 'hey there',
        privateKey: keys.private
      });
      validator.getAssertionGUID(signature, function(err, data) {
        t.ok(err, 'should have error');
        t.same(err.code, 'jws-payload-parse');
        t.ok(err.message, 'has message');
        t.end();
      });
    });
  });

});

// TODO: add the rest of the getUrl cases
// TODO: test signed with unavailable public key
// TODO: test makeOptionalValidator and makeRequiredValidator failures
