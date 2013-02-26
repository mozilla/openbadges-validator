const fs = require('fs');
const jws = require('jws');
const test = require('tap').test;
const validator = require('..');
const nock = require('nock');
const generators = require('./test-generators');

var httpScope = nock('https://example.org');

test('validator: garbage input', function (t) {
  validator('lol this will not work', function (errs) {
    t.ok(errs, 'should have an error');
    t.same(errs[0].field, '*input*', 'should be an input error');
    t.same(errs[0].code, 'invalid', 'should be an `invalid` error');
    console.dir(errs);
    t.end();
  });
});

test('validator, signed: invalid JWS algorithm', function (t) {
  const assertion = generators['1.0.0-assertion']();
  const signature = jws.sign({
    header: { alg: 'HS256'},
    payload: assertion,
    secret: 'lol'
  });

  validator(signature, function (errs) {
    t.ok(errs, 'should have an error');
    t.same(errs[0].field, '*input*', 'should be an input error');
    t.same(errs[0].code, 'jws-algorithm', 'should be an `algorithm` error');
    t.end();
  });
});

test('validator, signed: invalid bad paylod', function (t) {
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: 'bad payload',
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });

  validator(signature, function (errs) {
    t.ok(errs, 'should have an error');
    t.same(errs[0].field, '*input*', 'should be an input error');
    t.same(errs[0].code, 'payload-parse', 'should be an `parse` error');
    t.end();
  });
});

test('validator, signed: bad structure', function (t) {
  const assertion = generators['1.0.0-assertion']({uid: null});
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });

  validator(signature, function (errs) {
    t.ok(errs, 'should be an error');
    t.same(errs[0].field, 'uid', 'should be a uid error');
    t.end();
  });
});

test('validator, signed: missing key', function (t) {
  const assertion = generators['1.0.0-assertion']();
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    t.ok(errs, 'should be an error');
    t.same(errs[0].field, '*input*', 'should be an input error');
    t.same(errs[0].code, 'verification-mismatch', 'should be verification mismatch error');
    t.end();
  });
});

test('validator, signed: missing key', function (t) {
  const assertion = generators['1.0.0-assertion']({
    'verify.type': 'signed',
    'verify.url': 'https://example.org/public-key'
  });
  httpScope
    .get('/public-key').reply(404)
    .get('/user-image').reply(200, '', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    t.ok(errs, 'should be an error');
    t.same(errs[0].field, 'verify.url', 'should be an verify.url error');
    t.same(errs[0].code, 'response', 'should be a response error');
    t.end();
  });
});

test('validator, signed: not actually a key at the other end', function (t) {
  const assertion = generators['1.0.0-assertion']({
    'verify.type': 'signed',
    'verify.url': 'https://example.org/public-key'
  });
  httpScope
    .get('/public-key').reply(200, 'some thing, not really a key')
    .get('/user-image').reply(200, '', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    t.ok(errs, 'should be an error');
    t.same(errs[0].field, '*input*', 'should be an input error');
    t.same(errs[0].code, 'key-mismatch', 'should be a key-mismatch error');
    t.end();
  });
});

test('validator, signed: wrong key at the other end', function (t) {
  const assertion = generators['1.0.0-assertion']({
    'verify.type': 'signed',
    'verify.url': 'https://example.org/public-key'
  });
  httpScope
    .get('/public-key').reply(200, fs.readFileSync(__dirname + '/rsa-wrong-public.pem'))
    .get('/user-image').reply(200, '', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    t.ok(errs, 'should be an error');
    t.same(errs[0].field, '*input*', 'should be an input error');
    t.same(errs[0].code, 'key-mismatch', 'should be a key-mismatch error');
    t.end();
  });
});

test('validator, signed: good signature, missing badge structure', function (t) {
  const assertion = generators['1.0.0-assertion']({
    'verify.type': 'signed',
    'verify.url': 'https://example.org/public-key'
  });
  httpScope
    .get('/badge').reply(404)
    .get('/public-key').reply(200, fs.readFileSync(__dirname + '/rsa-public.pem'))
    .get('/user-image').reply(200, '', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    t.ok(errs, 'should be an error');
    t.same(errs[0].field, 'badge', 'should be for `badge` field');
    t.same(errs[0].code, 'http-status', 'should be an http-status error');
    t.end();
  });
});

test('validator, signed: badge revoked', function (t) {
  const assertion = generators['1.0.0-assertion']({
    'verify.type': 'signed',
    'verify.url': 'https://example.org/public-key'
  });
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']();
  const revocationList = {};
  revocationList[assertion.uid] = 'Liiiiiiiiies';
  httpScope
    .get('/badge').reply(200, JSON.stringify(badge), {'content-type': 'application/json'})
    .get('/issuer').reply(200, JSON.stringify(issuer), {'content-type': 'application/json'})
    .get('/revocation-list').reply(200, JSON.stringify(revocationList), {'content-type': 'application/json'})
    .get('/public-key').reply(200, fs.readFileSync(__dirname + '/rsa-public.pem'))
    .get('/user-image').reply(200, '', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    t.ok(errs, 'should be an error');
    t.same(errs[0].field, '*input*', 'should be for `*input*`');
    t.same(errs[0].code, 'revoked', 'should be a `revoked` error');
    t.end();
  });
});

test('validator, signed: bad badge & issuer structure', function (t) {
  const assertion = generators['1.0.0-assertion']({
    'verify.type': 'signed',
    'verify.url': 'https://example.org/public-key'
  });
  const badge = generators['1.0.0-badge']({name: null});
  const issuer = generators['1.0.0-issuer']({name: null});
  httpScope
    .get('/badge').reply(200, JSON.stringify(badge), {'content-type': 'application/json'})
    .get('/issuer').reply(200, JSON.stringify(issuer), {'content-type': 'application/json'})
    .get('/revocation-list').reply(200, '{}', {'content-type': 'application/json'})
    .get('/public-key').reply(200, fs.readFileSync(__dirname + '/rsa-public.pem'))
    .get('/user-image').reply(200, '', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    const expect = ['badge:name', 'issuer:name'].sort();
    const result = errs.map(pluck('field')).sort();
    t.same(result, expect, 'should have two errors');
    t.end();
  });
});

test('validator, signed: everything good!', function (t) {
  const assertion = generators['1.0.0-assertion']({
    'verify.type': 'signed',
    'verify.url': 'https://example.org/public-key'
  });
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']();
  httpScope
    .get('/').reply(200, 'issuer-url')
    .get('/badge').reply(200, JSON.stringify(badge), {'content-type': 'application/json'})
    .get('/issuer').reply(200, JSON.stringify(issuer), {'content-type': 'application/json'})
    .get('/criteria').reply(200, 'criteria')
    .get('/revocation-list').reply(200, '{}', {'content-type': 'application/json'})
    .get('/public-key').reply(200, fs.readFileSync(__dirname + '/rsa-public.pem'))
    .get('/user-image').reply(200, 'user-image', {'content-type': 'image/png'})
    .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
    .get('/issuer-image').reply(200, 'issuer-image', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs, result) {
    //console.dir(result);
    t.notOk(errs, 'should not have any errors');
    t.end();
  });
});

function pluck(field) {
  return function (obj) {
    return obj[field];
  }
}