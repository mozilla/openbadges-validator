const jws = require('jws');
const test = require('tap').test;
const validator = require('../../');
const nock = require('nock');
const generators = require('../test-generators');
const keys = require('../test-keys');

const ORIGIN = 'https://example.org';
const httpScope = nock(ORIGIN);

test('validator.taskCheckResources, all errors', function (t) {
  const data = {
    parse: {scheme: '1.0.0-hosted'},
    assertion: generators['1.0.0-assertion'](),
    badge: generators['1.0.0-badge'](),
    issuer: generators['1.0.0-issuer']()
  };
  validator.taskCheckResources(function (err, results) {
    t.same(err.code, 'resources', 'code should be resources');
    t.same(err.extra['assertion.image'].code, 'unreachable');
    t.same(err.extra['assertion.verify.url'].code, 'unreachable');
    t.same(err.extra['badge.image'].code, 'unreachable');
    t.same(err.extra['issuer.image'].code, 'unreachable');
    t.same(err.extra['issuer.revocationList'].code, 'unreachable');
    t.end();
  }, data);
});

test('validator.taskCheckResources, all errors', function (t) {
  httpScope
    .get('/assertion').reply(200, '{"found":true}')
    .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
    .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
    .get('/issuer-image').reply(200, 'issuer-image')
    .get('/revocation-list').reply(200, '{"found":true}')
  const data = {
    parse: {scheme: '1.0.0-hosted'},
    assertion: generators['1.0.0-assertion'](),
    badge: generators['1.0.0-badge'](),
    issuer: generators['1.0.0-issuer']()
  };
  validator.taskCheckResources(function (err, results) {
    t.same(str(results['assertion.image']), 'assertion-image');
    t.same(results['assertion.verify.url'], {found:true});
    t.same(str(results['badge.image']), 'badge-image');
    t.same(str(results['issuer.image']), 'issuer-image');
    t.same(results['issuer.revocationList'], {found:true});
    t.end();
  }, data);
});

test('validator.taskCheckResources, old assertion', function (t) {
  httpScope
    .get('/').reply(200, 'root')
    .get('/image').reply(200, 'image', {'content-type': 'image/png'})
  const data = {
    parse: {scheme: '0.5.0-hosted'},
    assertion: generators['0.5.0']()
  };
  validator.taskCheckResources(function (err, results) {
    t.same(str(results['assertion.badge.image']), 'image');
    t.end();
  }, data);
});

test('validator.unpackJWS: bad JWS', function (t) {
  validator.unpackJWS('whatever lol', function (err, payload) {
    t.same(err.code, 'jws-decode');
    t.end();
  });
});

test('validator.unpackJWS: bad algorithm', function (t) {
  const signature = jws.sign({
    header: { alg: 'hs256' },
    payload: 'oh hey',
    secret: 'shhhh'
  });
  validator.unpackJWS(signature, function (err, payload) {
    t.same(err.code, 'jws-algorithm');
    t.end();
  });
});

test('validator.unpackJWS: bad payload', function (t) {
  const signature = jws.sign({
    header: { alg: 'rs256' },
    payload: 'oh hey',
    privateKey: keys.private
  });
  validator.unpackJWS(signature, function (err, payload) {
    t.same(err.code, 'jws-payload-parse');
    t.end();
  });
});

test('validator.unpackJWS: everything good', function (t) {
  const expect = {sup: 'lol', header: { alg: 'rs256' }};
  const signature = jws.sign({
    header: { alg: 'rs256' },
    payload: expect,
    privateKey: keys.private
  });
  validator.unpackJWS(signature, function (err, payload) {
    t.same(payload, expect);
    t.end();
  });
});

test('validator.checkRevoked', function (t) {
  const result = validator.checkRevoked({'yep': 'some message'}, {uid: 'yep'});
  t.same(result.code, 'verify-revoked');
  t.same(result.message, 'some message');
  t.end();
});

test('validator.checkRevoked', function (t) {
  const result = validator.checkRevoked({'other': ''}, {uid: 'yep'});
  t.notOk(result, 'no error');
  t.end();
});

function str(buf) {
  return buf.toString();
}