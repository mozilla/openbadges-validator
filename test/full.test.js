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
    .get('/public-key').reply(200, 'some thing, not really a key')
    .get('/user-image').reply(200, '', {'content-type': 'image/png'})
    .get('/evidence').reply(200)
  const signature = jws.sign({
    header: { alg: 'RS256'},
    payload: assertion,
    privateKey: fs.readFileSync(__dirname + '/rsa-private.pem')
  });
  validator(signature, function (errs) {
    console.dir(errs);
    t.end();
  });
});
