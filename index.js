const urlParse = require('url').parse;
const crypto = require('crypto');
const jws = require('jws');
const util = require('util');
const async = require('async');
const request = require('request');
const dataurl = require('dataurl');
const dateutil = require('dateutil');
const deepEqual = require('deep-equal');
const re = require('./lib/regex');
const resources = require('./lib/resources');
const constants = require('./lib/constants');
const jsonschema = require('jsonschema').Validator;
var jsonld = require('jsonld');
var cache = new jsonld.DocumentCache();
cache.set(constants.VERSIONS['1.1.0'].context_iri, {contextUrl: null, documentUrl: constants.VERSIONS['1.1.0'].context_iri, document: constants.VERSIONS['1.1.0'].context_doc});
// cache.get(url);
// cache.set(url,{contextUrl: null, documentUrl: redirects[i], document: body});
// https://github.com/digitalbazaar/jsonld.js/issues/127

function testValidImage (mime) {
  return constants.VALID_IMAGES.indexOf(mime) !== -1;
}

var sha256 = hashedString.bind(null, 'sha256');

// @FIXME this function is never called in any validation scenario.
function hashedString (algorithm, str) {
  var hash = crypto.createHash(algorithm);
  hash.update(str);
  return hash.digest('hex');
}

// @FIXME this function is never called in any validation scenario.
function doesHashedEmailMatch (hashedEmail, salt, email) {
  if (!salt)
    salt = '';
  var match = hashedEmail.match(re.hash);
  var algorithm = match[1];
  var hash = match[2];

  return hashedString(algorithm, email + salt) == hash;
}

// @FIXME this function is never called in any validation scenario.
function doesRecipientMatch (info, identity) {
  var assertion = info.structures.assertion;
  if (info.version == '0.5.0') {
    if (isHash(assertion.recipient))
      return doesHashedEmailMatch(assertion.recipient, assertion.salt, identity);
    else
      return assertion.recipient == identity;
  } else {
    if (assertion.recipient.type != 'email')
      return false;
    if (assertion.recipient.hashed)
      return doesHashedEmailMatch(assertion.recipient.identity, assertion.recipient.salt, identity);
    return assertion.recipient.identity == identity;
  }
}

function urlToGUID (url) {
  return sha256('hosted:' + url);
}

function hostedAssertionGUID (urlOrAssertion) {
  return sha256('hosted:' + urlOrAssertion);
}

function signedAssertionToGUID (assertion) {
  var urlParts = urlParse(assertion.verify.url);
  var issuerOrigin = urlParts.protocol + '//' + urlParts.host;
  return sha256('signed:' + assertion.uid + ':' + issuerOrigin);
}

function getAssertionGUID (urlOrSignature, callback) {
  if (isUrl(urlOrSignature))
    return callback(null, hostedAssertionGUID(urlOrSignature));
  unpackJWS(urlOrSignature, function (err, payload) {
    if (err) return callback(err);
    var errors = validateAssertionStructure(payload);
    if (errors)
      return callback(makeError('structure', 'invalid assertion structure', {
        assertion: errors
      }));
    return callback(null, signedAssertionToGUID(payload));
  });
}

// IO & transformation
// --------------------

function clone (obj) {
  return JSON.parse(JSON.stringify(obj));
}

function absolutize (assertion) {
  if (!assertion || !isObject(assertion.badge) || !isObject(assertion.badge.issuer))
    return assertion;

  if (!assertion.badge.issuer.origin)
    return false;

  const origin = assertion.badge.issuer.origin;
  const criteria = assertion.badge.criteria;
  const image = assertion.badge.image;
  const evidence = assertion.evidence;

  const result = clone(assertion);
  if (criteria && !isAbsoluteUrl(criteria))
    result.badge.criteria = origin + criteria;
  if (image && !isAbsoluteUrl(image))
    result.badge.image = origin + image;
  if (evidence && !isAbsoluteUrl(evidence))
    result.evidence = origin + evidence;
  return result;
}

function jsonParse (thing) {
  if (isObject(thing))
    return thing;
  try {return JSON.parse(thing); } catch (ex) { return false; }
}

