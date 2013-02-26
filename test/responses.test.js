const test = require('tap').test;
const validator = require('..');
const nock = require('nock');
const generators = require('./test-generators');

const ORIGIN = 'https://example.org';
const httpScope = nock(ORIGIN);

test('validator.getLinkedStructures: unreachable badge', function (t) {
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, results) {
    t.same(err.field, 'badge')
    t.same(err.code, 'unreachable')
    t.end();
  });
});

test('validator.getLinkedStructures: unparsable', function (t) {
  httpScope
    .get('/badge').reply(200, 'loooooooool')
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, results) {
    t.same(err.field, 'badge')
    t.same(err.code, 'parse')
    t.end();
  });
});

test('validator.getLinkedStructures: missing `issuer`', function (t) {
  httpScope
    .get('/badge').reply(200, '{"other":"stuff"}')
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, results) {
    t.same(err.field, 'issuer')
    t.same(err.code, 'missing')
    t.end();
  });
});

test('validator.getLinkedStructures: valid `issuer`', function (t) {
  httpScope
    .get('/badge').reply(200, '{"issuer":"https://example.org/issuer"}')
    .get('/issuer').reply(200, '{"stuff":"yep"}')
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, results) {
    t.notOk(err, 'no error');
    t.same(results.issuer.stuff, 'yep');
    t.end();
  });
});


function pluck(field) {
  return function (obj) {
    return obj[field];
  }
}