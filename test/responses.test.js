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
  validator.ensureHttpOk(opts, function (_, __, errs) {
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
  validator.ensureHttpOk(opts, function (_, __, errs) {
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
  validator.ensureHttpOk(opts, function (_, __, errs) {
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
  validator.ensureHttpOk(opts, function (_, __, errs) {
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
  validator.ensureHttpOk(opts, function (_, __, errs) {
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

test('validator.issuerOrganizationResponses: 1.0.0-issuer, full of errors', function (t) {
  const badge = generators['1.0.0-issuer']();
  validator.issuerOrganizationResponses(badge, function (errs) {
    const expect = ['url', 'image'].sort();
    const result = errs.map(pluck('field')).sort();
    t.same(result, expect, 'should have all the right errors in all the right places');
    t.end();
  });
});

test('validator.issuerOrganizationResponses: 1.0.0-issuer, no image or revocation errors', function (t) {
  const badge = generators['1.0.0-issuer']({
    image: null,
    revocationList: null,
  });
  validator.issuerOrganizationResponses(badge, function (errs) {
    const expect = ['url'].sort();
    const result = errs.map(pluck('field')).sort();
    t.same(result, expect, 'should have all the right errors in all the right places');
    t.end();
  });
});

test('validator.getLinkedStructures: `badge` error', function (t) {
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, obj) {
    t.ok(err, 'should have an error');
    t.ok(err.field, 'should be for `badge` field');
    t.ok(err.field, 'should be an `unreachable` error');
    t.end();
  });
});

test('validator.getLinkedStructures: `badge` content type error', function (t) {
  const scope = nock(ORIGIN)
    .get('/badge').reply(200, 'sup', { 'content-type': 'text/plain' });
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, obj) {
    t.ok(err, 'should have an error');
    t.ok(err.field, 'should be for `badge` field');
    t.ok(err.code, 'should be a `content-type` error');
    t.end();
  });
});

test('validator.getLinkedStructures: `badge` parse error', function (t) {
  const scope = nock(ORIGIN)
    .get('/badge').reply(200, 'ohlol', { 'content-type': 'application/json' });
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, obj) {
    t.ok(err, 'should have an error');
    t.ok(err.field, 'should be for `badge` field');
    t.ok(err.code, 'should be an `parse` error');
    t.end();
  });
});

test('validator.getLinkedStructures: `issuer` error', function (t) {
  const badge = JSON.stringify(generators['1.0.0-badge']());
  const scope = nock(ORIGIN)
    .get('/badge').reply(200, badge, { 'content-type': 'application/json' });
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, obj) {
    t.ok(err, 'should have an error');
    t.ok(err.field, 'should be for `issuer` field');
    t.ok(err.code, 'should be an `unreachable` error');
    t.end();
  });
});

test('validator.getLinkedStructures: `revocationList` error', function (t) {
  const badge = JSON.stringify(generators['1.0.0-badge']());
  const issuer = JSON.stringify(generators['1.0.0-issuer']());
  const scope = nock(ORIGIN)
    .get('/badge').reply(200, badge, { 'content-type': 'application/json' })
    .get('/issuer').reply(200, issuer, { 'content-type': 'application/json' })
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, obj) {
    t.ok(err, 'should have an error');
    t.ok(err.field, 'should be for `revocationList` field');
    t.ok(err.code, 'should be an `unreachable` error');
    t.end();
  });
});

test('validator.getLinkedStructures: no revocationList, no error', function (t) {
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']({
    revocationList: null
  });
  const scope = nock(ORIGIN)
    .get('/badge').reply(200, JSON.stringify(badge), { 'content-type': 'application/json' })
    .get('/issuer').reply(200, JSON.stringify(issuer), { 'content-type': 'application/json' })
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, result) {
    t.notOk(err, 'should not have an error');
    t.same(badge, result.badge, 'should get the badge back');
    t.same(issuer, result.issuer, 'should get the issuer back');
    t.end();
  });
});

test('validator.getLinkedStructures: with revocationList', function (t) {
  const badge = generators['1.0.0-badge']();
  const issuer = generators['1.0.0-issuer']();
  const revocationList = {"hi": "swiper no swiping"};
  const scope = nock(ORIGIN)
    .get('/badge').reply(200, JSON.stringify(badge), { 'content-type': 'application/json' })
    .get('/issuer').reply(200, JSON.stringify(issuer), { 'content-type': 'application/json' })
    .get('/revocation-list').reply(200, JSON.stringify(revocationList), { 'content-type': 'application/json' })
  const assertion = generators['1.0.0-assertion']();
  validator.getLinkedStructures(assertion, function (err, result) {
    t.notOk(err, 'should not have an error');
    t.same(result.badge, badge, 'should get the badge back');
    t.same(result.issuer, issuer, 'should get the issuer back');
    t.same(result.revocationList, revocationList, 'should get the revocation list back');
    t.end();
  });
});

test('validator.getLinkedStructures: missing `badge` field', function (t) {
  const assertion = generators['1.0.0-assertion']({badge: null});
  validator.getLinkedStructures(assertion, function (err, result) {
    t.ok(err, 'should have an error');
    t.same(err.field, 'badge', 'should be for the badge field');
    t.same(err.code, 'missing', 'should be a `missing` error');
    t.end();
  });
});

test('validator.getLinkedStructures: missing `issuer` field', function (t) {
  const assertion = generators['1.0.0-assertion']();
  const badge = generators['1.0.0-badge']({issuer: null});
  const revocationList = {"hi": "swiper no swiping"};
  const scope = nock(ORIGIN)
    .get('/badge').reply(200, JSON.stringify(badge), { 'content-type': 'application/json' })
  validator.getLinkedStructures(assertion, function (err, result) {
    t.ok(err, 'should have an error');
    t.same(err.field, 'issuer', 'should be for the issuer field');
    t.same(err.code, 'missing', 'should be a `missing` error');
    t.end();
  });
});

function pluck(field) {
  return function (obj) {
    return obj[field];
  }
}