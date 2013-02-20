const test = require('tap').test;
const validator = require('..');

function sha(string, salt) {
  const hasher = require('crypto').createHash('sha256');
  hasher.update('brian@mozillafoundation.org' + (salt||''));
  return 'sha256$' + hasher.digest('hex');
}

function objReplace(obj, dotString, value) {
  const keys = dotString.split('.');
  const target = keys.pop();
  const ref = keys.reduce(function (obj, key) {
    if (obj[key])
      return obj[key]
    return (obj[key] = {});
  }, obj);
  ref[target] = value;
  return ref;
}

function replaceAll(obj, replacements) {
  replacements = replacements || {};
  Object.keys(replacements).forEach(function (dotString) {
    const value = replacements[dotString];
    objReplace(obj, dotString, value);
  });
  return obj;
}

const BADGE_GENERATORS = {
  '0.5.0' : function oldBadge(replacements) {
    return replaceAll({
      recipient: sha('brian@mozillafoundation.org', 'seasalt'),
      salt: 'seasalt',
      evidence: 'https://example.org',
      expires: '2013-06-06',
      issued_on: '2013-01-01',
      badge: {
        version: '0.5.0',
        criteria: '/criteria',
        image: '/image.png',
        name: 'Some Awesome Badge',
        description: 'This is a description',
        issuer: {
          origin: 'https://example.org',
          name: 'Example',
          org: 'Organization',
          contact: 'guy@example.org',
        },
      },
    }, replacements);
  },
  '1.0.0': function newBadge(replacements) {
    return replaceAll({
      uid: 'd3c4ff',
      recipient: {
        identity: sha('brian@mozillafoundation.org', 'seasalt'),
        salt: 'seasalt',
        hashed: true,
        type: 'email'
      },
      verify: {
        type: 'hosted',
        url: 'https://example.org/assertion.json'
      },
      badge: 'https://example.org/badge.json',
      issuedOn: '2013-02-18T18:10+0500',
      image: 'https://example.org/image.png',
      evidence: 'https://example.org/evidence.html',
      expires: '2014-02-18T18:10+0500',
    }, replacements);
  }
};


const STRINGS = {
  good: ['OH', 'hey'],
  bad: [
    ['not', 'a', 'string'],
    { not: 'a string' },
  ]
};
const EMAILS = {
  good: [
    'brian@awesome.com',
    'yo+wut@example.com',
    'ümlaut@heavymetal.de',
  ],
  bad: [
    'lkajd',
    'skj@asdk',
    '@.com',
    '909090',
    '____!@',
  ]
};
const HASHES = {
  good: [
    'sha1$c0b19425e0f2c8021ab06c79b19144e127b0f2cb',
    'sha256$406f04039d10c79c070b26781e8246dc01ed1d0453c5ad0fa705ff7d507fd898'
  ],
  bad: [
    'sha1stuff',
    'bcrypt$5$something'
  ]
}
const URLS = {
  good: [
    'http://example.com/',
    'https://example.com/w/yo',
    '/partial/path',
    '/rad.awesome/great/',
    '/foreign/crázy/ååú´¨la/'
  ],
  bad: [
    '-not-asdo',
    'ftp://bad-scheme',
    '@.com:90/',
    'just totally wrong'
  ],
};
const TIMES = {
  good : [
    Date.now()/1000 | 0,
    '2012-01-01'
  ],
  bad: [
    'oiajsd09gjas;oj09',
    'foreever ago',
    '@.com:90/',
    '2001-10-190-19',
    '901d1',
    '000000000000000000000'
  ]
};
const OBJECTS = {
  good: [
    { something: 'yes' },
    { other: { thing: 'no' }}
  ],
  bad: [
    [ 1, 2, 3, 4 ],
    'just a string',
    function () {},
  ]
};
const VERSIONS = {
  good: [
    '0.1.1',
    '2.0.1',
    '1.2.3',
    'v1.2.1'
  ],
  bad: [
    'v100',
    '50',
    'v10.1alpha',
    '1.2.x'
  ]
};
const ORIGINS = {
  good: [
    'http://example.com',
    'https://example.com:80',
    'https://www.example.com',
    'https://www.example.com:8080',
    'http://example.com/'
  ],
  bad : [
    '-not-asdo',
    'ftp://bad-scheme',
    '@.com:90/',
    'just totally wrong',
    'http://example.com/what',
    'http://example.com:8080/false'
  ]
};

