const test = require('tap').test;
const validator = require('..');

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
const ISO8601 = {
  good: [
    '2013-02',
    '2013-02-21',
    '2013-02-21T15:18Z',
    '2013-02-21T15:18-0500',
    '2013-02-21T15:18.000-0500',
    '201302',
    '20130221',
    '20130221T1518Z',
    '20130221T1518-0500',
    '20130221T1518.000-0500'
  ],
  bad: [
    '20',
    '2013022',
    'January 12th',
    '08/13/1985',
    Date.now().toString()
  ],
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
const IDENTITY_TYPES = {
  good: ['email', 'EMAIL', 'eMaIl'],
  bad: ['anything else', 'facebook', 'twitter']
};
const VERIFY_TYPES = {
  good: ['hosted', 'HOstED', 'signed', 'SIgnED'],
  bad: ['implicit', 'word of mouth']
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
const BOOLEANS = {
  good: [true, 'true', 'TrUE', false, 'false', 'FalSE'],
  bad: ['not stuff', 'bad', 'definitely not a boolean'],
};
const ABSOLUTE_URLS = {
  good: [
    'https://example.org',
    'http://example.co.uk/awesome',
    'http://localhost:8080/rad?query=grand',
    'https://example.org:443/this-is_/athing.json'
  ],
  bad: [
    '/not-absolute',
    'not even relative',
    'ftp://example.org/wrong/scheme',
    'gopher://for-real?',
  ]
};
const IMAGE_DATA_URLS = {
  good: [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg\nAAAAUAAAAFCAY\nAAACNbyblA\nAAAHElEQVQ\nI12P4//8/w38GIAXD\nIBKE0DHxgljNBAA\nO9TXL0Y4OHwAAAABJ\nRU5Er\nk\nJ\ng\ng\ng\n==',
  ],
  bad: [
    'data:text/html,<h1>hey</h1>',
    'data:image/png,<this would be some binary data>',
    'not a data url',
  ],
}
const TEST_DATA = {
  '0.5.0': {
    valid: {
      'recipient': [EMAILS.good, HASHES.good],
      'salt': [STRINGS.good],
      'evidence': [URLS.good],
      'expires': [TIMES.good],
      'issued_on': [TIMES.good],
      'badge': [OBJECTS.good],
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
    },
    invalid: {
      'recipient': [STRINGS.bad, EMAILS.bad, HASHES.bad],
      'salt': [STRINGS.bad],
      'evidence': [STRINGS.bad, URLS.bad],
      'expires': [STRINGS.bad, TIMES.bad],
      'issued_on': [STRINGS.bad, TIMES.bad],
      'badge': [OBJECTS.bad],
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
    }
  },
  '1.0.0-assertion': {
    valid: {
      'uid': [STRINGS.good],
      'recipient': [OBJECTS.good],
      'recipient.type': [IDENTITY_TYPES.good],
      'recipient.hashed': [BOOLEANS.good],
      'recipient.salt': [STRINGS.good],
      'recipient.identity': [STRINGS.good],
      'verify': [OBJECTS.good],
      'verify.type': [VERIFY_TYPES.good],
      'verify.url': [ABSOLUTE_URLS.good],
      'badge': [ABSOLUTE_URLS.good],
      'issuedOn': [TIMES.good, ISO8601.good],
      'expires': [TIMES.good, ISO8601.good],
      'evidence': [ABSOLUTE_URLS.good],
    },
    invalid: {
      'uid': [STRINGS.bad],
      'recipient': [OBJECTS.bad],
      'recipient.type': [STRINGS.bad, IDENTITY_TYPES.bad],
      'recipient.hashed': [STRINGS.bad, BOOLEANS.bad],
      'recipient.salt': [STRINGS.bad],
      'recipient.identity': [STRINGS.bad],
      'verify': [OBJECTS.bad],
      'verify.type': [STRINGS.bad, VERIFY_TYPES.bad],
      'verify.url': [STRINGS.bad, ABSOLUTE_URLS.bad],
      'badge': [ABSOLUTE_URLS.bad],
      'issuedOn': [STRINGS.bad, TIMES.bad, ISO8601.bad],
      'expires': [STRINGS.bad, TIMES.bad, ISO8601.bad],
      'evidence': [STRINGS.bad, ABSOLUTE_URLS.bad],
    }
  }
};

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
  '1.0.0-assertion': function newBadge(replacements) {
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


/** Test macros
 *
 * In the following methods, `options` is always expected to have the
 * following properties:
 *
 *   - `data`: object with two properties, `valid` and `invalid`. Each of
 *       those should be objects with properties for each expected
 *       assertion field. The values of those properties should be an
 *       array of arrays where the internal arrays are either `valid` or
 *       `invalid` values to test against.
 *   - `generator`: a function that generates a badge with the expected
 *       signature `function (replacements) { }`, where `replacements` is
 *       an object containing fields and values to use in place of the
 *       defaults from the generator.
 *
 */

function testInvalid(options, field) {
  const data = options.data.invalid[field];
  if (!data)
    throw new Error('need to set up test data for invalid `'+field+'`');
  flatten(data).forEach(function (val) {
    test('0.5.0 badges: invalid '+field+' ("'+val+'")', function (t) {
      const replacement = {};
      replacement[field] = val;
      const badge = options.generator(replacement);
      const result = validator.structure(badge);
      console.dir(result);
      t.same(result.length, 1, 'should have one error');
      t.same(result[0].field, field, 'should be `'+field+'` error');
      t.end();
    });
  });
}
function testValid(options, field) {
  const data = options.data.valid[field];
  if (!data)
    throw new Error('need to set up test data for valid `'+field+'`');
  flatten(data).forEach(function (val) {
    test('0.5.0 badges: valid '+field+' ("'+val+'")', function (t) {
      const replacement = {};
      replacement[field] = val;
      const badge = options.generator(replacement);
      const result = validator.structure(badge);
      console.dir(result);
      t.same(result.length, 0, 'should have no errors');
      t.end();
    });
  });
}
function testOptional(options, field) {
  test('0.5.0 badges: missing '+field, function (t) {
    const replacement = {}; replacement[field] = null;
    const badge = options.generator(replacement);
    const result = validator.structure(badge);
    t.same(result.length, 0, 'should have no errors');
    t.end();
  });
}
function testRequired(options, field) {
  test('0.5.0 badges: missing '+field, function (t) {
    const replacement = {}; replacement[field] = null;
    const badge = options.generator(replacement);
    const result = validator.structure(badge);
    t.same(result.length, 1, 'should one errors');
    t.same(result[0].field, field, 'should be `'+field+'` error');
    t.end();
  });
}
function testRequiredField(options, field) {
  testRequired(options, field);
  testInvalid(options, field);
  testValid(options, field);
}
function testOptionalField(options, field) {
  testOptional(options, field);
  testInvalid(options, field);
  testValid(options, field);
}
function testObjectField(options, field) {
  testRequired(options, field);
  testInvalid(options, field);
}

/** Actual tests */

test('0.5.0 badges: no errors', function (t) {
  const badge = BADGE_GENERATORS['0.5.0']();
  const result = validator.structure(badge);
  t.same(result.length, 0, 'should have zero errors');
  t.end();
});

test('0.5.0 badges with errors', function (t) {
  const version = '0.5.0';
  const options = {
    generator: BADGE_GENERATORS[version],
    data: TEST_DATA[version]
  }
  const optional = testOptionalField.bind(null, options);
  const required = testRequiredField.bind(null, options);
  const object = testObjectField.bind(null, options);

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

test('1.0.0-assertion: no errors', function (t) {
  const badge = BADGE_GENERATORS['1.0.0-assertion']();
  const result = validator.structure(badge);
  t.same(result.length, 0, 'should have zero errors');
  t.end();
});


test('1.0.0-assertion: some errors', function (t) {
  const version = '1.0.0-assertion';
  const options = {
    generator: BADGE_GENERATORS[version],
    data: TEST_DATA[version]
  }
  const optional = testOptionalField.bind(null, options);
  const required = testRequiredField.bind(null, options);
  const object = testObjectField.bind(null, options);

  required('uid');
  object('recipient');

  required('recipient.identity');
  required('recipient.type');
  required('recipient.hashed');
  optional('recipient.salt');

  // #TODO: write interdependence tests: when recipient.hashed is `true`,
  // identity should be a hash. When recipient.hashed is `false`, should
  // match the format of `recipient.type`.

  object('verify');
  required('verify.type');
  required('verify.url');

  required('badge');
  required('issuedOn');
  optional('expires');
  optional('evidence');

  t.end();
});


/** utility methods */

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


/**
 * Take an array of arrays and turn it into an array of the values of the
 * deeper array. E.g,
 *
 * ```js
 *  flatter([[1, 2], [3, 4]]) // -> [1,2,3,4]
 * ```
 *
 * @return {Array}
 */
function flatten(arry) {
  return arry.reduce(function (coll, intArr) {
    return coll.concat(intArr);
  }, []);
}

