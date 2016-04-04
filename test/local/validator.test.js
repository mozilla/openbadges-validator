const test = require('tap').test;
const validator = require('../../');
const testData = require('../test-data.js');
const generators = require('../test-generators.js');

test('0.5.0 badges: no errors', function (t) {
  const assertion = generators['0.5.0']();
  const errors = validator.assertion(assertion, '0.5.0');
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('1.0.0-assertion: no errors', function (t) {
  const assertion = generators['1.0.0-assertion']();
  const errors = validator.assertion(assertion, '1.0.0');
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('1.0.0-badge: no errors', function (t) {
  const badge = generators['1.0.0-badge']();
  const errors = validator.badgeClass(badge, '1.0.0');
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('1.0.0-issuer: no errors', function (t) {
  const issuer = generators['1.0.0-issuer']();
  const errors = validator.issuerOrganization(issuer, '1.0.0');
  t.notOk(errors, 'should have zero errors');
  t.end();
});

test('0.5.0 badges with errors', function (t) {
  const version = '0.5.0';
  const options = {
    version: '0.5.0',
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
    version: '1.0.0',
    generator: generators[version],
    data: testData[version],
    method: validator.assertion
  };
  with (macros(options)) {
    required('uid');

    required('recipient.identity');
    required('recipient.type');
    required('recipient.hashed');
    optional('recipient.salt');

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
    version: '1.0.0',
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
    version: '1.0.0',
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
    test(options.version + ' assertion: invalid ' + field + ' ("'+val+'")', function (t) {
      const replacement = {};
      replacement[field] = val;
      const badge = options.generator(replacement);
      const errors = options.method(badge, options.version);
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
      const errors = options.method(badge, options.version);
      t.notOk(errors, 'should have no errors');
      t.end();
    });
  });
}
function testOptional(options, field) {
  var message = '0.5.0 assertion: missing ' + field;
  test(message, function (t) {
    const replacement = {};
    replacement[field] = null;
    const assertion = options.generator(replacement);
    const errors = options.method(assertion, options.version);
    t.notOk(errors, 'should have no errors');
    t.end();
  });
}
function testRequired(options, field) {
  test('0.5.0 badges: missing '+field, function (t) {
    const replacement = {};
    replacement[field] = null;
    const badge = options.generator(replacement);
    const errors = options.method(badge, options.version);
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

test('0.5.0: taskValidateRecipients()', function(t) {
  t.plan(5);

  validator.taskValidateRecipient(function(err, result) {
    t.notOk(err, 'should have no errors');
    t.ok(result, 'should pass back TRUE');
  }, generators['0.5.0-hashed-recipient']());

  validator.taskValidateRecipient(function(err) {
    t.notOk(err, 'should have no errors');
  }, generators['0.5.0-plain-recipient']());

  validator.taskValidateRecipient(function(err) {
    t.notOk(err, 'should have no errors');
  }, generators['0.5.0-plain-recipient']({'assertion.recipient': 'sha256$abcd'}));

  validator.taskValidateRecipient(function(err) {
    t.ok(err.recipient.message.match(/must be a self-identifying hash/));
  }, generators['0.5.0-plain-recipient']({'assertion.salt': 'lol'}));

  t.end();
});

test('1.0.0: taskValidateRecipient()', function(t) {
  var taskValidateRecipient = validator.taskValidateRecipient;

  t.plan(6);

  taskValidateRecipient(function(err, result) {
    t.notOk(err, 'should have no errors');
    t.ok(result, 'should pass back TRUE');
  }, generators['1.0.0-plain-recipient']());

  taskValidateRecipient(function(err, result) {
    t.notOk(err, 'should have no errors');
  }, generators['1.0.0-hashed-recipient']());

  taskValidateRecipient(function(err, result) {
    t.notOk(err, 'should have no errors');
  }, generators['1.0.0-hashed-recipient']({'assertion.recipient.salt': 'lol'}));

  var data = generators['1.0.0-hashed-recipient']({'assertion.recipient.identity': 'foo@bar.org'});
  taskValidateRecipient(function(err, result) {
    t.ok(err['recipient.identity'].message
      .match(/must be a self-identifying hash/));
  }, data);

  taskValidateRecipient(function(err, result) {
    t.equal(err['recipient.identity'].message, 'must be an email address');
  }, generators['1.0.0-plain-recipient']({'assertion.recipient.identity': 'sha256$abcd'}));

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