// Top-level validation control flow
// ----------------------------------

// async.auto() tasks
// -------------------
// Auto task callbacks receives two arguments:
// - (1) a callback(err, result) which must be called when finished,
//       passing an error (which can be null) and the result of the function's execution, and
// - (2) a results object, containing the results of the previously executed functions
//       assigned as properties according to the task property name.

// Task: parse
function taskParseInput (next, data) {
  function callback (assertion, version, verificationType) {
    var version = version || parseVersion(assertion);
    if (!version) {
      return next(makeError('assertion', 'does not look like any known specification version.', {data: data}));
    }
    return next(null, {
      version: version,
      type: verificationType,
      scheme: [version, verificationType].join('-'),
      assertion: assertion
    });
  }
  var type = data.raw.type;
  var input = data.raw.input;
  var version = data.raw.version;
  if (isJson(input)) {
    input = JSON.parse(input);
  }
  if (isObject(input)) {
    if (typeof input.verify !== 'undefined' && input.verify.type !== 'undefined' && input.verify.type !== 'hosted' || type === 'signed') {
      return next(makeError('verify-type-mismatch', 'when `verify.type` is "signed", a JWS signature is expected', { input: input }));
    }
    return callback(input, version, 'hosted');
  }
  else if (typeof input === 'string') {
    if (isSignedBadge(input)) {
      if (type === 'hosted') {
        return next(makeError('verify-type-mismatch', 'when `verify.type` is "hosted", a url or assertion object is required, received JWS signature', { input: input }));
      }
      const decoded = jws.decode(input);
      if (!decoded) {
        return next(makeError('jws-decode', 'Unable to decode JWS signature', { input: input }));
      }
      return callback(jsonParse(decoded.payload), version, 'signed');
    }
    if (isUrl(input)) {
      resources.getUrl({url: input, json: true, required: true}, function (ex, result) {
        if (result.error) {
          result.error.field = 'assertion';
          return next(result.error);
        } else {
          var assertion = result.body;
          if (isJson(assertion)) {
            assertion = JSON.parse(assertion);
          }
          if (!isObject(assertion)) {
            return next(makeError('fetch', 'not a valid hosted badge', { parse: parse }));
          }
          if (type === 'signed') {
            next(makeError('verify-type-mismatch', 'when `verify.type` is "signed", a signature string is expected, not the assertion object', { input: input }));
          }
          return callback(assertion, version, 'hosted');
        }
      });
    } else {
      next(makeError('input', 'not a valid signed badge, URL or JSON', { input: input }));
    }
  } else {
    next(makeError('input', 'input must be a string or object', { input: input }));
  }
}

function parseVersion (assertion) {
  if (!isObject(assertion)) {
    return false;
  }
  var version = '1.1.0';
  if (!assertion['@context'] || !assertion.id || !assertion.type) {
    version = '1.0.0';
  }
  if ((isObject(assertion.badge) && isObject(assertion.badge.issuer)) || !assertion.verify) {
    version = '0.5.0';
  }
  return version;
}

// Task: assertion
function taskUnpackAssertion (next, data) {
  if (data.parse.type != 'signed') {
    return next(null, data.parse.assertion);
  }
  unpackJWS(data.raw.input, function (err, payload) {
    if (err) return next(err);
    var errors = validateAssertionStructure(payload, data.parse.version);
    if (errors)
      return next(makeError('structure', 'invalid assertion structure', {
        assertion: errors
      }));
    return next(null, payload);
  });
}

function unpackJWS (signature, callback) {
  const parts = jws.decode(signature);
  if (!parts)
    return callback(makeError('jws-decode'));
  if (/^hs/i.test(parts.header.alg))
    return callback(makeError('jws-algorithm'));
  const payload = jsonParse(parts.payload);
  if (!payload)
    return callback(makeError('jws-payload-parse'));
  payload.header = parts.header;
  return callback(null, payload);
}

