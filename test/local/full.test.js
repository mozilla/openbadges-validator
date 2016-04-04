const fs = require('fs');
const path = require('path');
const jws = require('jws');
const test = require('tap').test;
const validator = require('../../');
const nock = require('nock');
const generators = require('../test-generators');
const keys = require('../test-keys');
const dataUrl = require('dataurl')

var ORIGIN = 'https://example.org';
var httpScope = nock(ORIGIN);
var imageData = fs.readFileSync(path.join(__dirname, '../cc.large.png'));

// 1.0.0 (Signed) Success
//-----------------------

test('1.0.0 signed validation', function (t) {
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
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid), 'Well-formed GUID');
    t.same(data.raw.input, signature);
    t.same(str(data.resources['badge.image']), 'badge-image');
    t.end();
  });
});

// 1.0.0 (Signed) Failure
//-----------------------

test('1.0.0 signed validation fail: missing badge criteria', function (t) {
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
    t.ok(err.extra.badge['badge.criteria'], 'badge `criteria` error');
    t.end();
  });
});

// 1.0.0 (Hosted) Success
//-----------------------

test('1.0.0 hosted validation', function (t) {
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
    t.same(data.parse.version, '1.0.0');
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid), 'Well-formed GUID');
    t.end();
  });
});

test('1.0.0 hosted validation by url', function (t) {
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
    t.same(data.parse.version, '1.0.0');
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid), 'Well-formed GUID');
    t.end();
  });
});

test('1.0.0 hosted validation by url with dataURI image', function (t) {
  const assertion = generators['1.0.0-assertion']({
    image: dataUrl.convert({
      data: imageData,
      mimetype: 'image/png'
    })
  });
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']();
  httpScope
    .get('/').reply(200, 'root')
    .get('/assertion').reply(200, JSON.stringify(assertion))
    .get('/assertion').reply(200, JSON.stringify(assertion))
    .get('/badge').reply(200, JSON.stringify(badge))
    .get('/issuer').reply(200, JSON.stringify(issuer))
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

// 1.0.0 (Hosted) Failure
//-----------------------

test('1.0.0 hosted validation fail: passed object when should pass signature', function (t) {
  const assertion = generators['1.0.0-assertion']({'verify.type': 'signed'});
  validator(assertion, function (err, data) {
    t.same(err.code, 'verify-type-mismatch');
    t.end();
  });
});

test('1.0.0 hosted validation fail: hosted assertion different', function (t) {
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
    t.same(err.code, 'deep-equal');
    t.end();
  });
});

// 0.5.0 Success
//--------------

test('0.5.0 validation', function (t) {
  httpScope
    .get('/').reply(200, 'root')
    .get('/image').reply(200, 'image', {'content-type': 'image/png'})
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
  const assertion = generators['0.5.0']();
  const originalCriteria = assertion.badge.criteria;
  validator(assertion, function (err, data) {
    t.notOk(err, 'no errors');
    t.same(data.parse.version, '0.5.0');
    t.same(data.badge.criteria, originalCriteria);
    t.end();
  });
});

test('0.5.0 validation by url', function (t) {
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
    t.same(data.parse.version, '0.5.0');
    t.same(data.badge.criteria, originalCriteria);
    t.ok(/^[A-Za-z0-9]+$/.test(data.guid));
    t.end();
  });
});

// 0.5.0 Failure
//--------------

test('0.5.0 validation fail: invalid structure', function (t) {
  httpScope
    .get('/').reply(200, 'root')
    .get('/image').reply(200, 'image', {'content-type': 'image/png'})
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
  const assertion = generators['0.5.0']({'badge.criteria': null});
  validator(assertion, function (err, data) {
    t.same(err.code, 'structure');
    t.ok(err.extra.assertion['badge.criteria'], 'should be a criteria error');
    t.end();
  });
});

test('0.5.0 validation by url fail: invalid structure', function (t) {
  const assertion = generators['0.5.0']({'badge.criteria': null});
  httpScope
    .get('/assertion').reply(200, assertion)
  validator(ORIGIN + '/assertion', function (err, data) {
    t.same(err.code, 'structure');
    t.ok(err.extra.assertion['badge.criteria'], 'should be a criteria error');
    t.end();
  });
});

test('0.5.0 validation by url fail: assertion unreachable', function (t) {
  const assertion = generators['0.5.0']();
  httpScope
    .get('/assertion').reply(404);
  validator(ORIGIN + '/assertion', function (err, data) {
    t.same(err.code, 'http-status');
    t.same(err.field, 'assertion');
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
