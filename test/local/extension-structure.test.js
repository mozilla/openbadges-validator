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
  t.test('MyExtension: valid', function (t) {
    const extension = extensions['MyExtension']();
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
      t.ok(data.validate_extensions['myExtension'], 'Extension validated');
      t.notOk(err, 'no error messages');
      t.end();
    });
  });

  t.test('MyExtension: optional value may be omitted', function (t) {
    var extension = extensions['MyExtension']();
    delete extension.myOptionalString;
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
      t.ok(data.validate_extensions['myExtension'], 'Extension validated');
      t.notOk(err, 'no error messages');
      t.end();
    });
  });

  t.test('MyExtension: optional value must have correct type', function (t) {
    const extension = extensions['MyExtension']({
      'myOptionalString': {}
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
      t.ok(data.validate_extensions['myExtension'], 'Extension validated');
      t.ok(err, 'Optional value must have correct type');
      t.end();
    });
  });
  t.test('MyExtension: required value may not be omitted', function (t) {
    var extension = extensions['MyExtension']();
    delete extension.myString;
    delete extension.myOptionalString;
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
      t.ok(data.validate_extensions['myExtension'], 'Extension validated');
      t.ok(err, 'MyExtension.myString is required by schema');
      t.end();
    });
  });

  t.test('MyExtension: @context not absolute URL', function (t) {
    const extension = extensions['MyExtension']({
      '@context': 'example.org'
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
      t.ok(err, 'Extension: @context should be an absolute URL');
      t.end();
    });
  });


  t.test('MyExtension: schema not absolute URL', function (t) {
    const extension = extensions['MyExtension']();
    const assertion = generators['1.1.0-assertion']({
      myExtension: extension
    });
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['MyExtension-context']({
      'obi:validation': [
        {
          'obi:validatesType': 'extensions:MyExtension',
          'obi:validationSchema': 'example.org/1.1/MyExtension/schema.json'
        }
      ]
    });
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
      t.ok(err, 'Extension: validation schema should be an absolute URL');
      t.end();
    });
  });

  t.test('MyExtension: type is not array', function (t) {
    const extension = extensions['MyExtension']({
      'type': 'Extension'
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
      t.ok(err, 'Extension: `type` should be an array');
      t.end();
    });
  });

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
});