// Task: guid
function taskGetGUID (next, data) {
  if (data.parse.version === '0.5.0') {
    if (isUrl(data.parse.input)) {
      return generateGUID(['hosted', data.parse.input]);
    }
    return next(null, null);
  }
  if (typeof data.assertion.verify === 'undefined' || typeof data.assertion.verify.url === 'undefined') {
    return next(makeError('structure', 'Missing verify URL'), {data: data});
  }
  if (!isUrl(data.assertion.verify.url)) {
    return next(makeError('structure', 'Not a valid verify URL'), {data: data});
  }
  return next(null, urlToGUID(data.assertion.verify.url));
}

// Task: badge
function taskGetBadgeClass (next, data) {
  if (data.parse.version === '0.5.0') {
    if (!isObject(data.assertion.badge)) {
      return next(makeError('input', 'expected object', { badge: data.assertion.badge }));
    }
    return next(null, data.assertion.badge);
  } else {
    return taskGetLinkedObject(data.assertion.badge, 'badge', next);
  }
}

function taskGetLinkedObject (url, field, callback) {
  function err (field, error) { error.field = field; return error; }
  resources.getUrl({url: url, json: true, required: true}, function (ex, result) {
    if (result.error)
      return callback(err(field, result.error));
    return callback(null, result.body);
  });
}

// Task: issuer
function taskGetIssuer (next, data) {
  if (data.parse.version === '0.5.0') {
    if (!isObject(data.badge.issuer)) {
      return next(makeError('issuer', 'expected object', { issuer: data.badge.issuer }));
    }
    return next(null, data.badge.issuer);
  } else {
    return taskGetLinkedObject(data.badge.issuer, 'issuer', next);
  }
}

// Task: recipient
function taskValidateRecipient (next, data) {
  if (data.parse.version == '0.5.0') {
    var validityRule = data.assertion.hasOwnProperty('salt') ? isHash : isEmailOrHash;
    var tests = [{
      object: data.assertion,
      required: {recipient: validityRule}
    }];
  } else {
    var recipient = data.assertion.recipient;
    if (recipient.hashed) {
      var tests = [{
        object: recipient,
        prefix: 'recipient',
        required: {identity: isHash},
        optional: {salt: isString}
      }];
    } else {
      if (recipient.type == 'email') {
        var tests = [{
          object: recipient,
          prefix: 'recipient',
          required: {identity: isEmail}
        }];
      }
    }
  }
  var errors = runTests(tests);
  next(errors, true);
}

function runTests (tests) {
  const errs = {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    test.object = test.object || {};
    test.prefix = test.prefix || '';
    test.optional = test.optional || {};
    test.required = test.required || {};
    for (var property in test.required) {
      if (test.required.hasOwnProperty(property)) {
        testRequired(test.object, property, test.required[property], test.prefix);
      }
    }
    for (var property in test.optional) {
      if (test.optional.hasOwnProperty(property)) {
        testOptional(test.object, property, test.optional[property], test.prefix);
      }
    }
  }
  return objectIfKeys(errs);
}

function validateBadgeClass (badge, version, prefix) {
  prefix = prefix || '';
  var tests = [{
    object: badge,
    prefix: prefix,
    required: {name: isString, description: isString, image: isAbsoluteUrlOrDataURI, criteria: isAbsoluteUrl, issuer: isAbsoluteUrl},
    optional: {tags: isArray(isString), alignment: isArray(isValidAlignmentStructure)}
  }];
  if (version == '1.1.0') {
    tests.push({
      object: badge,
      required: {'@context': isContextIRI['1.1.0'], type: isString, id: isAbsoluteUrl}
    });
  }

  return runTests(tests);
}

function validateIssuerOrganization (issuer, version) {
  var tests = [{
    object: issuer,
    required: {name: isString, url: isAbsoluteUrl},
    optional: {description: isString, image: isAbsoluteUrlOrDataURI, email: isEmail, revocationList: isAbsoluteUrl}
  }];
  if (version == '1.1.0') {
    tests.push({
      object: issuer,
      required: {'@context': isContextIRI['1.1.0'], type: isString, id: isAbsoluteUrl}
    });
  }
  return runTests(tests);
}

