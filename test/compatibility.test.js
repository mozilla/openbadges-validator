const test = require('tap').test;
const validator = require('..');
const nock = require('nock');
const generators = require('./test-generators');
var ORIGIN = 'https://example.org';
var httpScope = nock(ORIGIN);

test('0.5 is 0.5 compliant', function (t) {
  httpScope
    .get('/').reply(200, 'root')
    .get('/image').reply(200, 'image', {'content-type': 'image/png'})
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
  const assertion = generators['0.5.0']();
  const originalCriteria = assertion.badge.criteria;
  validator.validateAgainst('0.5.0', assertion, function (err) {
    t.notOk(err, 'Minimum-compliant 0.5 assertion is compliant with 0.5');
    t.end();
  });
});

test('1.0 is not 0.5 compliant', function (t) {
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
    .get('/revocation-list').reply(200, '{"found":true}');
  validator.validateAgainst('0.5.0', assertion, function (err) {
    t.ok(err, 'Minimum-compliant 1.0 assertion is not compliant with 0.5');
    t.end();
  });
});

test('0.5 is not 1.0 compliant', function (t) {
  httpScope
    .get('/').reply(200, 'root')
    .get('/image').reply(200, 'image', {'content-type': 'image/png'})
    .get('/evidence').reply(200, 'evidence')
    .get('/criteria').reply(200, 'criteria')
  const assertion = generators['0.5.0']();
  //const originalCriteria = assertion.badge.criteria;
  validator.validateAgainst('1.0.0', assertion, function (err) {
    t.ok(err, 'Minimum-compliant 0.5 assertion is not compliant with 1.0');
    t.end();
  });
});

test('1.0 is 1.0 compliant', function (t) {
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
    .get('/revocation-list').reply(200, '{"found":true}');
  validator.validateAgainst('1.0.0', assertion, function (err) {
    t.notOk(err, 'Minimum-compliant 1.0 assertion is compliant with 1.0');
    t.end();
  });
});