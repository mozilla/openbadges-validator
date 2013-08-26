const test = require('tap').test;
const validator = require('..');
const testData = require('./test-data.js');
const generators = require('./test-generators.js');

test('0.5.0 badges: no errors', function (t) {
  const assertion = generators['0.5.0']();
  const errors = validator.assertion(assertion);
  console.dir(errors);
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('1.0.0-assertion: no errors', function (t) {
  const assertion = generators['1.0.0-assertion']();
  const errors = validator.assertion(assertion);
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('1.0.0-badge: no errors', function (t) {
  const badge = generators['1.0.0-badge']();
  const errors = validator.badgeClass(badge);
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('1.0.0-issuer: no errors', function (t) {
  const issuer = generators['1.0.0-issuer']();
  const errors = validator.issuerOrganization(issuer);
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('0.5.0 badges with errors', function (t) {
  const version = '0.5.0';
  const options = {
    generator: generators[version],
    data: testData[version],
    method: validator.assertion
  };
  with (macros(options)) {
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

    required('badge.issuer.name');
    required('badge.issuer.origin');
    optional('badge.issuer.contact');
    optional('badge.issuer.org');
  }
  t.end();
});

test('1.0.0-assertion: some errors', function (t) {
  const version = '1.0.0-assertion';
  const options = {
    generator: generators[version],
    data: testData[version],
    method: validator.assertion
  };
  with (macros(options)) {
    required('uid');
    object('recipient');

    required('recipient.identity');
    required('recipient.type');
    required('recipient.hashed');
    optional('recipient.salt');

    object('verify');
    required('verify.type');
    required('verify.url');

    required('badge');
    required('issuedOn');
    optional('expires');
    optional('evidence');
    optional('image');
  }
  t.end();
});

test('1.0.0-badge: some errors', function (t) {
  const version = '1.0.0-badge';
  const options = {
    generator: generators[version],
    data: testData[version],
    method: validator.badgeClass
  };
  with (macros(options)) {
    required('name');
    required('description');
    required('image');
    required('criteria');
    required('issuer');
    optional('tags');
    optional('alignment');
  }
  t.end();
});

test('1.0.0-issuer: some errors', function (t) {
  const version = '1.0.0-issuer';
  const options = {
    generator: generators[version],
    data: testData[version],
    method: validator.issuerOrganization
  };
  with (macros(options)) {
    required('name');
    required('url');
    optional('description');
    optional('image');
    optional('revocationList');
  }
  t.end();
});


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

function macros(options) {
  return {
    optional: testOptionalField.bind(null, options),
    required: testRequiredField.bind(null, options),
    object: testObjectField.bind(null, options)
  }
}

function testInvalid(options, field) {
  const data = options.data.invalid[field];
  if (!data)
    throw new Error('need to set up test data for invalid `'+field+'`');
  flatten(data).forEach(function (val) {
    test('0.5.0 badges: invalid '+field+' ("'+val+'")', function (t) {
      const replacement = {};
      replacement[field] = val;
      const badge = options.generator(replacement);
      const errors = options.method(badge);
      t.ok(errors[field], 'should be `'+field+'` error');
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
      const errors = options.method(badge);
      t.notOk(errors, 'should have no errors');
      t.end();
    });
  });
}
function testOptional(options, field) {
  test('0.5.0 badges: missing '+field, function (t) {
    const replacement = {}; replacement[field] = null;
    const badge = options.generator(replacement);
    const errors = options.method(badge);
    t.notOk(errors, 'should have no errors');
    t.end();
  });
}
function testRequired(options, field) {
  test('0.5.0 badges: missing '+field, function (t) {
    const replacement = {}; replacement[field] = null;
    const badge = options.generator(replacement);
    const errors = options.method(badge);
    t.ok(errors[field], 'should be `'+field+'` error');
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
test('0.5.0: validateOldInterdependentFields()', function(t) {
  t.plan(5);

  validator.validateOldInterdependentFields({structures: {assertion: {
    salt: 'lol',
    recipient: 'sha256$abcd'
  }}}, function(err, info) {
    t.notOk(err, 'should have no errors');
    t.ok(info.structures, 'should pass through info');
  });

  validator.validateOldInterdependentFields({structures: {assertion: {
    recipient: 'foo@bar.org'
  }}}, function(err) {
    t.notOk(err, 'should have no errors');
  });

  validator.validateOldInterdependentFields({structures: {assertion: {
    recipient: 'sha256$abcd'
  }}}, function(err) {
    t.equal(err.recipient.message, 'must be an email address');
  });

  validator.validateOldInterdependentFields({structures: {assertion: {
    salt: 'lol',
    recipient: 'foo@bar.org'
  }}}, function(err) {
    t.ok(err.recipient.message.match(/must be a self-identifying hash/));
  });

  t.end();
});
test('1.0.0: validateInterdependentFields()', function(t) {
  var validateInterdependentFields = validator.validateInterdependentFields;

  t.plan(6);
  
  validateInterdependentFields({structures: {assertion: {recipient: {
    hashed: false,
    type: 'email',
    identity: 'foo@bar.org'
  }}}}, function(err, info) {
    t.notOk(err, 'should have no errors');
    t.ok(info.structures, 'should pass through info');
  });

  validateInterdependentFields({structures: {assertion: {recipient: {
    hashed: true,
    type: 'email',
    salt: 'lol',
    identity: 'sha256$abcd'
  }}}}, function(err, info) {
    t.notOk(err, 'should have no errors');
  });

  validateInterdependentFields({structures: {assertion: {recipient: {
    hashed: true,
    type: 'email',
    identity: 'sha256$abcd'
  }}}}, function(err, info) {
    t.equal(err['recipient.salt'].message, 'must be a string');
  });

  validateInterdependentFields({structures: {assertion: {recipient: {
    hashed: true,
    type: 'email',
    salt: 'lol',
    identity: 'foo@bar.org'
  }}}}, function(err, info) {
    t.ok(err['recipient.identity'].message
      .match(/must be a self-identifying hash/));
  });

  validateInterdependentFields({structures: {assertion: {recipient: {
    hashed: false,
    type: 'email',
    identity: 'sha256$abcd'
  }}}}, function(err, info) {
    t.equal(err['recipient.identity'].message, 'must be an email address');
  });

  t.end();
});

/** utility methods */

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