function validateAssertionStructure (assertion, version) {
  if (version == '0.5.0') {
    assertion.badge = assertion.badge || {};
    assertion.badge.issuer = assertion.badge.issuer || {};
    var tests = [{
      object: assertion,
      required: {recipient: isEmailOrHash, badge: isObject},
      optional: {salt: isString, evidence: isUrl, expires: isDateString, issued_on: isDateString}
    },
      {
        object: assertion.badge,
        prefix: 'badge',
        required: {name: isString, description: isString, image: isUrl, criteria: isUrl, issuer: isObject},
        optional: {version: isVersionString}
      },
      {
        object: assertion.badge.issuer,
        prefix: 'badge.issuer',
        required: {name: isString, origin: isOrigin},
        optional: {contact: isEmail, org: isString}
      }];
  } else {
    assertion.recipient = assertion.recipient || {};
    assertion.verify = assertion.verify || {};
    var tests = [{
      object: assertion,
      required: {uid: isString, issuedOn: isUnixOrISOTime, badge: isAbsoluteUrl},
      optional: {expires: isUnixOrISOTime, evidence: isAbsoluteUrl, image: isAbsoluteUrlOrDataURI}
    },
      {
        object: assertion.recipient,
        prefix: 'recipient',
        required: {type: isIdentityType, identity: isString, hashed: isBoolean},
        optional: {salt: isString}
      },
      {
        object: assertion.verify,
        prefix: 'verify',
        required: {type: isVerifyType, url: isAbsoluteUrl}
      }];
    if (version == '1.1.0') {
      tests.push({
        object: assertion,
        required: {'@context': isContextIRI['1.1.0'], type: isString, id: isAbsoluteUrl}
      });
    }
  }
  return runTests(tests);
}

// Task: objects
function taskValidateStructures (next, data) {
  const errors = {
    assertion: validateAssertionStructure(data.assertion, data.parse.version)
  };
  if (data.parse.version !== '0.5.0') {
    errors.badge = validateBadgeClass(data.badge, data.parse.version, 'badge');
    errors.issuer = validateIssuerOrganization(data.issuer, data.parse.version);
  }
  if (errors.assertion || errors.badge || errors.issuer) {
    return next(makeError('structure', 'invalid assertion structure', removeNulls(errors)));
  }
  return next(null, true);
}

// Task: extensions
function taskVerifyExtensions (next, data) {
  if (data.parse.version == '0.5.0' || data.parse.version == '1.0.0') {
    next(null, 'Extensions not included in ' + data.parse.version + ' specification');
  }
  const extensions = {};
  const tests = [];
  for (var property in data.jsonld_expanded) {
    if (data.jsonld_expanded.hasOwnProperty(property)) {
      if (isExtension(property, data.parse.version)) {
        var compactIri = getCompactIri(property, data.parse.version);
        if (typeof data.assertion[compactIri] !== 'undefined') {
          extensions[compactIri] = data.assertion[compactIri];
          tests.push({
            object: data.assertion[compactIri],
            prefix: compactIri,
            required: {'@context': isAbsoluteUrl, type: isArray(isString)}
          });
        }
      }
    }
  }
  var errors = runTests(tests);
  if (errors) {
    return next(makeError('extensions', 'invalid extension structure', removeNulls(errors)));
  }
  return next(null, extensions);
}

function isExtension (value, version) {
  var iri = getCompactIri(value, version);
  return iri.length > 0;
}

function getCompactIri(absoluteIri, version) {
  const bases = {
    '1.1.0': {
      "https://w3id.org/openbadges#": "obi",
      "https://w3id.org/openbadges/extensions#": "extensions",
      "http://www.w3.org/2001/XMLSchema#": "xsd",
      "http://schema.org/": "schema",
      "https://w3id.org/security#": "sec"
    }
  };
  for (base in bases[version]) {
    if (bases[version].hasOwnProperty(base)) {
      var prefix = bases[version][base];
      if (absoluteIri.substring(0, base.length) == base) {
        return prefix + ':' + absoluteIri.substring(base.length);
      }
    }
  }
  return '';
}

