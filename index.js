const util = require('util');
const async = require('async');
const request = require('request');
const dataurl = require('dataurl');
const dateutil = require('dateutil');

function makeValidator(opts) {
  opts.fn.message = opts.message;
  return opts.fn;
}

function pass() {
  return true;
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
  errors = errors || [];
  return function optional(value, test, errObj) {
    if (!value) return true;
    if (!test(value)) {
      errors.push(errObj);
      return false;
    }
    return true;
  }
}

function makeRequiredValidator(errors) {
  errors = errors || [];
  return function required(value, test, errObj) {
    errObj.message = errObj.message || test.message;
    if (typeof value === 'undefined'
        || value === null
        || !test(value)) {
      errors.push(errObj);
      return false;
    }
    return true;
  }
}

function isOldAssertion(assertion) {
  return isObject(assertion.badge);
}

function validateAssertion(assertion){
  if (isOldAssertion(assertion))
    return validateOldAssertion(assertion);
  return validateBadgeAssertion(assertion);
}

function validateBadgeAssertion(assertion) {
  const errs = [];
  const recipient = assertion.recipient || {};
  const verify = assertion.verify || {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  // only test the internals of the `recipient` property if it's
  // actually an object.
  if (testRequired(assertion.recipient, isObject, {field: 'recipient'})) {
    testRequired(recipient.type, isIdentityType, {field: 'recipient.type'});
    testRequired(recipient.identity, isString, {field: 'recipient.identity'});
    testRequired(recipient.hashed, isBoolean, {field: 'recipient.hashed'});
    testOptional(recipient.salt, isString, {field: 'recipient.salt'});
  }

  // only test the internal properties of the `verify` property if it's
  // actually an object.
  if (testRequired(assertion.verify, isObject, {field: 'verify'})) {
    testRequired(verify.type, isVerifyType, {field: 'verify.type'});
    testRequired(verify.url, isAbsoluteUrl, {field: 'verify.url'});
  }

  testRequired(assertion.uid, isString, {field: 'uid'});
  testRequired(assertion.badge, isAbsoluteUrl, {field: 'badge'});
  testRequired(assertion.issuedOn, isUnixOrISOTime, {field: 'issuedOn'});
  testOptional(assertion.expires, isUnixOrISOTime, {field: 'expires'});
  testOptional(assertion.evidence, isAbsoluteUrl, {field: 'evidence'});
  testOptional(assertion.image, isAbsoluteUrlOrDataURI, {field: 'image'});
  return errs;
}

function validateBadgeClass(badge) {
  const errs = [];
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(badge.name, isString, {field: 'name'});
  testRequired(badge.description, isString, {field: 'description'});
  testRequired(badge.image, isAbsoluteUrlOrDataURI, {field: 'image'});
  testRequired(badge.criteria, isAbsoluteUrl, {field: 'criteria'});
  testRequired(badge.issuer, isAbsoluteUrl, {field: 'issuer'});
  testOptional(badge.tags, isArray(isString), {
    field: 'tags',
    message: 'must be an array of strings'
  });
  testOptional(badge.alignment, isArray(isValidAlignmentStructure), {
    field: 'alignment',
    message: 'must be an array of valid alignment structures (with required `name` and `url` properties and an optional `description` property)'
  });

  return errs;
}

function validateIssuerOrganization(issuer) {
  const errs = [];
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(issuer.name, isString, {field: 'name'});
  testRequired(issuer.url, isAbsoluteUrl, {field: 'url'});
  testOptional(issuer.description, isString, {field: 'description'});
  testOptional(issuer.image, isAbsoluteUrlOrDataURI, {field: 'image'});
  testOptional(issuer.email, isEmail, {field: 'email'});
  testOptional(issuer.revocationList, isAbsoluteUrl, {field: 'revocationList'});

  return errs;
};

function validateOldAssertion(assertion) {
  const errs = [];
  const badge = assertion.badge || {};
  const issuer = badge.issuer || {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(assertion.recipient, isEmailOrHash, {field: 'recipient'});
  testOptional(assertion.salt, isString, {field: 'salt'});
  testOptional(assertion.evidence, isUrl, {field: 'evidence'});
  testOptional(assertion.expires, isDateString, {field: 'expires'});
  testOptional(assertion.issued_on, isDateString, {field: 'issued_on'});

  if (!testRequired(assertion.badge, isObject, {field: 'badge'}))
    return errs;

  testOptional(badge.version, isVersionString, {field: 'badge.version'});
  testRequired(badge.name, isString, {field: 'badge.name'});
  testRequired(badge.description, isString, {field: 'badge.description'});
  testRequired(badge.image, isUrl, {field: 'badge.image'});
  testRequired(badge.criteria, isUrl, {field: 'badge.criteria'});

  if (!testRequired(badge.issuer, isObject, {field: 'badge.issuer'}))
    return errs;

  testRequired(issuer.name, isString, {field: 'badge.issuer.name'});
  testRequired(issuer.contact, isEmail, {field: 'badge.issuer.contact'});
  testRequired(issuer.origin, isOrigin, {field: 'badge.issuer.origin'});
  testOptional(issuer.org, isString, {field: 'badge.issuer.org'});

  return errs;
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

function ensureHttpOk(errs, opts, callback) {
  if (arguments.length == 2)
    callback = opts, opts = errs, errs = [];
  const error = {field: opts.field,}
  if (!opts.url)
    return callback(null, errs);
  request({
    url: opts.url,
    method: 'get',
    followAllRedirects: true
  }, function (ex, response, body) {
    if (ex) {
      error.code = 'unreachable';
      error.message = util.format(
        'must be reachable (%s)',
        ex.message
      );
      error.debug = ex;
      errs.push(error);
      return callback(null, errs)
    }
    if (response.statusCode !== 200) {
      error.code = 'response';
      error.message = util.format(
        'must respond with 200 or 3xx to HTTP GET request (got %s)',
        response.statusCode
      );
      errs.push(error);
      return callback(null, errs);
    }
    const contentType = response.headers['content-type'];
    if (opts.type && contentType !== opts.type) {
      error.code = 'content-type';
      error.message = util.format(
        'must respond with correct content-type (expected "%s", got "%s")',
        opts.type, contentType
      );
      errs.push(error);
      return callback(null, errs);
    }
    return callback(null, errs);
  });
}

function validateOldAssertionResponses(assertion, callback) {
  const errs = [];
  const httpOk = ensureHttpOk.bind(null, errs);
  assertion = absolutize(assertion);

  const criteria = assertion.badge.criteria;
  const image = assertion.badge.image;
  const evidence = assertion.evidence;

  async.map([
    {field: 'criteria', url: criteria},
    {field: 'evidence', url: evidence},
    {field: 'image', url: image, type: 'image/png'},
  ], httpOk, function () {
    return callback(errs.length ? errs : null)
  });
}

function validateBadgeAssertionResponses(assertion, callback) {
  const errs = [];
  const httpOk = ensureHttpOk.bind(null, errs);

  const verifyUrl = assertion.verify.url;
  const evidence = assertion.evidence;
  const image = assertion.image;

  const fields = [
    {field: 'evidence', url: evidence },
    {field: 'verify.url',
     url: verifyUrl,
     type: (assertion.verify.type ==='hosted' ? 'application/json' : '')
    },
  ];
  if (isAbsoluteUrl(image))
    fields.push({ field: 'image', url: image, type: 'image/png' });
  async.map(fields, httpOk, function () {
    return callback(errs.length ? errs : null);
  });
}

function validateAssertionResponses(assertion, callback) {
  if (isOldAssertion(assertion))
    return validateOldAssertionResponses(assertion, callback);
  return validateBadgeAssertionResponses(assertion, callback);
}

function validateBadgeClassResponses(badge, callback) {
  const errs = [];
  const httpOk = ensureHttpOk.bind(null, errs);

  const criteria = badge.criteria;
  const image = badge.image;

  const fields = [{field: 'criteria', url: criteria }];
  if (isAbsoluteUrl(image))
    fields.push({ field: 'image', url: image, type: 'image/png' });
  async.map(fields, httpOk, function () {
    return callback(errs.length ? errs : null);
  });

}

exports.isOldAssertion = isOldAssertion;
exports.ensureHttpOk = ensureHttpOk;
exports.absolutize = absolutize;

exports.assertion = validateAssertion;
exports.badgeClass = validateBadgeClass;
exports.issuerOrganization = validateIssuerOrganization;

exports.assertionResponses = validateAssertionResponses;
exports.badgeClassResponses = validateBadgeClassResponses;
