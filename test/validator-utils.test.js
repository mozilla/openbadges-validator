const jws = require('jws');
const test = require('tap').test;
const validator = require('..');
const generators = require('./test-generators.js');
const keys = require('./test-keys.js');

function sign(thing) {
  return jws.sign({
    header: { alg: 'rs256' },
    payload: thing,
    privateKey: keys.private
  });
}

test('validator.absolutize: all relative', function (t) {
  const assertion = generators['0.5.0']({
    'evidence': '/evidence',
    'badge.criteria': '/criteria',
    'badge.image': '/image',
    'badge.issuer.origin': 'https://example.org'
  });
  const result = validator.absolutize(assertion);
  t.same(result.evidence, 'https://example.org/evidence', 'evidence should be correct');
  t.same(result.badge.criteria, 'https://example.org/criteria', 'criteria should be correct');
  t.same(result.badge.image, 'https://example.org/image', 'image should be correct');
  t.end();
});

test('validator.absolutize: all absolute', function (t) {
  const assertion = generators['0.5.0']({
    'evidence': 'https://example.org/evidence',
    'badge.criteria': 'https://example.org/criteria',
    'badge.image': 'https://example.org/image',
    'badge.issuer.origin': 'https://other-site.org'
  });
  const result = validator.absolutize(assertion);
  t.same(result.evidence, 'https://example.org/evidence', 'evidence should be correct');
  t.same(result.badge.criteria, 'https://example.org/criteria', 'criteria should be correct');
  t.same(result.badge.image, 'https://example.org/image', 'image should be correct');
  t.end();
});

test('validator.isSignedBadge', function (t) {
  t.same(validator.isSignedBadge('http://sub.domain.org'), false);
  t.same(validator.isSignedBadge(sign('sup')), false);
  t.same(validator.isSignedBadge(sign({some: 'thing'})), false);
  t.same(validator.isSignedBadge(sign({recipient: 'yep'})), true);
  t.end();
});
