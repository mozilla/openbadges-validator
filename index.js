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

const VALID_HASHES = ['sha1', 'sha256', 'sha512', 'md5'];
const VALID_IMAGES = [
  'image/png',
  'image/svg',
  'image/svg+xml'
]

function testValidImage(mime) {
  return VALID_IMAGES.indexOf(mime) !== -1
}

var sha256 = hashedString.bind(null, 'sha256');

function hashedString(algorithm, str) {
  var hash = crypto.createHash(algorithm);
  hash.update(str);
  return hash.digest('hex');
}

function doesHashedEmailMatch(hashedEmail, salt, email) {
  if (!salt)
    salt = '';
  var match = hashedEmail.match(re.hash);
  var algorithm = match[1];
  var hash = match[2];

  return hashedString(algorithm, email + salt) == hash;
}

function doesRecipientMatch(info, identity) {
  var assertion = info.structures.assertion;
  if (info.version == "0.5.0") {
    if (isHash(assertion.recipient))
      return doesHashedEmailMatch(assertion.recipient, assertion.salt,
                                  identity);
    else
      return assertion.recipient == identity;
  } else {
    if (assertion.recipient.type != "email")
      return false;
    if (assertion.recipient.hashed)
      return doesHashedEmailMatch(assertion.recipient.identity,
                                  assertion.recipient.salt,
                                  identity);
    return assertion.recipient.identity == identity;
  }
}

function hostedAssertionGUID(urlOrAssertion) {
  if (typeof(urlOrAssertion) != "string")
    urlOrAssertion = urlOrAssertion.verify.url;
  return sha256('hosted:' + urlOrAssertion);
}

function signedAssertionGUID(assertion) {
  var urlParts = urlParse(assertion.verify.url);
  var issuerOrigin = urlParts.protocol + '//' + urlParts.host;
  return sha256('signed:' + assertion.uid + ':' + issuerOrigin);
}

function getAssertionGUID(urlOrSignature, callback) {
  if (isUrl(urlOrSignature))
    return callback(null, hostedAssertionGUID(urlOrSignature));
  unpackJWS(urlOrSignature, function(err, payload) {
    if (err) return callback(err);
    var errors = validateAssertion(payload);
    if (errors)
      return callback(makeError('structure', 'invalid assertion structure', {
        assertion: errors
      }));
    return callback(null, signedAssertionGUID(payload));
  });
}

function isOldAssertion(assertion) {
  if (!assertion)
    return null;
  if (!isObject(assertion.badge))
    return false;
  if (!isObject(assertion.badge.issuer))
    return false;
  return true;
}

function validateAssertion(assertion, prefix){
  if (isOldAssertion(assertion))
    return validateOldAssertion(assertion);
  return validateBadgeAssertion(assertion);
}

