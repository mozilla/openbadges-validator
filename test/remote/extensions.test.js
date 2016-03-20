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
  t.test('No errors: ExampleExtension', function (t) {
    const assertion = generators['1.1.0-assertion'](extensions['ExampleExtension']());
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
      t.notOk(err, 'no error messages');
      t.end();
    });
  });

  t.test('No errors: ApplyLink', function (t) {
    const assertion = generators['1.1.0-assertion'](extensions['ApplyLink']());
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
      t.ok(data.validate_extensions['extensions:ApplyLink'], 'Extension validated');
      t.notOk(err, 'no error messages');
      t.end();
    });
  });

  t.test('No errors: Endorsement', function (t) {
    const assertion = generators['1.1.0-assertion'](extensions['Endorsement']());
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
      t.ok(data.validate_extensions['extensions:Endorsement'], 'Extension validated');
      t.notOk(err, 'no error messages');
      t.end();
    });
  });

  t.test('No errors: Location', function (t) {
    const assertion = generators['1.1.0-assertion'](extensions['Location']());
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

  t.test('No errors: Accessibility', function (t) {
    const assertion = generators['1.1.0-assertion'](extensions['Accessibility']());
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['Accessibility-context']();
    const schema = extensions['Accessibility-schema']();
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
      t.ok(data.validate_extensions['extensions:Accessibility'], 'Extension validated');
      t.notOk(err, 'no error messages');
      t.end();
    });
  });

  t.test('No errors: OriginalCreator', function (t) {
    const assertion = generators['1.1.0-assertion'](extensions['OriginalCreator']());
    const badge = generators['1.1.0-badge']();
    const issuer = generators['1.1.0-issuer']();
    const context = extensions['OriginalCreator-context']();
    const schema = extensions['OriginalCreator-schema']();
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
      t.ok(data.validate_extensions['extensions:OriginalCreator'], 'Extension validated');
      t.notOk(err, 'No error messages');
      t.end();
    });
  });

  t.test('No errors: All extensions at once', function (t) {
    var replacements = {};
    replacements = extensions.replaceAll(replacements, extensions['ExampleExtension']());
    replacements = extensions.replaceAll(replacements, extensions['ApplyLink']());
    replacements = extensions.replaceAll(replacements, extensions['Endorsement']());
    replacements = extensions.replaceAll(replacements, extensions['Location']());
    replacements = extensions.replaceAll(replacements, extensions['Accessibility']());
    replacements = extensions.replaceAll(replacements, extensions['OriginalCreator']());
    const assertion = generators['1.1.0-assertion'](replacements);
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
      t.ok(data.validate_extensions['extensions:ExampleExtension'], 'Extension validated');
      t.ok(data.validate_extensions['extensions:ApplyLink'], 'Extension validated');
      t.ok(data.validate_extensions['extensions:Endorsement'], 'Extension validated');
      t.ok(data.validate_extensions['schema:location'], 'Extension validated');
      t.ok(data.validate_extensions['extensions:Accessibility'], 'Extension validated');
      t.ok(data.validate_extensions['extensions:OriginalCreator'], 'Extension validated');
      t.notOk(err, 'No error messages');
      t.end();
    });
  });
});
