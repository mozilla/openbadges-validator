const jws = require('jws');
const util = require('util');
const async = require('async');
const request = require('request');
const dataurl = require('dataurl');
const dateutil = require('dateutil');
const resources = require('./lib/resources');

function makeError(code, message) {
  const err = new Error(message||code);
  err.code = code;
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

const re = {
  url: /(^(https?):\/\/[^\s\/$.?#].[^\s]*$)|(^\/\S+$)/,
  absoluteUrl: /^https?:\/\/[^\s\/$.?#].[^\s]*$/,
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/,
  origin: /^(https?):\/\/[^\s\/$.?#].[^\s\/]*\/?$/,
  version: /^v?\d+\.\d+(\.\d+)?$/,
  date: /(^\d{4}-\d{2}-\d{2}$)|(^\d{1,10}$)/,
  emailOrHash: /([a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?)|((sha1|sha256|sha512|md5)\$[a-fA-F0-9]+)/,
  identityType: /^(email)$/i,
  verifyType: /^(hosted)|(signed)$/i,
  unixtime: /^1\d{9}$/,
}

const isUrl = regexToValidator(re.url, 'must be a URL');
const isAbsoluteUrl = regexToValidator(re.absoluteUrl, 'must be an absolute URL');
const isEmail = regexToValidator(re.email, 'must be an email address');
const isOrigin = regexToValidator(re.origin, 'must be a valid origin (scheme, hostname and optional port)');
const isVersionString = regexToValidator(re.version, 'must be a string in the format x.y.z');
const isDateString = regexToValidator(re.date, 'must be a unix timestamp or string in the format YYYY-MM-DD');
const isEmailOrHash = regexToValidator(re.emailOrHash, 'must be an email address or a self-identifying hash string (e.g., "sha256$abcdef123456789")');
const isIdentityType = regexToValidator(re.identityType, 'must be the string "email"');
const isVerifyType = regexToValidator(re.verifyType, 'must be either "hosted" or "signed"');
const isUnixTime = regexToValidator(re.unixtime, 'must be a valid unix timestamp');
const isObject = makeValidator({
  message: 'must be an object',
  fn: function isObject(thing) {
    return (
      thing
        && typeof thing === 'object'
        && !Array.isArray(thing)
    )
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
    if (image && image.mimetype === 'image/png')
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

function isOldAssertion(assertion) {
  return isObject(assertion.badge);
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
  testRequired(issuer.contact, isEmail, {field: p('badge.issuer.contact')});
  testRequired(issuer.origin, isOrigin, {field: p('badge.issuer.origin')});
  testOptional(issuer.org, isString, {field: p('badge.issuer.org')});

  return objectIfKeys(errs);
};

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

  assertion.badge.criteria = origin + criteria;
  assertion.badge.image = origin + image;
  if (evidence)
    assertion.evidence = origin + evidence;
  return assertion;
}

function jsonParse(thing) {
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
validate.getLinkedStructures = getLinkedStructures;

// `structures` should be the response from `getLinkedStructures`
// callback has signature `function (errs, responses)`
function getLinkedResources(structures, callback) {
  resources(structures, {
    'assertion.image': {
      required: false,
      'content-type': 'image/png'
    },
    'assertion.verify.url': {
      required: true,
      json: structures.assertion.verify.type === 'hosted'
    },
    'assertion.evidence': { required: false },
    'badge.criteria': { required: true },
    'badge.image': {
      required: true,
      'content-type': 'image/png'
    },
    'issuer.url': { required: true },
    'issuer.image': { required: false },
    'issuer.revocationList': { required: true, json: true }
  }, callback);
}
validate.getLinkedResources = getLinkedResources;

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
validate.unpackJWS = unpackJWS;


function validate(input, callback) {
  const errs = [];
  if (jws.isValid(input))
    return fullValidateSignedAssertion(input, callback);
  return callback(errs.length ? errs : null);
}

// - unpack jws
// - get linked structures (implicit validation)
// - validate structures
// - get linked resources (implicit validation)
// - verify signature
// - verify unrevoked
function fullValidateSignedAssertion(signature, callback) {
  const data = {signature: signature};
  async.waterfall([
    function unpack(callback) {
      unpackJWS(signature, callback)
    },
    function getStructures(assertion, callback) {
      getLinkedStructures(assertion, callback);
    },
    function validateStructures(structures, callback) {
      const errors = {
        assertion: validateAssertion(structures.assertion),
        badge: validateBadgeClass(structures.badge),
        issuer: validateIssuerOrganization(structures.issuer),
      }
      console.dir(errors);
      callback(null, structures);
    },
    function getResources(structures, callback) {
      data.structures = structures;
      getLinkedResources(structures, callback);
    },
    function verifySignature(resources, callback) {
      data.resources = resources;
      const publicKey = resources['assertion.verify.url'];
      if (!jws.verify(signature, publicKey))
        return callback(makeError('verify-signature'))
      callback(null, resources);
    },
    function verifyUnrevoked(resources, callback) {
      const revocationList = resources['issuer.revocationList'];
      const assertion = data.structures.assertion;
      var msg;
      if (!revocationList)
        return callback();
      if ((msg = revocationList[assertion.uid]))
        return callback(makeError('verify-revoked', msg))
      return callback();
    }
  ],function (errs) {
    console.log('errors', errs);
    console.log('data', data);
  })
}
module.exports = validate;

validate.isOldAssertion = isOldAssertion;
validate.absolutize = absolutize;

validate.assertion = validateAssertion;
validate.badgeClass = validateBadgeClass;
validate.issuerOrganization = validateIssuerOrganization;
