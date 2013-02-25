const test = require('tap').test;
const validator = require('..');
const nock = require('nock');
const generators = require('./test-generators');

const ORIGIN = 'https://example.org';

test('validator.ensureHttpOk: 200 OK', function (t) {
  const path = '/start';
  const scope = nock(ORIGIN)
    .get(path)
    .reply(200)
  const opts = { field: 'test', url: ORIGIN + path };
  validator.ensureHttpOk(opts, function (_, errs) {
    t.same(errs.length, 0, 'should not have any errors');
    t.end();
  });
});

test('validator.ensureHttpOk: 3xx redirects', function (t) {
  const path = '/start';
  const scope = nock(ORIGIN)
    .get(path)
    .reply(303, 'go to other place', { Location: '/other' })
    .get('/other')
    .reply(302, 'go to other place', { Location: '/other2' })
    .get('/other2')
    .reply(301, 'go to other place', { Location: '/other3' })
    .get('/other3')
    .reply(200, 'success')
  const opts = { field: 'test', url: ORIGIN + path };
  validator.ensureHttpOk(opts, function (_, errs) {
    t.same(errs.length, 0, 'should not have any errors');
    t.end();
  });
});

test('validator.ensureHttpOk: 404 Not Found', function (t) {
  const path = '/start';
  const scope = nock(ORIGIN)
    .get(path)
    .reply(404, 'Not Found')
  const opts = { field: 'test', url: ORIGIN + path };
  validator.ensureHttpOk(opts, function (_, errs) {
    t.same(errs.length, 1, 'should have an error');
    t.end();
  });
});

test('validator.ensureHttpOk: 200 OK, wrong type', function (t) {
  const path = '/start';
  const scope = nock(ORIGIN)
    .get(path)
    .reply(200, 'plain text', {'Content-Type': 'text/plain'})
  const opts = {
    field: 'test',
    url: ORIGIN + path,
    type: 'image/png'
  };
  validator.ensureHttpOk(opts, function (_, errs) {
    t.same(errs.length, 1, 'should have an error');
    t.same(errs[0].code, 'content-type', 'should be a content-type error');
    t.end();
  });
});

test('validator.ensureHttpOk: Unreachable', function (t) {
  const opts = {
    field: 'test',
    url: 'https://totally-bogus-'+Date.now()+'-ya:18241',
  };
  validator.ensureHttpOk(opts, function (_, errs) {
    t.same(errs.length, 1, 'should have an error');
    t.same(errs[0].code, 'unreachable', 'should be a unreachable error');
    t.end();
  });
});

test('validator.assertionResponses: 0.5.0 assertion, all errors', function (t) {
  const assertion = generators['0.5.0']();
  validator.assertionResponses(assertion, function (errs) {
    const expect = ['criteria', 'evidence', 'image'].sort();
    const result = errs.map(pluck('field')).sort();
    t.same(result, expect, 'should have right error fields');
    t.end();
  });
});

test('validator.assertionResponses: 0.5.0 assertion, only image error', function (t) {
  const scope = nock(ORIGIN)
    .get('/criteria').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/evidence').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/image').reply(200, 'plain text', {'Content-Type': 'text/plain'})
  const assertion = generators['0.5.0']();
  validator.assertionResponses(assertion, function (errs) {
    t.same(errs.length, 1, 'should have one error');
    t.same(errs[0].code, 'content-type', 'should be a content-type error');
    t.end();
  });
});

test('validator.assertionResponses: 0.5.0 assertion, all good', function (t) {
  const scope = nock(ORIGIN)
    .get('/criteria').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/evidence').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/image').reply(200, 'image data', {'Content-Type': 'image/png'})
  const assertion = generators['0.5.0']();
  validator.assertionResponses(assertion, function (errs) {
    t.notOk(errs, 'should have no errors');
    t.end();
  });
});

test('validator.assertionResponses: 1.0.0-assertion, all good', function (t) {
  const scope = nock(ORIGIN)
    .get('/assertion').reply(200, '{}', {'Content-Type': 'application/json'})
    .get('/evidence').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/user-image').reply(200, 'image data', {'Content-Type': 'image/png'})
  const assertion = generators['1.0.0-assertion']();
  validator.assertionResponses(assertion, function (errs) {
    t.notOk(errs, 'should have no errors');
    t.end();
  });
});

test('validator.assertionResponses: 1.0.0-assertion, bad assertion', function (t) {
  const scope = nock(ORIGIN)
    .get('/assertion').reply(200, 'plain', {'Content-Type': 'text/plain'})
    .get('/evidence').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/user-image').reply(200, 'image data', {'Content-Type': 'image/png'})
  const assertion = generators['1.0.0-assertion']();
  validator.assertionResponses(assertion, function (errs) {
    t.same(errs.length, 1, 'should have one error');
    t.same(errs[0].field, 'verify.url', 'should be "verify.url"');
    t.same(errs[0].code, 'content-type', 'should be a "content-type" error');
    t.end();
  });
});

test('validator.assertionResponses: 1.0.0-assertion, public key', function (t) {
  const scope = nock(ORIGIN)
    .get('/key').reply(200, 'plain', {'Content-Type': 'text/plain'})
    .get('/evidence').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/user-image').reply(200, 'image data', {'Content-Type': 'image/png'})
  const assertion = generators['1.0.0-assertion']({
    'verify.url': ORIGIN + '/key',
    'verify.type': 'signed',
  });
  validator.assertionResponses(assertion, function (errs) {
    t.notOk(errs, 'should have no errors');
    t.end();
  });
});

test('validator.assertionResponses: 1.0.0-assertion, bad image', function (t) {
  const scope = nock(ORIGIN)
    .get('/assertion').reply(200, '{}', {'Content-Type': 'application/json'})
    .get('/evidence').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/user-image').reply(200, 'lololol', {'Content-Type': 'application/msword'})
  const assertion = generators['1.0.0-assertion']();
  validator.assertionResponses(assertion, function (errs) {
    t.same(errs.length, 1, 'should have one error');
    t.same(errs[0].field, 'image', 'should be "image"');
    t.same(errs[0].code, 'content-type', 'should be a "content-type" error');
    t.end();
  });
});

test('validator.assertionResponses: 1.0.0-assertion, data url image', function (t) {
  const scope = nock(ORIGIN)
    .get('/assertion').reply(200, '{}', {'Content-Type': 'application/json'})
    .get('/evidence').reply(200, 'plain text', {'Content-Type': 'text/plain'})
  const assertion = generators['1.0.0-assertion']({
    'image': 'data:image/png,<some stuff here>'
  });
  validator.assertionResponses(assertion, function (errs) {
    t.notOk(errs, 'should have no errors');
    t.end();
  });
});

test('validator.badgeClassResponses: 1.0.0-badge, full of errors', function (t) {
  const badge = generators['1.0.0-badge']();
  validator.badgeClassResponses(badge, function (errs) {
    const expect = ['image', 'criteria'].sort();
    const result = errs.map(pluck('field')).sort();
    t.same(result, expect, 'should have all the right errors in all the right places');
    t.end();
  });
});

test('validator.badgeClassResponses: 1.0.0-badge, no errors', function (t) {
  const scope = nock(ORIGIN)
    .get('/criteria').reply(200, 'plain text', {'Content-Type': 'text/plain'})
    .get('/badge-image').reply(200, 'image data', {'Content-Type': 'image/png'})
  const badge = generators['1.0.0-badge']();
  validator.badgeClassResponses(badge, function (errs) {
    t.notOk(errs, 'should not have any errors');
    t.end();
  });
});


function pluck(field) {
  return function (obj) {
    return obj[field];
  }
}