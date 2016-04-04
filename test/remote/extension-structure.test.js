const test = require('tap').test;
const nock = require('nock');
const sinon = require('sinon');
const _ = require('underscore');
const validator = require('../../');
const generators = require('../test-generators');
const extensions = require('../test-generators-extensions');
const jws = require('jws');
const keys = require('../test-keys');
const util = require('util');

var httpScope = function () {
  nock.cleanAll();
  nock.enableNetConnect();
  return nock('https://example.org');
};

test('Extensions', function (t) {

  t.test('Location Extension: optional value may be omitted', function (t) {
    const extension = extensions['Location']();
    delete extension['schema:location'].name;
    const assertion = generators['1.1.0-assertion'](extension);
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/1.1/assertion').reply(200, JSON.stringify(assertion))
      .get('/1.1/badge').reply(200, JSON.stringify(badge))
      .get('/1.1/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}');
    validator(assertion, function (err, data) {
      t.ok(data.validate_extensions['schema:location'], 'Extension validated');
      t.notOk(err, 'no error messages');
      t.end();
    });
  });

  t.test('Location Extension: Optional value must be of correct type', function (t) {
    const extension = extensions['Location']();
    extension['schema:location'].name = {name: 'Stadium of Light, Sunderland'};
    const assertion = generators['1.1.0-assertion'](extension);
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/1.1/assertion').reply(200, JSON.stringify(assertion))
      .get('/1.1/badge').reply(200, JSON.stringify(badge))
      .get('/1.1/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}');
    validator(assertion, function (err, data) {
      t.ok(data.validate_extensions['schema:location'], 'Extension validated');
      t.ok(err, 'Has error message');
      t.same(err.message, 'invalid extension structure');
      t.end();
    });
  });

  t.test('Example Extension: required value may not be omitted', function (t) {
    const extension = extensions['ExampleExtension']();
    delete extension['extensions:ExampleExtension'].exampleProperty;
    const assertion = generators['1.1.0-assertion'](extension);
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/1.1/assertion').reply(200, JSON.stringify(assertion))
      .get('/1.1/badge').reply(200, JSON.stringify(badge))
      .get('/1.1/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}');
    validator(assertion, function (err, data) {
      t.ok(data.validate_extensions['extensions:ExampleExtension'], 'Extension validated');
      t.ok(err, 'Has error messages');
      t.same(err.message, 'invalid extension structure');
      t.end();
    });
  });

  t.test('Example Extension: @context not absolute URL', function (t) {
    const extension = extensions['ExampleExtension']();
    extension['extensions:ExampleExtension']['@context'] = 'openbadgespec.org/extensions/exampleExtension/context.json';
    const assertion = generators['1.1.0-assertion'](extension);
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/1.1/assertion').reply(200, JSON.stringify(assertion))
      .get('/1.1/badge').reply(200, JSON.stringify(badge))
      .get('/1.1/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}');
    validator(assertion, function (err, data) {
      t.ok(err, 'Has error messages');
      t.same(err.name, 'jsonld.InvalidUrl');
      t.end();
    });
  });
  /*
  // TODO ExampleExtension type is not array
  t.test('ExampleExtension: type is not array', function (t) {
    const extension = extensions['ExampleExtension']();
    extension['extensions:ExampleExtension']['type'] = 'extensions:ExampleExtension';
    const assertion = generators['1.1.0-assertion'](extension);
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/1.1/assertion').reply(200, JSON.stringify(assertion))
      .get('/1.1/badge').reply(200, JSON.stringify(badge))
      .get('/1.1/issuer').reply(200, JSON.stringify(issuer))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}');
    validator(assertion, function (err, data) {
      t.ok(err, 'Extension: `type` should be an array');
      console.log(err);
      t.end();
    });
  });
  /*
  // ExampleExtension: type is not array
  t.test('MyExtension: type array contains non-string', function (t) {
    const extension = extensions['MyExtension']({
      'type': ['Extension', 'extensions:MyExtension', {}]
    });
    const assertion = generators['1.1.0-assertion']({
      myExtension: extension
    });
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['MyExtension-context']();
    const schema = extensions['MyExtension-schema']();
    httpScope()
      .get('/').reply(200, 'root')
      .get('/1.1/assertion').reply(200, JSON.stringify(assertion))
      .get('/1.1/badge').reply(200, JSON.stringify(badge))
      .get('/1.1/issuer').reply(200, JSON.stringify(issuer))
      .get('/1.1/MyExtension/schema.json').reply(200, JSON.stringify(schema))
      .get('/1.1/MyExtension/context.json').reply(200, JSON.stringify(context))
      .get('/assertion-image').reply(200, 'assertion-image', {'content-type': 'image/png'})
      .get('/badge-image').reply(200, 'badge-image', {'content-type': 'image/png'})
      .get('/issuer-image').reply(200, 'issuer-image')
      .get('/evidence').reply(200, 'evidence')
      .get('/criteria').reply(200, 'criteria')
      .get('/revocation-list').reply(200, '{"found":true}');
    validator(assertion, function (err, data) {
      t.ok(err, 'Extension: `type` should be an array of strings');
      t.end();
    });
  });
   */
});