// Task: jsonld_expanded
function taskExpandJsonld (next, data) {
  //return next(null, data.assertion);
  if (data.parse.version == '0.5.0' || data.parse.version == '1.0.0') {
    next(null, 'Extensions not included in ' + data.parse.version + ' specification');
  }
  var jsonld_expanded = {};
  try {
    jsonld.expand(data.assertion, function(err, expanded) {
      if (err === null || typeof err == 'undefined') {
        err = null;
      }
      if (typeof expanded !== 'undefined' && typeof expanded[0] !== 'undefined') {
        expanded = expanded[0];
      }
      else {
        expanded = false;
      }
      return next(err, expanded);
    });
  } catch (e) {
    return next(e, 'Unable to expand linked data.');
  }
}

// Task: extension_properties
function taskExtensionProperties (next, data) {
  var extensions = data.extensions;
  var expanded = data.jsonld_expanded;
  var rval = true;
  var errors = {};
  for (var extension in extensions) {
    if (extensions.hasOwnProperty(extension)) {
      var absoluteIri = getAbsoluteIri(extension, data.parse.version);
      if (typeof data.jsonld_expanded[absoluteIri] == 'undefined') {
        rval = false;
        errors[extension] = absoluteIri;
      }
    }
  }
  errors = objectIfKeys(errors);
  if (errors) {
    return next(makeError('extension_properties', 'Improper extension property name', errors), errors);
  }
  return next(null, rval);
}

function getAbsoluteIri(iri, version) {
  const bases = {
    '1.1.0': {
      "obi": "https://w3id.org/openbadges#",
      "extensions": "https://w3id.org/openbadges/extensions#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "schema": "http://schema.org/",
      "sec": "https://w3id.org/security#"
    }
  };
  for (base in bases[version]) {
    if (bases[version].hasOwnProperty(base)) {
      if (iri.indexOf(':') !== -1) {
        var replace = base + ':';
        if (iri.substring(0, replace.length) == replace) {
          return bases[version][base] + iri.substring(replace.length);
        }
      }
    }
  }
  return '';
}

// Task: resources
function taskCheckResources (next, data) {
  if (data.parse.version == '0.5.0') {
    data.assertion = absolutize(data.assertion);
  }
  var spec = clone(constants.SCHEMES[data.parse.scheme].resources);
  for (var property in data.extensions) {
    if (data.extensions.hasOwnProperty(property)) {
      spec['extensions.' + property + '.@context'] = {
        required: true,
        json: true
      };
    }
  }
  return resources(data, spec, function (err, result) {
    const errMsg = 'could not validate linked resources';
    if (err) {
      return next(makeError('resources', errMsg, err), result);
    }
    return next(null, result);
  });
}

// Task: deep_equal
function taskCheckDeepEqual (next, data) {
  if (data.parse.version === '0.5.0') {
    return next(null, 'Deep equal not required prior to 1.0.0');
  }
  if (data.parse.type == 'signed') {
    return next(null, 'Deep equal not required for signed badges.');
  }
  const hostedAssertion = data.resources['assertion.verify.url'];
  const localAssertion = data.assertion;
  if (!deepEqual(hostedAssertion, localAssertion))
    return next(makeError('deep-equal', 'Remote assertion must match local assertion', {
      local: localAssertion,
      hosted: hostedAssertion
    }));
  return next(null, true);
}

// Task: signature
function taskVerifySignature (next, data) {
  if (data.parse.type != 'signed') {
    return next(null, 'Only required for signed verification');
  }
  var algorithm = data.assertion.header.alg;
  const publicKey = data.resources['assertion.verify.url'];
  if (!jws.verify(data.raw.input, algorithm, publicKey))
    return next(makeError('verify-signature'));
  return next(null, true);
}

// Task: unrevoked
function taskVerifyUnrevoked (next, data) {
  if (data.parse.type != 'signed') {
    return next(null, 'Only required for signed verification');
  }
  const revocationList = data.resources['issuer.revocationList'];
  const assertion = data.assertion;
  const error = checkRevoked(revocationList, assertion);
  if (error)
    return next(error);
  return next(null, true);
}

function checkRevoked (list, assertion) {
  var msg;
  if (!list) return;
  if ( (msg = list[assertion.uid]))
    return makeError('verify-revoked', msg);
}

