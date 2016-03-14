const test = require('tap').test;
const nock = require('nock');
const sinon = require('sinon');
const _ = require('underscore');
const validator = require('..');
const generators = require('./test-generators');
const extensions = require('./test-generators-extensions');
const jws = require('jws');
const keys = require('./test-keys');
const util = require('util');

var UNREACHABLE = 'http://nope.example.org/'; // not sure how to do this with nock
var ORIGIN = 'https://example.org';
var httpScope = function() {
  nock.cleanAll();
  return nock(ORIGIN);
}

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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.ok(err, 'Extension: @context should be an absolute URL');
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.ok(err, 'Extension: `type` should be an array');
      //console.log(err);
      //console.log(data);
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.ok(err, 'Extension: `type` should be an array of strings');
      t.end();
    });
  });
  /*
  t.test('No errors: ExampleExtension', function (t) {
    const extension = extensions['ExampleExtension']();
    const assertion = generators['1.1.0-assertion']({
      myExtension: extension
    });
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['ExampleExtension-context']();
    const schema = extensions['ExampleExtension-schema']();
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.notOk(err, 'no error messages');
      console.log(err);
      t.end();
    });
  });
  t.test('No errors: Endorsement', function (t) {
    const extension = extensions['Endorsement']();
    const assertion = generators['1.1.0-assertion']({
      myExtension: extension
    });
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['Endorsement-context']();
    const schema = extensions['Endorsement-schema']();
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.notOk(err, 'no error messages');
      console.log(err);
      t.end();
    });
  });
  t.test('No errors: Location', function (t) {
    const extension = extensions['Location']();
    const assertion = generators['1.1.0-assertion']({
      myExtension: extension
    });
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['Location-context']();
    const schema = extensions['Location-schema']();
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.notOk(err, 'no error messages');
      console.log(err);
      t.end();
    });
  });
  t.test('No errors: Accessibility', function (t) {
    const extension = extensions['Accessibility']();
    const assertion = generators['1.1.0-assertion']({
      myExtension: extension
    });
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['Accessibility-context']();
    const schema = extensions['Accessibility-schema']();
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.notOk(err, 'no error messages');
      console.log(err);
      t.end();
    });
  });
  t.test('No errors: OriginalCreator', function (t) {
    const extension = extensions['OriginalCreator']();
    const assertion = generators['1.1.0-assertion']({
      myExtension: extension
    });
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['OriginalCreator-context']();
    const schema = extensions['OriginalCreator-schema']();
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
      .get('/revocation-list').reply(200, '{"found":true}')
    validator(assertion, function(err, data) {
      t.notOk(err, 'no error messages');
      console.log(err);
      t.end();
    });
  });
  */
});