const test = require('tap').test;
const resources = require('../lib/resources');
const nock = require('nock');

const ORIGIN = 'https://example.org';
const httpScope = nock(ORIGIN);

test('getUrl: required, missing', function (t) {
  resources.getUrl({
    required: true,
  }, function (ex, result) {
    t.same(result.error.code, 'missing', 'should be a missing error');
    t.end();
  });
});

test('getUrl: required, unreachable', function (t) {
  resources.getUrl({
    url: ORIGIN + '/test',
    required: true,
  }, function (ex, result) {
    t.same(result.error.code, 'unreachable', 'should be unreachable');
    t.end();
  });
});

test('getUrl: required, HTTP 404', function (t) {
  httpScope
    .get('/test').reply(404)
  resources.getUrl({
    url: ORIGIN + '/test',
    required: true,
  }, function (ex, result) {
    t.same(result.error.code, 'http-status', 'should be http response error');
    t.end();
  });
});

test('getUrl: required, wrong content type', function (t) {
  httpScope
    .get('/test').reply(200, 'stuff', {'content-type': 'application/msword'})
  resources.getUrl({
    url: ORIGIN + '/test',
    required: true,
    'content-type': 'text/plain',
  }, function (ex, result) {
    t.same(result.error.code, 'content-type', 'should be a content-type error');
    t.end();
  });
});

test('getUrl: optional, missing', function (t) {
  resources.getUrl({
    required: false,
    'content-type': 'text/plain',
  }, function (ex, result) {
    t.notOk(ex, 'no exceptions');
    t.notOk(result.error, 'no errors')
    t.end();
  });
});

test('getUrl: optional, exists', function (t) {
  httpScope
    .get('/test').reply(200, 'stuff', {'content-type': 'text/plain'})
  resources.getUrl({
    url: ORIGIN + '/test',
    required: false,
    'content-type': 'text/plain',
  }, function (ex, result) {
    t.notOk(ex, 'no exceptions');
    t.notOk(result.error, 'no errors')
    t.same(result.body, 'stuff', 'should get right body');
    t.end();
  });
});

test('getUrl: json, unparseable', function (t) {
  httpScope
    .get('/test').reply(200, 'stuff', {'content-type': 'application/json'})
  resources.getUrl({
    url: ORIGIN + '/test',
    required: false,
    json: true,
  }, function (ex, result) {
    t.notOk(ex, 'no exceptions');
    t.same(result.error.code, 'parse', 'parse error')
    t.end();
  });
});

test('getUrl: json, parseable', function (t) {
  httpScope
    .get('/test').reply(200, '{"stuff":"all of it"}', {'content-type': 'application/json'})
  resources.getUrl({
    url: ORIGIN + '/test',
    required: false,
    json: true,
  }, function (ex, result) {
    t.notOk(ex, 'no exceptions');
    t.notOk(result.error, 'no errors')
    t.same(result.body.stuff, 'all of it');
    t.end();
  });
});



test('resources', function (t) {
  httpScope
    .get('/a/root').reply(200, 'a.root')
    .get('/a/nested/url').reply(200, 'a.nested.url')
    .get('/b/image').reply(200, 'b.image')
    .get('/c/optional').reply(404)

  resources({
    a: {
      root: ORIGIN + '/a/root',
      nested: { url: ORIGIN + '/a/nested/url' }
    },
    b: { image: ORIGIN + '/b/image' },
    c: {
      image: ORIGIN + '/c/image',
      optional: ORIGIN + '/c/optional'
    }
  }, {
    'a.root': { required: true },
    'a.nested.url': { required: true },
    'b.image': { required: true, 'content-type': 'image/png'},
    'c.optional': { required: false },
    'c.image': { required: true },
    'd.does.not.exist': { optional: false }
  }, function (exception, results) {
    t.same(results['a.root'].body, 'a.root');
    t.same(results['a.nested.url'].body, 'a.nested.url');
    t.same(results['b.image'].error.code, 'content-type');
    t.same(results['c.optional'].error.code, 'http-status');
    t.same(results['c.image'].error.code, 'unreachable');
    t.same(results['d.does.not.exist'].error.code, 'missing');
    t.end();
  });
});