// Task: extension_schemas
function taskGetExtensionSchemas (next, data) {
  if (data.parse.version == '0.5.0' || data.parse.version == '1.0.0') {
    next(null, 'Extensions not included in ' + data.parse.version + ' specification');
  }
  var errType = 'ExtensionSchema';
  var structure = {};
  var spec = {};
  for (var property in data.resources) {
    if (data.resources.hasOwnProperty(property)) {
      var extensionName = extractExtensionName(property);
      if (extensionName) {
        var schemaUrl = extractSchemaUrl(data, extensionName);
        if (!isAbsoluteUrl(schemaUrl)) {
          return next(makeError(errType, extensionName + ' missing valid schema URL'), data.resources[property]);
        }
        structure[extensionName] = schemaUrl;
        spec[extensionName] = {
          required: true,
          json: true
        };
      }
    }
  }
  return resources(structure, spec, function (err, result) {
    const errMsg = 'could not validate linked extension schema';
    if (err) {
      return next(makeError(errType, errMsg, err), result);
    }
    return next(null, result);
  });
}

function extractExtensionName (property) {
  var found = property.match(/extensions\.([\w:]+?)\.@context/);
  if (found === null || !isString(found[1]) || found[1].length == 0)
    return false;
  return found[1];
}

function extractSchemaUrl (data, extensionName) {
  const a = 'extensions.' + extensionName + '.@context';
  const b = 'obi:validation';
  const c = 'obi:validationSchema';
  if (typeof data.resources[a][b][0][c] !== 'undefined') {
    return data.resources[a][b][0][c];
  }
  return false;
}

// Task: validate_extensions
function taskValidateExtensions (next, data) {
  if (data.parse.version == '0.5.0' || data.parse.version == '1.0.0') {
    next(null, 'Extensions not included in ' + data.parse.version + ' specification');
  }
  var validate_extensions = {};
  var errors = {};
  for (var extensionName in data.extensions) {
    if (data.extensions.hasOwnProperty(extensionName)) {
      if (!data.extension_schemas.hasOwnProperty(extensionName)) {
        next(makeError('Extension', extensionName + ' missing schema', data.extension_schemas));
      } else {
        var extension = data.extensions[extensionName];
        var schema = data.extension_schemas[extensionName];
        var v = new jsonschema();
        validate_extensions[extensionName] = v.validate(extension, schema);
        if (validate_extensions[extensionName].errors.length) {
          errors[extensionName] = validate_extensions[extensionName].errors;
        }
      }
    }
  }
  errors = objectIfKeys(errors);
  if (errors) {
    return next(makeError('extensions', 'invalid extension structure', errors), errors);
  }
  return next(null, validate_extensions);
}

// Only params callback and input required.
function fullValidateBadgeAssertion (callback, input, version, verificationType) {
  async.auto({
    // Store raw input values for ;ater comparison.
    raw: function (next) { next(null, {input: input, version: version, type: verificationType}); },
    // Fetch assertion if input is URL, determine version and verify type (hosted or signed).
    parse: ['raw', function (next, data) {
      taskParseInput(next, data);
    }],
    // Move assertion to `data.assertion`, unpack signed assertion.
    assertion: ['parse', function (next, data) {
      taskUnpackAssertion(next, data);
    }],
    // Generate GUID for assertion.
    guid: ['assertion', function (next, data) {
      taskGetGUID(next, data);
    }],
    // Fetch remote value or assign local value to `data.badge` and `data.issuer`.
    badge: ['assertion', function (next, data) {
      taskGetBadgeClass(next, data);
    }],
    jsonld_expanded: ['assertion', function (next, data) {
      taskExpandJsonld(next, data);
    }],
    issuer: ['badge', function (next, data) {
      taskGetIssuer(next, data);
    }],
    // Verify recipient hashed correctly or is a well-formed email address.
    recipient: ['issuer', function (next, data) {
      taskValidateRecipient(next, data);
    }],
    // Apply validation rules to assertion, badgeclass and issuer.
    objects: ['issuer', function (next, data) {
      taskValidateStructures(next, data);
    }],
    extensions: ['jsonld_expanded', function (next, data) {
      taskVerifyExtensions(next, data);
    }],
    // Fetch and verify remote resources: images, evidence, criteria & revocationList.
    resources: ['extensions', 'issuer', function (next, data) {
      taskCheckResources(next, data);
    }],
    extension_properties: ['extensions', function (next, data) {
      taskExtensionProperties(next, data);
    }],
    // Hosted only: Verify hosted and local assertion match exactly.
    deep_equal: ['resources', function (next, data) {
      taskCheckDeepEqual(next, data);
    }],
    // Signed only: Verify JWS signature.
    signature: ['resources', function (next, data) {
      taskVerifySignature(next, data);
    }],
    // Signed only: Verify hosted and local assertion match exactly.
    unrevoked: ['resources', function (next, data) {
      taskVerifyUnrevoked(next, data);
    }],
    extension_schemas: ['resources', function (next, data) {
      taskGetExtensionSchemas(next, data);
    }],
    // Validate extensions based on fetched extension schemas.
    validate_extensions: ['extension_schemas', function (next, data) {
      taskValidateExtensions(next, data);
    }]
  }, callback);
}