const VALID =  {
  recipient: [EMAILS.good, HASHES.good],
  salt: [STRINGS.good],
  evidence: [URLS.good],
  expires: [TIMES.good],
  issued_on: [TIMES.good],
  badge: [OBJECTS.good],
  'badge.version': [VERSIONS.good],
  'badge.name': [STRINGS.good],
  'badge.description': [STRINGS.good],
  'badge.image': [URLS.good],
  'badge.criteria': [URLS.good],
  'badge.issuer': [OBJECTS.good],
  'badge.issuer.name': [STRINGS.good],
  'badge.issuer.contact': [EMAILS.good],
  'badge.issuer.origin': [ORIGINS.good],
  'badge.issuer.org': [STRINGS.good],
};
const INVALID = {
  recipient: [STRINGS.bad, EMAILS.bad, HASHES.bad],
  salt: [STRINGS.bad],
  evidence: [STRINGS.bad, URLS.bad],
  expires: [STRINGS.bad, TIMES.bad],
  issued_on: [STRINGS.bad, TIMES.bad],
  badge: [OBJECTS.bad],
  'badge.version': [STRINGS.bad, VERSIONS.bad],
  'badge.name': [STRINGS.bad],
  'badge.description': [STRINGS.bad],
  'badge.image': [STRINGS.bad, URLS.bad],
  'badge.criteria': [STRINGS.bad, URLS.bad],
  'badge.issuer': [OBJECTS.bad],
  'badge.issuer.name': [STRINGS.bad],
  'badge.issuer.contact': [STRINGS.bad, EMAILS.bad],
  'badge.issuer.origin': [STRINGS.bad, ORIGINS.bad],
  'badge.issuer.org': [STRINGS.bad],
};

function flatten(arry) {
  return arry.reduce(function (coll, intArr) {
    return coll.concat(intArr);
  }, []);
}

function testInvalid(field, assertionGenerator) {
  flatten(INVALID[field]).forEach(function (val) {
    test('0.5.0 badges: invalid '+field+' ("'+val+'")', function (t) {
      const replacement = {};
      replacement[field] = val;
      const badge = assertionGenerator(replacement);
      const result = validator.structure(badge);
      console.dir(result);
      t.same(result.length, 1, 'should one errors');
      t.same(result[0].field, field, 'should be `'+field+'` error');
      t.end();
    });
  });
}

function testValid(field, assertionGenerator) {
  flatten(VALID[field]).forEach(function (val) {
    test('0.5.0 badges: valid '+field+' ("'+val+'")', function (t) {
      const replacement = {};
      replacement[field] = val;
      const badge = assertionGenerator(replacement);
      const result = validator.structure(badge);
      console.dir(result);
      t.same(result.length, 0, 'should no errors');
      t.end();
    });
  });
}

function testOptional(field, assertionGenerator) {
  test('0.5.0 badges: missing '+field, function (t) {
    const replacement = {};
    replacement[field] = null;
    const badge = assertionGenerator(replacement);
    const result = validator.structure(badge);
    t.same(result.length, 0, 'should no errors');
    t.end();
  });
}

function testRequired(field, assertionGenerator) {
  test('0.5.0 badges: missing '+field, function (t) {
    const replacement = {};
    replacement[field] = null;
    const badge = assertionGenerator(replacement);
    const result = validator.structure(badge);
    t.same(result.length, 1, 'should one errors');
    t.same(result[0].field, field, 'should be `'+field+'` error');
    t.end();
  });
}

function testRequiredField(assertionGenerator, field) {
  testRequired(field, assertionGenerator);
  testInvalid(field, assertionGenerator);
  testValid(field, assertionGenerator);
}
function testOptionalField(assertionGenerator, field) {
  testOptional(field, assertionGenerator);
  testInvalid(field, assertionGenerator);
  testValid(field, assertionGenerator);
}
function testObjectField(assertionGenerator, field) {
  testRequired(field, assertionGenerator);
  testInvalid(field, assertionGenerator);
}

test('0.5.0 badges: no errors', function (t) {
  const badge = BADGE_GENERATORS['0.5.0']();
  const result = validator.structure(badge);
  t.same(result.length, 0, 'should have zero errors');
  t.end();
});

test('0.5.0 badges with errors', function (t) {
  const optional = testOptionalField.bind(null, BADGE_GENERATORS['0.5.0']);
  const required = testRequiredField.bind(null, BADGE_GENERATORS['0.5.0']);
  const object = testObjectField.bind(null, BADGE_GENERATORS['0.5.0']);

  optional('salt');
  optional('evidence');
  optional('expires');
  optional('issued_on');
  required('recipient');

  required('badge.name');
  required('badge.description');
  required('badge.image');
  required('badge.criteria');
  optional('badge.version');

  object('badge.issuer');

  required('badge.issuer.name');
  required('badge.issuer.contact');
  required('badge.issuer.origin');
  optional('badge.issuer.org');
  t.end();
});

test('1.0.0 badges: no errors', function (t) {
  const badge = BADGE_GENERATORS['1.0.0']();
  const result = validator.structure(badge);
  t.same(result.length, 0, 'should have zero errors');
  t.end();
});