function validateBadgeAssertion(assertion, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = {};
  const recipient = assertion.recipient || {};
  const verify = assertion.verify || {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  // only test the internals of the `recipient` property if it's
  // actually an object.
  if (testRequired(assertion.recipient, isObject, {field: p('recipient')})) {
    testRequired(recipient.type, isIdentityType, {field: p('recipient.type')});
    testRequired(recipient.identity, isString, {field: p('recipient.identity')});
    testRequired(recipient.hashed, isBoolean, {field: p('recipient.hashed')});
    testOptional(recipient.salt, isString, {field: p('recipient.salt')});
  }

  // only test the internal properties of the `verify` property if it's
  // actually an object.
  if (testRequired(assertion.verify, isObject, {field: p('verify')})) {
    testRequired(verify.type, isVerifyType, {field: p('verify.type')});
    testRequired(verify.url, isAbsoluteUrl, {field: p('verify.url')});
  }

  testRequired(assertion.uid, isString, {field: p('uid')});
  testRequired(assertion.badge, isAbsoluteUrl, {field: p('badge')});
  testRequired(assertion.issuedOn, isUnixOrISOTime, {field: p('issuedOn')});
  testOptional(assertion.expires, isUnixOrISOTime, {field: p('expires')});
  testOptional(assertion.evidence, isAbsoluteUrl, {field: p('evidence')});
  testOptional(assertion.image, isAbsoluteUrlOrDataURI, {field: p('image')});
  return objectIfKeys(errs);
}

function validateBadgeClass(badge, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(badge.name, isString, {field: p('name')});
  testRequired(badge.description, isString, {field: p('description')});
  testRequired(badge.image, isAbsoluteUrlOrDataURI, {field: p('image')});
  testRequired(badge.criteria, isAbsoluteUrl, {field: p('criteria')});
  testRequired(badge.issuer, isAbsoluteUrl, {field: p('issuer')});
  testOptional(badge.tags, isArray(isString), {
    field: p('tags'),
    message: 'must be an array of strings'
  });
  testOptional(badge.alignment, isArray(isValidAlignmentStructure), {
    field: p('alignment'),
    message: 'must be an array of valid alignment structures (with required `name` and `url` properties and an optional `description` property)'
  });

  return objectIfKeys(errs);
}

function validateIssuerOrganization(issuer, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(issuer.name, isString, {field: p('name')});
  testRequired(issuer.url, isAbsoluteUrl, {field: p('url')});
  testOptional(issuer.description, isString, {field: p('description')});
  testOptional(issuer.image, isAbsoluteUrlOrDataURI, {field: p('image')});
  testOptional(issuer.email, isEmail, {field: p('email')});
  testOptional(issuer.revocationList, isAbsoluteUrl, {field: p('revocationList')});

  return objectIfKeys(errs);
};

function validateOldAssertion(assertion, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = {};
  const badge = assertion.badge || {};
  const issuer = badge.issuer || {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(assertion.recipient, isEmailOrHash, {field: p('recipient')});
  testOptional(assertion.salt, isString, {field: p('salt')});
  testOptional(assertion.evidence, isUrl, {field: p('evidence')});
  testOptional(assertion.expires, isDateString, {field: p('expires')});
  testOptional(assertion.issued_on, isDateString, {field: p('issued_on')});

  if (!testRequired(assertion.badge, isObject, {field: p('badge')}))
    return objectIfKeys(errs);

  testOptional(badge.version, isVersionString, {field: p('badge.version')});
  testRequired(badge.name, isString, {field: p('badge.name')});
  testRequired(badge.description, isString, {field: p('badge.description')});
  testRequired(badge.image, isUrl, {field: p('badge.image')});
  testRequired(badge.criteria, isUrl, {field: p('badge.criteria')});

  if (!testRequired(badge.issuer, isObject, {field: p('badge.issuer')}))
    return objectIfKeys(errs);

  testRequired(issuer.name, isString, {field: p('badge.issuer.name')});
  testRequired(issuer.origin, isOrigin, {field: p('badge.issuer.origin')});
  testOptional(issuer.contact, isEmail, {field: p('badge.issuer.contact')});
  testOptional(issuer.org, isString, {field: p('badge.issuer.org')});

  return objectIfKeys(errs);
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function absolutize(assertion) {
  if (!isOldAssertion(assertion))
    return assertion;

  if (!assertion
      || !assertion.badge
      || !assertion.badge.issuer
      || !assertion.badge.issuer.origin)
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

function jsonParse(thing) {
  if (isObject(thing))
    return thing;
  try {return JSON.parse(thing) }
  catch (ex) { return false }
}

// callback has signature `function (err, structures) { }`
function getLinkedStructures(assertion, callback) {
  function err(field, error) { error.field = field; return error }
  function getStructure(url, field, callback) {
    const options = {url: url, json: true, required: true};
    resources.getUrl(options, function (ex, result) {
      if (result.error)
        return callback(err(field, result.error));
      structures[field] = result.body;
      return callback();
    });
  }
  const structures = {
    assertion: assertion,
    badge: null,
    issuer: null,
  };
  async.waterfall([
    function getLinkedBadge(callback) {
      getStructure(structures.assertion.badge, 'badge', callback);
    },
    function getLinkedIssuer(callback) {
      getStructure(structures.badge.issuer, 'issuer', callback);
    }
  ], function (err) {
    return callback(err, structures);
  });
}

// `structures` should be the response from `getLinkedStructures`,
// OR a valid old-style assertion
// callback has signature `function (errs, responses)`
function getLinkedResources(structures, callback) {
  function hollaback(err, result) {
    const errMsg = 'could not validate linked resources';
    if (err)
      return callback(makeError('resources', errMsg, err));
    return callback(null, result);
  }
  if (isOldAssertion(structures)) {
    const assertion = absolutize(structures);
    return resources({
      assertion: assertion,
      badge: assertion.badge,
      issuer: assertion.issuer
    }, {
      'badge.image': {
        required: true,
        'content-type': VALID_IMAGES,
      },
    }, hollaback);
  }
  return resources(structures, {
    'assertion.image': {
      required: false,
      'content-type': VALID_IMAGES,
    },
    'assertion.verify.url': {
      required: true,
      json: structures.assertion.verify.type === 'hosted'
    },
    'badge.image': {
      required: true,
      'content-type': VALID_IMAGES
    },
    'issuer.image': { required: false },
    'issuer.revocationList': {
      required: false,
      json: true
    }
  }, hollaback);
}

function validateHosted(input, callback, originalUrl) {
  if (!isObject(input))
    return callback(makeError('input', 'input must be an object', { input: input }));
  if (isOldAssertion(input))
    return fullValidateOldAssertion(input, callback, originalUrl)
  if (!input.verify)
    return callback(makeError('input', 'missing `verify` structure', { input: input }));
  if (input.verify.type === 'signed')
    return callback(makeError('verify-type-mismatch', 'when `verify.type` is "signed", a signature string is expected, not the assertion object', { input: input }));
  return fullValidateBadgeAssertion(input, callback);
}

function validateHostedUrl(input, callback) {
  if (!isUrl(input))
    return callback(makeError('input', 'not a valid url', { input: input }));
  const options = {url: input, json: true, required: true};
  return resources.getUrl(options, function(ex, result) {
    if (result.error) {
      result.error.field = 'assertion';
      return callback(result.error);
    }
    return validate.validateHosted(result.body, callback, input);
  });
}

function validateSigned(input, callback) {
  if (typeof input !== 'string')
    return callback(makeError('input', 'input must be a string', { input: input }));
  if (isSignedBadge(input))
    return fullValidateSignedAssertion(input, callback);
  return callback(makeError('input', 'not a valid signed badge', { input: input }));
}

function validate(input, callback) {
  const errs = [];
  if (isObject(input)) {
    return validate.validateHosted(input, callback);
  }
  if (typeof input === 'string') {
    if (isSignedBadge(input))
      return validate.validateSigned(input, callback);
    if (isUrl(input))
      return validate.validateHostedUrl(input, callback);
    return callback(makeError('input', 'not a valid signed badge or url', { input: input }));
  }
  return callback(makeError('input', 'input must be a string or object', { input: input }));
}

function validateStructures(structures, callback) {
  const errMsg = 'invalid assertion structure';
  const errors = {
    assertion: validateAssertion(structures.assertion),
    badge: validateBadgeClass(structures.badge),
    issuer: validateIssuerOrganization(structures.issuer),
  }
  if (errors.assertion || errors.badge || errors.issuer)
    return callback(makeError('structure', errMsg, removeNulls(errors)));
  return callback(null, structures);
}

function unpackJWS(signature, callback) {
  const parts = jws.decode(signature);
  if (!parts)
    return callback(makeError('jws-decode'));
  if (/^hs/i.test(parts.header.alg))
    return callback(makeError('jws-algorithm'));
  const payload = jsonParse(parts.payload);
  if (!payload)
    return callback(makeError('jws-payload-parse'));
  return callback(null, payload)
}


function checkRevoked(list, assertion) {
  var msg;
  if (!list) return;
  if ((msg = list[assertion.uid]))
    return makeError('verify-revoked', msg);
}

function fullValidateOldAssertion(assertion, callback, originalUrl) {
  const structuralErrors = validateAssertion(assertion);
  if (structuralErrors)
    return callback(makeError('structure', structuralErrors));
  getLinkedResources(assertion, function (err, resources) {
    if (err)
      return callback(err);
    return validateOldInterdependentFields({
      version: '0.5.0',
      guid: originalUrl ? hostedAssertionGUID(originalUrl) : null,
      structures: {
        assertion: assertion,
        badge: assertion.badge,
        issuer: assertion.badge.issuer
      },
      resources: resources
    }, callback);
  });
}

function fullValidateBadgeAssertion(assertion, callback) {
  const data = {version: '1.0.0', guid: hostedAssertionGUID(assertion)};
  async.waterfall([
    getLinkedStructures.bind(null, assertion),
    validateStructures,
    function getResources(structures, callback) {
      data.structures = structures;
      return getLinkedResources(structures, callback);
    },
    function validateHosted(resources, callback) {
      data.resources = resources;
      const hostedAssertion = resources['assertion.verify.url'];
      const localAssertion = data.structures.assertion;
      if (!deepEqual(hostedAssertion, localAssertion))
        return callback(makeError('verify-hosted', 'Remote assertion must match local assertion', {
          local: localAssertion,
          hosted: hostedAssertion
        }));
      return callback(null, data)
    },
    validateInterdependentFields
  ], function (errs) {
    callback(errs, data);
  });
};

function fullValidateSignedAssertion(signature, callback) {
  const data = {version: '1.0.0', signature: signature};
  async.waterfall([
    unpackJWS.bind(null, signature),
    getLinkedStructures,
    validateStructures,
    function getResources(structures, callback) {
      data.guid = signedAssertionGUID(structures.assertion);
      data.structures = structures;
      return getLinkedResources(structures, callback);
    },
    function verifySignature(resources, callback) {
      data.resources = resources;
      const publicKey = resources['assertion.verify.url'];
      if (!jws.verify(signature, publicKey))
        return callback(makeError('verify-signature'))
      return callback(null, resources);
    },
    function verifyUnrevoked(resources, callback) {
      const revocationList = resources['issuer.revocationList'];
      const assertion = data.structures.assertion;
      const error = checkRevoked(revocationList, assertion);
      if (error)
        return callback(error);
      return callback(null, data);
    },
    validateInterdependentFields
  ],function (errs) {
    return callback(errs, data);
  })
}

function isSignedBadge(thing) {
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

function makeError(code, message, extra) {
  if (isObject(message))
    extra = message, message = null;
  const err = new Error(message||code);
  err.code = code;
  if (extra)
    err.extra = extra;
  Object.defineProperty(err, 'message', { enumerable: true });
  Object.defineProperty(err, 'stack', { enumerable: false });
  return err;
}

function makeValidator(opts) {
  opts.fn.message = opts.message;
  return opts.fn;
}

function pass() {
  return true;
}

function hasKeys(obj) {
  return Object.keys(obj).length > 0
}

function removeNulls(obj) {
  Object.keys(obj).forEach(function (key) {
    if (!obj[key] || !hasKeys(obj[key]))
      delete obj[key];
  });
  return obj;
}

function objectIfKeys(obj) {
  return hasKeys(obj) ? obj : null;
}

function regexToValidator(format, message) {
  return makeValidator({
    message: message,
    fn: function (thing) {
      return format.test(thing);
    }
  });
}

function getInternalClass(thing) {
  return Object.prototype.toString.call(thing);
}

const isUrl = regexToValidator(re.url, 'must be a URL');
const isAbsoluteUrl = regexToValidator(re.absoluteUrl, 'must be an absolute URL');
const isEmail = regexToValidator(re.email, 'must be an email address');
const isOrigin = regexToValidator(re.origin, 'must be a valid origin (scheme, hostname and optional port)');
const isVersionString = regexToValidator(re.version, 'must be a string in the format x.y.z');
const isDateString = regexToValidator(re.date, 'must be a unix timestamp or string in the format YYYY-MM-DD');
const isIdentityType = regexToValidator(re.identityType, 'must be the string "email"');
const isVerifyType = regexToValidator(re.verifyType, 'must be either "hosted" or "signed"');
const isUnixTime = regexToValidator(re.unixtime, 'must be a valid unix timestamp');
const isEmailOrHash = makeValidator({
  message: 'must be an email address or a self-identifying hash string (e.g., "sha256$abcdef123456789")',
  fn: function isEmailOrHash(thing) {
    if (typeof(thing) != 'string') return false;
    return (isEmail(thing) || isHash(thing));
  }
});
const isHash = makeValidator({
  message: 'must be a self-identifying hash string ' +
           '(e.g., "sha256$abcdef123456789") with a supported hash ' +
           'algorithm (' + VALID_HASHES.join(',') + ')',
  fn: function isHash(thing) {
    if (typeof(thing) != 'string') return false;
    var match = thing.match(re.hash);
    if (!match) return false;
    if (VALID_HASHES.indexOf(match[1]) == -1) return false;
    return true;
  }
});
const isObject = makeValidator({
  message: 'must be an object',
  fn: function isObject(thing) {
    return getInternalClass(thing) == '[object Object]';
  }
});
const isString = makeValidator({
  message: 'must be a string',
  fn: function isString(thing) {
    return typeof thing === 'string'
  }
});
const isArray = makeValidator({
  message: 'must be an array',
  fn: function isArray(validator) {
    validator = validator || pass;
    return function (thing) {
      if (!Array.isArray(thing))
        return false;
      return thing.every(validator);
    }
  }
});
const isBoolean = makeValidator({
  message: 'must be a boolean',
  fn: function isBoolean(thing) {
    return (
      typeof thing === 'boolean'
        || /false/i.test(thing)
        || /true/i.test(thing)
    )
  }
});
const isUnixOrISOTime = makeValidator({
  message: 'must be a unix timestamp or ISO8601 date string',
  fn: function isUnixOrISOTime(thing) {
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
  fn: function isAbsoluteUrlOrDataURI(thing) {
    if (isAbsoluteUrl(thing))
      return true;
    const image = dataurl.parse(thing);
    if (image && testValidImage(image.mimetype))
      return true;
    return false
  }
});
const isValidAlignmentStructure = makeValidator({
  message: 'must be an array of valid alignment structures (with required `name` and `url` properties and an optional `description` property)',
  fn: function isValidAlignmentStructure(thing) {
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

function makeOptionalValidator(errors) {
  errors = errors || {};
  return function optional(value, test, errObj) {
    const message = errObj.message || test.message;
    const field = errObj.field;
    const code = errObj.code || test.code;
    if (!value) return true;
    if (!test(value)) {
      errors[field] = makeError(code, message);
      return false;
    }
    return true;
  }
}

function makeRequiredValidator(errors) {
  errors = errors || {};
  return function required(value, test, errObj) {
    const message = errObj.message || test.message;
    const field = errObj.field;
    const code = errObj.code || test.code;
    if (typeof value === 'undefined'
        || value === null
        || !test(value)) {
      errors[field] = makeError(code, message);
      return false;
    }
    return true;
  }
}

function validateOldInterdependentFields(info, cb) {
  var assertion = info.structures.assertion;

  const errs = {};
  const testRequired = makeRequiredValidator(errs);

  testRequired(assertion.recipient,
               assertion.hasOwnProperty('salt') ? isHash : isEmailOrHash, {field: 'recipient'});

  cb(objectIfKeys(errs), info);
}

function validateInterdependentFields(info, cb) {
  var recipient = info.structures.assertion.recipient;

  const errs = {};
  const testRequired = makeRequiredValidator(errs);
  const testOptional = makeOptionalValidator(errs);

  if (recipient.hashed) {
    testRequired(recipient.identity, isHash, {field: 'recipient.identity'});
    testOptional(recipient.salt, isString, {field: 'recipient.salt'});
  } else {
    if (recipient.type == "email") {
      testRequired(recipient.identity, isEmail, {field: 'recipient.identity'});
    }
  }

  cb(objectIfKeys(errs), info);
}

module.exports = validate;

validate.sha256 = sha256;
validate.validateHosted = validateHosted;
validate.validateHostedUrl = validateHostedUrl;
validate.validateSigned = validateSigned;
validate.isOldAssertion = isOldAssertion;
validate.absolutize = absolutize;
validate.assertion = validateAssertion;
validate.badgeClass = validateBadgeClass;
validate.issuerOrganization = validateIssuerOrganization;
validate.isSignedBadge = isSignedBadge
validate.getLinkedStructures = getLinkedStructures;
validate.checkRevoked = checkRevoked;
validate.unpackJWS = unpackJWS;
validate.getLinkedResources = getLinkedResources;
validate.getAssertionGUID = getAssertionGUID;
validate.doesRecipientMatch = doesRecipientMatch;
validate.doesHashedEmailMatch = doesHashedEmailMatch;
validate.VALID_HASHES = VALID_HASHES;
validate.validateOldInterdependentFields = validateOldInterdependentFields;
validate.validateInterdependentFields = validateInterdependentFields;