function validate (input, callback, version, verificationType) {
  return fullValidateBadgeAssertion(callback, input, version, verificationType);
}

function isJson (str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function isSignedBadge (thing) {
  const decoded = jws.decode(thing);
  if (!decoded)
    return false;
  const assertion = jsonParse(decoded.payload);
  if (!assertion)
    return false;
  if (!assertion.recipient)
    return false;
  return true;
}

function makeError (code, message, extra) {
  if (isObject(message))
    extra = message, message = null;
  const err = new Error(message || code);
  err.code = code;
  if (extra)
    err.extra = extra;
  Object.defineProperty(err, 'message', { enumerable: true });
  Object.defineProperty(err, 'stack', { enumerable: false });
  return err;
}

function makeValidator (opts) {
  opts.fn.message = opts.message;
  return opts.fn;
}

function pass () {
  return true;
}

function hasKeys (obj) {
  return Object.keys(obj).length > 0;
}

function removeNulls (obj) {
  Object.keys(obj).forEach(function (key) {
    if (!obj[key] || !hasKeys(obj[key]))
      delete obj[key];
  });
  return obj;
}

function objectIfKeys (obj) {
  return hasKeys(obj) ? obj : null;
}

function regexToValidator (format, message) {
  return makeValidator({
    message: message,
    fn: function (thing) {
      return format.test(thing);
    }
  });
}

function stringToValidator (compare) {
  return makeValidator({
    message: 'must equal "' + compare + '"',
    fn: function (thing) {
      return typeof thing === 'string' && thing === compare;
    }
  });
}

function getInternalClass (thing) {
  return Object.prototype.toString.call(thing);
}

// Validation functions
// --------------------

const isUrl = regexToValidator(re.url, 'must be a URL');
const isAbsoluteUrl = regexToValidator(re.absoluteUrl, 'must be an absolute URL');
const isEmail = regexToValidator(re.email, 'must be an email address');
const isOrigin = regexToValidator(re.origin, 'must be a valid origin (scheme, hostname and optional port)');
const isVersionString = regexToValidator(re.version, 'must be a string in the format x.y.z');
const isDateString = regexToValidator(re.date, 'must be a unix timestamp or string in the format YYYY-MM-DD');
const isIdentityType = regexToValidator(re.identityType, 'must be the string "email"');
const isVerifyType = regexToValidator(re.verificationType, 'must be either "hosted" or "signed"');
const isUnixTime = regexToValidator(re.unixtime, 'must be a valid unix timestamp');
const isContextIRI = {
  '1.1.0': stringToValidator(constants.VERSIONS['1.1.0'].context_iri),
};
const isEmailOrHash = makeValidator({
  message: 'must be an email address or a self-identifying hash string (e.g., "sha256$abcdef123456789")',
  fn: function isEmailOrHash (thing) {
    if (typeof (thing) != 'string') return false;
    return (isEmail(thing) || isHash(thing));
  }
});
const isHash = makeValidator({
  message: 'must be a self-identifying hash string ' +
    '(e.g., "sha256$abcdef123456789") with a supported hash ' +
    'algorithm (' + constants.VALID_HASHES.join(',') + ')',
  fn: function isHash (thing) {
    if (typeof (thing) != 'string') return false;
    var match = thing.match(re.hash);
    if (!match) return false;
    if (constants.VALID_HASHES.indexOf(match[1]) == -1) return false;
    return true;
  }
});
const isObject = makeValidator({
  message: 'must be an object',
  fn: function isObject (thing) {
    return getInternalClass(thing) == '[object Object]';
  }
});
const isString = makeValidator({
  message: 'must be a string',
  fn: function isString (thing) {
    return typeof thing === 'string';
  }
});
const isArray = makeValidator({
  message: 'must be an array',
  fn: function isArray (validator) {
    validator = validator || pass;
    return function (thing) {
      if (!Array.isArray(thing))
        return false;
      return thing.every(validator);
    };
  }
});
const isBoolean = makeValidator({
  message: 'must be a boolean',
  fn: function isBoolean (thing) {
    return (
    typeof thing === 'boolean'
    || /false/i.test(thing)
    || /true/i.test(thing)
    );
  }
});
const isUnixOrISOTime = makeValidator({
  message: 'must be a unix timestamp or ISO8601 date string',
  fn: function isUnixOrISOTime (thing) {
    if (re.unixtime.test(thing))
      return true;
    try {
      const type = dateutil.parse(thing).type;
      return type !== 'unknown_date';
    } catch (e) {
      return false;
    }
  }
});
const isAbsoluteUrlOrDataURI = makeValidator({
  message: 'must be an absolute URL or a dataURL',
  fn: function isAbsoluteUrlOrDataURI (thing) {
    if (isAbsoluteUrl(thing))
      return true;
    const image = dataurl.parse(thing);
    if (image && testValidImage(image.mimetype))
      return true;
    return false;
  }
});
const isValidAlignmentStructure = makeValidator({
  message: 'must be an array of valid alignment structures (with required `name` and `url` properties and an optional `description` property)',
  fn: function isValidAlignmentStructure (thing) {
    if (!isObject(thing))
      return false;
    if (!isString(thing.name))
      return false;
    if (thing.description && !isString(thing.description))
      return false;
    if (!isAbsoluteUrl(thing.url))
      return false;
    return true;
  }
});

function makeRequiredValidator (errors) {
  errors = errors || {};
  return function required (object, property, test, prefix) {
    prefix = prefix || '';
    if (!object.hasOwnProperty(property)) {
      errors[(prefix.length ? (prefix + '.') : '') + field] = makeError(property, 'missing required value');
      return false;
    }
    const value = object[property];
    var errObj = {field: property};
    const message = errObj.message || test.message;
    const field = errObj.field;
    const code = errObj.code || test.code;
    if (typeof value === 'undefined' || value === null || !test(value)) {
      errors[(prefix.length ? (prefix + '.') : '') + field] = makeError(code, message);
      return false;
    }
    return true;
  };
}

function makeOptionalValidator (errors) {
  errors = errors || {};
  return function required (object, property, test, prefix) {
    if (!object.hasOwnProperty(property) || !object[property]) {
      return true;
    }
    const value = object[property];
    var errObj = {field: property};
    const message = errObj.message || test.message;
    const field = errObj.field;
    const code = errObj.code || test.code;
    if (!test(value)) {
      errors[(prefix.length ? (prefix + '.') : '') + field] = makeError(code, message);
      return false;
    }
    return true;
  };
}

module.exports = validate;

validate.sha256 = sha256;
validate.parseVersion = parseVersion;
validate.absolutize = absolutize;
validate.assertion = validateAssertionStructure;
validate.badgeClass = validateBadgeClass;
validate.issuerOrganization = validateIssuerOrganization;
validate.isSignedBadge = isSignedBadge;
validate.checkRevoked = checkRevoked;
validate.unpackJWS = unpackJWS;
validate.taskCheckResources = taskCheckResources;
validate.getAssertionGUID = getAssertionGUID;
validate.doesRecipientMatch = doesRecipientMatch;
validate.doesHashedEmailMatch = doesHashedEmailMatch;
validate.VALID_HASHES = constants.VALID_HASHES;
validate.taskValidateRecipient = taskValidateRecipient;
