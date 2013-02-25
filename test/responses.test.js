const test = require('tap').test;
const validator = require('..');
const nock = require('nock');

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
