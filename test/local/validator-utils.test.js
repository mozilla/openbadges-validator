const jws = require('jws');
const test = require('tap').test;
const validator = require('../../');
const generators = require('../test-generators.js');
const keys = require('../test-keys.js');

function sign(thing) {
  return jws.sign({
    header: { alg: 'rs256' },
    payload: thing,
    privateKey: keys.private
  });
}

test('validator.sha256 works', function(t) {
  t.same(validator.sha256('foo@example.orglol'),
         '764c2d5c44777ed2de8baf90bf422f859aed6e917071f8579fc9ae287aebf489');
  t.end();
});

test('validator.doesHashedEmailMatch works', function(t) {
  t.equal(validator.doesHashedEmailMatch(
    'sha256$' + validator.sha256('foo@example.org' + 'lol'),
    'lol',
    'foo@example.org'
  ), true, "returns true");
  t.equal(validator.doesHashedEmailMatch(
    'sha256$' + validator.sha256('foo@example.org' + 'lol'),
    'lol',
    'bar@example.org'
  ), false, "returns false when hashes don't match");
  t.equal(validator.doesHashedEmailMatch(
    'sha256$' + validator.sha256('foo@example.org'),
    undefined,
    'foo@example.org'
  ), true, "unsalted returns true");
  t.end();
});

test('validator.doesRecipientMatch works w/ 0.5.0 assertions', function(t) {
  function mkInfo(assertion) {
    return {
      version: '0.5.0',
      structures: {
        assertion: assertion
      }
    };
  }

  t.equal(validator.doesRecipientMatch(mkInfo({
    salt: 'lol',
    recipient: 'sha256$' + validator.sha256('foo@example.org' + 'lol')
  }), 'foo@example.org'), true, "works w/ matching hashed identities");

  t.equal(validator.doesRecipientMatch(mkInfo({
    salt: 'lol',
    recipient: 'sha256$' + validator.sha256('foo@example.org' + 'lol')
  }), 'bar@example.org'), false, "works w/ unmatching hashed identities");

  t.equal(validator.doesRecipientMatch(mkInfo({
    recipient: 'sha256$' + validator.sha256('foo@example.org')
  }), 'foo@example.org'), true, "works w/ matching unsalted hashed identities");

  t.equal(validator.doesRecipientMatch(mkInfo({
    recipient: 'foo@example.org'
  }), 'foo@example.org'), true, "works w/ matching unhashed identities");

  t.equal(validator.doesRecipientMatch(mkInfo({
    recipient: 'foo@example.org'
  }), 'bar@example.org'), false, "works w/ unmatching unhashed identities");

  t.end();
});

test('validator.doesRecipientMatch works w/ 1.0.0 assertions', function(t) {
  function mkInfo(identity) {
    return {
      version: '1.0.0',
      structures: {
        assertion: {
          recipient: identity
        }
      }
    };
  }

  t.equal(validator.doesRecipientMatch(mkInfo({
    type: 'lolcat'
  }), 'foo@example.org'), false, "works w/ bad identity types");

  t.equal(validator.doesRecipientMatch(mkInfo({
    type: 'email',
    hashed: true,
    salt: 'lol',
    identity: 'sha256$' + validator.sha256('foo@example.org' + 'lol')
  }), 'foo@example.org'), true, "works w/ matching hashed identities");

  t.equal(validator.doesRecipientMatch(mkInfo({
    type: 'email',
    hashed: true,
    salt: 'lol',
    identity: 'sha256$' + validator.sha256('foo@example.org' + 'lol')
  }), 'bar@example.org'), false, "works w/ unmatching hashed identities");

  t.equal(validator.doesRecipientMatch(mkInfo({
    type: 'email',
    hashed: false,
    identity: 'foo@example.org'
  }), 'foo@example.org'), true, "works w/ matching unhashed identities");

  t.equal(validator.doesRecipientMatch(mkInfo({
    type: 'email',
    hashed: false,
    identity: 'foo@example.org'
  }), 'bar@example.org'), false, "works w/ unmatching unhashed identities");

  t.end();
});

test('validator.getAssertionGUID works w/ hosted assertions', function(t) {
  var url = "http://example.org/cat.json";
  validator.getAssertionGUID(url, function(err, guid) {
    t.equal(err, null);
    t.same(guid, validator.sha256('hosted:' + url));
    t.end();
  });
});

test('validator.getAssertionGUID works w/ signed assertions', function(t) {
  var assertion = generators['1.0.0-assertion']({
    uid: 'abcd',
    verify: {
      type: 'signed',
      url: 'https://example.org/public-key'
    }
  });
  var signed = jws.sign({
    header: { alg: 'rs256' },
    payload: assertion,
    privateKey: keys.private
  });
  validator.getAssertionGUID(signed, function(err, guid) {
    t.equal(err, null);
    t.same(guid, validator.sha256('signed:abcd:https://example.org'));
    t.end();
  });
});

test('validator.getAssertionGUID fails w/ bad JWS', function(t) {
  validator.getAssertionGUID('lolol', function(err, guid) {
    t.equal(err.message, "jws-decode");
    t.end();
  });
});

test('validator.getAssertionGUID fails w/ bad JWS payload', function(t) {
  var signed = jws.sign({
    header: { alg: 'rs256' },
    payload: { lol: 'wut' },
    privateKey: keys.private
  });
  validator.getAssertionGUID(signed, function(err, guid) {
    t.equal(err.message, "invalid assertion structure");
    t.end();
  });
});

test('validator.absolutize: not an old assertion', function (t) {
  const assertion = {url: '/some/path'};
  const result = validator.absolutize(assertion);
  t.same(result, assertion, 'input unchanged');
  t.end();
});

test('validator.absolutize: no badge issuer origin', function (t) {
  const assertion = {badge: {issuer: {}}};
  const result = validator.absolutize(assertion);
  t.notOk(result, 'returns false');
  t.end();
});

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

test('VALID_HASHES are recognized by node crypto', function (t) {
  validator.VALID_HASHES.forEach(function(algorithm) {
    t.ok(require('crypto').createHash(algorithm),
         algorithm + ' algorithm is recognized by node crypto');
  });
  t.end();
});

test('validator.parseVersion()', function (t) {
  t.notOk(validator.parseVersion());
  t.notOk(validator.parseVersion('nope'));
  t.ok(validator.parseVersion({badge: {issuer: {}}}));
  t.end();
});
