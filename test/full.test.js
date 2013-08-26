const jws = require('jws');
const test = require('tap').test;
const validator = require('..');
const nock = require('nock');
const generators = require('./test-generators');
const keys = require('./test-keys');

var ORIGIN = 'https://example.org';
var httpScope = nock(ORIGIN);

test('validate, signed', function (t) {
  const assertion = generators['1.0.0-assertion']({
    verify: {
      type: 'signed',
      url: 'https://example.org/public-key'
    }
  });
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']();
  httpScope
    .get('/').reply(200, 'root')
    .get('/public-key').reply(200, keys.public)
    .get('/badge').reply(200, JSON.stringify(badge))
    .get('/issuer').reply(200, JSON.stringify(issuer))
    .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
    .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
    .get('/issuer-image').reply(200, 'issuer-image')
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
    .get('/revocation-list').reply(200, '{"found":true}')
  const signature = jws.sign({
    header: { alg: 'rs256' },
    payload: assertion,
    privateKey: keys.private
  });
  validator(signature, function (err, data) {
    t.notOk(err, 'no errors');
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid));
    t.same(data.signature, signature);
    t.same(str(data.resources['badge.image']), 'badge-image');
    t.end();
  });
});

test('validate, signed: missing badge criteria', function (t) {
  const assertion = generators['1.0.0-assertion']({
    verify: {
      type: 'signed',
      url: 'https://example.org/public-key'
    }
  });
  const badge = generators['1.0.0-badge']({criteria: null});
  const issuer = generators['1.0.0-issuer']();
  httpScope
    .get('/').reply(200, 'root')
    .get('/public-key').reply(200, keys.public)
    .get('/badge').reply(200, JSON.stringify(badge))
    .get('/issuer').reply(200, JSON.stringify(issuer))
    .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
    .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
    .get('/issuer-image').reply(200, 'issuer-image')
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
    .get('/revocation-list').reply(200, '{"found":true}')
  const signature = jws.sign({
    header: { alg: 'rs256' },
    payload: assertion,
    privateKey: keys.private
  });
  validator(signature, function (err, data) {
    t.same(err.code, 'structure');
    t.ok(err.extra.badge.criteria, 'badge `criteria` error');
    t.end();
  });
});

test('validate, new hosted', function (t) {
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
    .get('/revocation-list').reply(200, '{"found":true}')
  validator(assertion, function (err, data) {
    t.notOk(err, 'should have no errors');
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid));
    t.end();
  });
});

test('validate, new hosted by url', function (t) {
  const assertion = generators['1.0.0-assertion']();
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']();
  httpScope
    .get('/').reply(200, 'root')
    .get('/assertion').reply(200, JSON.stringify(assertion))
    .get('/assertion').reply(200, JSON.stringify(assertion))
    .get('/badge').reply(200, JSON.stringify(badge))
    .get('/issuer').reply(200, JSON.stringify(issuer))
    .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
    .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
    .get('/issuer-image').reply(200, 'issuer-image')
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
    .get('/revocation-list').reply(200, '{"found":true}')
  validator(ORIGIN + '/assertion', function (err, data) {
    t.notOk(err, 'should have no errors');
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid));
    t.end();
  });
});

test('validate, new, passed object when should pass signature', function (t) {
  const assertion = generators['1.0.0-assertion']({'verify.type': 'signed'});
  validator(assertion, function (err, data) {
    t.same(err.code, 'verify-type-mismatch');
    t.end();
  });
});

test('validate, new hosted, invalid', function (t) {
  const assertion = generators['1.0.0-assertion']();
  const wrongAssertion = generators['1.0.0-assertion']({
    'evidence': 'https://example.org/some-other-thing'
  });
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']();
  httpScope
    .get('/').reply(200, 'root')
    .get('/assertion').reply(200, JSON.stringify(wrongAssertion))
    .get('/badge').reply(200, JSON.stringify(badge))
    .get('/issuer').reply(200, JSON.stringify(issuer))
    .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
    .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
    .get('/issuer-image').reply(200, 'issuer-image')
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
    .get('/revocation-list').reply(200, '{"found":true}')
  validator(assertion, function (err, data) {
    t.same(err.code, 'verify-hosted');
    t.end();
  });
});

test('validate, old style', function (t) {
  httpScope
    .get('/').reply(200, 'root')
    .get('/image').reply(200, 'image', {'content-type': 'image/png'})
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
  const assertion = generators['0.5.0']();
  const originalCriteria = assertion.badge.criteria;
  validator(assertion, function (err, data) {
    t.notOk(err, 'no errors');
    t.same(data.version, '0.5.0');
    t.same(data.structures.assertion.badge, data.structures.badge);
    t.same(data.structures.badge.criteria, originalCriteria);
    t.equal(data.guid, null);
    t.end();
  });
});

test('validate, old style by url', function (t) {
  const assertion = generators['0.5.0']();
  httpScope
    .get('/').reply(200, 'root')
    .get('/image').reply(200, 'image', {'content-type': 'image/png'})
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
    .get('/assertion').reply(200, assertion)
  const originalCriteria = assertion.badge.criteria;
  validator(ORIGIN + '/assertion', function (err, data) {
    t.notOk(err, 'no errors');
    t.same(data.version, '0.5.0');
    t.same(data.structures.assertion.badge, data.structures.badge);
    t.same(data.structures.badge.criteria, originalCriteria);
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid));
    t.end();
  });
});

test('validate, old style: invalid structure', function (t) {
  const assertion = generators['0.5.0']({'badge.criteria': null});
  validator(assertion, function (err, data) {
    t.same(err.code, 'structure');
    t.ok(err.extra['badge.criteria'], 'should be a criteria error');
    t.end();
  });
});

test('validate, old style by url: invalid structure', function (t) {
  const assertion = generators['0.5.0']({'badge.criteria': null});
  httpScope
    .get('/assertion').reply(200, assertion)
  validator(ORIGIN + '/assertion', function (err, data) {
    t.same(err.code, 'structure');
    t.ok(err.extra['badge.criteria'], 'should be a criteria error');
    t.end();
  });
});

test('validate by url: assertion unreachable', function (t) {
  const assertion = generators['0.5.0']();
  httpScope
    .get('/assertion').reply(404);
  validator(ORIGIN + '/assertion', function (err, data) {
    t.same(err.code, 'http-status');
    t.same(err.field, 'assertion');
    t.end();
  });
});

test('validateHosted: string arg', function(t) {
  const signature = jws.sign({
    header: { alg: 'rs256' },
    payload: { dummy: 'assertion' },
    privateKey: keys.private
  });
  validator.validateHosted(signature, function (err, data) {
    t.ok(err, 'should have error');
    t.same(err.code, 'input');
    t.end();
  });
});

test('validateHostedUrl: object arg', function(t) {
  const assertion = generators['1.0.0-assertion']();
  validator.validateHostedUrl(assertion, function (err, data) {
    t.ok(err, 'should have error');
    t.same(err.code, 'input');
    t.end();
  });
});

test('validateSigned: object arg', function(t) {
  const assertion = generators['1.0.0-assertion']();
  validator.validateSigned(assertion, function (err, data) {
    t.ok(err, 'should have error');
    t.same(err.code, 'input');
    t.end();
  });
});

function forEach(obj, fn) {
  Object.keys(obj).forEach(function (key) {
    return fn(key, obj[key]);
  });
}

function pluck(field) {
  return function (obj) {
    return obj[field];
  }
}

function str(a) {
  return a.toString();
}