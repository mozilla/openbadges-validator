const jws = require('jws');
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

function validateAssertion(assertion, prefix){
  if (isOldAssertion(assertion))
    return validateOldAssertion(assertion);
  return validateBadgeAssertion(assertion);
}

function validateBadgeAssertion(assertion, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = [];
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
  return errs;
}

function validateBadgeClass(badge, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = [];
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

  return errs;
}

function validateIssuerOrganization(issuer, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = [];
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(issuer.name, isString, {field: p('name')});
  testRequired(issuer.url, isAbsoluteUrl, {field: p('url')});
  testOptional(issuer.description, isString, {field: p('description')});
  testOptional(issuer.image, isAbsoluteUrlOrDataURI, {field: p('image')});
  testOptional(issuer.email, isEmail, {field: p('email')});
  testOptional(issuer.revocationList, isAbsoluteUrl, {field: p('revocationList')});

  return errs;
};

function validateOldAssertion(assertion, prefix) {
  function p(str) { return ((prefix&&prefix+':')||'')+str }

  const errs = [];
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
    return errs;

  testOptional(badge.version, isVersionString, {field: p('badge.version')});
  testRequired(badge.name, isString, {field: p('badge.name')});
  testRequired(badge.description, isString, {field: p('badge.description')});
  testRequired(badge.image, isUrl, {field: p('badge.image')});
  testRequired(badge.criteria, isUrl, {field: p('badge.criteria')});

  if (!testRequired(badge.issuer, isObject, {field: p('badge.issuer')}))
    return errs;

  testRequired(issuer.name, isString, {field: p('badge.issuer.name')});
  testRequired(issuer.contact, isEmail, {field: p('badge.issuer.contact')});
  testRequired(issuer.origin, isOrigin, {field: p('badge.issuer.origin')});
  testOptional(issuer.org, isString, {field: p('badge.issuer.org')});

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
    return callback(null, null, errs);
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
      return callback(null, body, errs)
    }
    if (response.statusCode !== 200) {
      error.code = 'response';
      error.message = util.format(
        'must respond with 200 or 3xx to HTTP GET request (got %s)',
        response.statusCode
      );
      errs.push(error);
      return callback(null, body, errs);
    }
    const contentType = response.headers['content-type'];
    if (opts.type && contentType !== opts.type) {
      error.code = 'content-type';
      error.message = util.format(
        'must respond with correct content-type (expected "%s", got "%s")',
        opts.type, contentType
      );
      errs.push(error);
      return callback(null, body, errs);
    }
    return callback(null, body, errs);
  });
}

function validateAssertionResponses(assertion, callback) {
  if (isOldAssertion(assertion))
    return validateOldAssertionResponses(assertion, callback);
  return validateBadgeAssertionResponses(assertion, callback);
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
  ], httpOk, function (_, bodies) {
    return callback(errs.length ? errs : null, {
      criteria: bodies[0],
      evidence: bodies[1],
      image: bodies[2],
    });
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
  async.map(fields, httpOk, function (_, bodies) {
    return callback(errs.length ? errs : null, {
      evidence: bodies[0],
      'verify.url': bodies[1],
      image: bodies[2],
    });
  });
}

function validateBadgeClassResponses(badge, callback) {
  const errs = [];
  const httpOk = ensureHttpOk.bind(null, errs);

  const criteria = badge.criteria;
  const image = badge.image;

  const fields = [
    {field: 'criteria', url: criteria }
  ];
  if (isAbsoluteUrl(image))
    fields.push({ field: 'image', url: image, type: 'image/png' });
  async.map(fields, httpOk, function (_, bodies) {
    return callback(errs.length ? errs : null, {
      'criteria': bodies[0],
      image: bodies[1]
    });
  });
}

function validateIssuerOrganizationResponses(issuer, callback) {
  const errs = [];
  const httpOk = ensureHttpOk.bind(null, errs);

  const siteUrl = issuer.url;
  const image = issuer.image;
  const revocationList = issuer.revocationList;

  const fields = [
    {field: 'url', url: siteUrl },
  ];
  if (isAbsoluteUrl(image))
    fields.push({ field: 'image', url: image, type: 'image/png' });
  async.map(fields, httpOk, function (_, bodies) {
    return callback(errs.length ? errs : null, {
      url: bodies[0],
      image: bodies[1]
    });
  });
}

function jsonParse(thing) {
  try {return JSON.parse(thing) }
  catch (ex) { return false }
}

function getLinkedStructures(assertion, callback) {
  // #TODO: don't assume new assertion structure?
  var result = {
    assertion: assertion,
    badge: null,
    issuer: null,
    revocationList: null
  };
  const badgeUrl = assertion.badge;
  if (!badgeUrl)
    return callback({
      field: 'badge',
      code: 'missing'
    });

  // #TODO: Think of a way to refactor this. The three callback bodies
  // don't deviate by much – the one major difference is that the
  // revocationList is optional, so the third `httpGet` might not fire.
  httpGet(badgeUrl, 'application/json', function (err, body) {
    if (err) {
      err.field = 'badge';
      return callback(err, result);
    }
    const badge = jsonParse(body);
    if (!badge)
      return callback({
        field: 'badge',
        code: 'parse',
      }, result);

    result.badge = badge;
    const issuerUrl = badge.issuer;
    if (!issuerUrl)
      return callback({
        field: 'issuer',
        code: 'missing'
      });

    httpGet(issuerUrl, 'application/json', function (err, body) {
      if (err) {
        err.field = 'issuer';
        return callback(err, result);
      }
      const issuer = jsonParse(body);
      if (!issuer)
        return callback({
          field: 'issuer',
          code: 'parse',
        }, result);

      result.issuer = issuer;
      const revocationListUrl = issuer.revocationList;
      if (!revocationListUrl)
        return callback(null, result);

      httpGet(revocationListUrl, 'application/json', function (err, body) {
        if (err) {
          err.field = 'revocationList';
          return callback(err, result);
        }
        const revocationList = jsonParse(body);
        if (!revocationList)
          return callback({
            field: 'revocationList',
            code: 'parse',
            extra: ex
          }, result);

        result.revocationList = revocationList;
        return callback(null, result);
      });
    });
  });
}

function validate(input, callback) {
  const errs = [];
  if (jws.isValid(input))
    return fullValidateSignedAssertion(input, callback);

  errs.push({
    field: '*input*',
    code: 'invalid'
  })
  return callback(errs.length ? errs : null);
}

function fullValidateSignedAssertion(signature, callback) {
  var structuralErrs;
  const inputErrs = [];
  const parts = jws.decode(signature);
  const header = parts.header;
  const assertion = jsonParse(parts.payload);

  // Basic Sanity: We only want to deal with JWS objects that are signed
  // with a real key. At this point we don't support HMAC signed badges.
  // We also can't deal with the assertion if we can't parse it from the
  // payload, so we test for that and bail early if we don't get a
  // resonable object back.
  if (/^hs/i.test(header.alg)) {
    inputErrs.push({
      field: '*input*',
      code: 'jws-algorithm'
    });
    return callback(inputErrs);
  }
  if (!assertion) {
    inputErrs.push({
      field: '*input*',
      code: 'payload-parse'
    });
    return callback(inputErrs);
  }

  // Assertion Structure: validate the basic structure of the assertion
  // and make sure we're dealing with an assertion that self-identifies
  // as a signed assertion by checking `verify.type`.
  structuralErrs = validateAssertion(assertion, 'assertion');
  if (structuralErrs.length)
    return callback(structuralErrs)
  if (assertion.verify.type !== 'signed')
    return callback([{
      field: '*input*',
      code: 'verification-mismatch'
    }]);


  validate.assertionResponses(assertion, function (responseErrs, assertionResourceBodies) {
    // Signature Verification: first make sure we didn't get any
    // response errors from the remote resources linked from the
    // assertion. Extract the key from the response of the
    // `verify.url` resource and do a JWS verification against the
    // given signature.
    if (responseErrs)
      return callback(responseErrs);
    const publicKey = assertionResourceBodies['verify.url'];
    const verified = jws.verify(signature, publicKey);
    if (!verified)
      return callback([{
        field: '*input*',
        code: 'key-mismatch'
      }]);

    validate.getLinkedStructures(assertion, function (err, structures) {
      // Ensure badge is not revoked: recursively get all of the
      // linked structures (BadgeClass, IssuerOrganzation, revocationList).
      // If a revocationList is found, check the badge's `uid` against
      // the list to make sure it hasn't been revoked.
      if (err)
        return callback([err]);
      const revocationList = structures.revocationList;
      if (revocationList && revocationList[assertion.uid])
        return callback([{
          field: '*input*',
          code: 'revoked',
          extra: revocationList[assertion.uid]
        }]);

      // Structural Validity, round two: Check the BadgeClass and
      // IssuerOrganization for structural validity.
      structuralErrs = [].concat(
        validate.badgeClass(structures.badge, 'badge'),
        validate.issuerOrganization(structures.issuer, 'issuer')
      );
      if (structuralErrs.length)
        return callback(structuralErrs)

      const remoteBadge = validateBadgeClassResponses.bind(null, structures.badge);
      const remoteIssuer = validateIssuerOrganizationResponses.bind(null, structures.issuer);

      async.parallel([remoteBadge, remoteIssuer], function (err, results) {
        console.dir(err);
        console.dir(results);

        return callback(null, {
          version: '1.0.0',
          resources: {
            assertion: assertionResourceBodies,
          },
          structures: structures,
        });
      });
    });
  });
}


module.exports = validate;

validate.isOldAssertion = isOldAssertion;
validate.ensureHttpOk = ensureHttpOk;
validate.absolutize = absolutize;

validate.assertion = validateAssertion;
validate.badgeClass = validateBadgeClass;
validate.issuerOrganization = validateIssuerOrganization;

validate.assertionResponses = validateAssertionResponses;
validate.badgeClassResponses = validateBadgeClassResponses;
validate.issuerOrganizationResponses = validateIssuerOrganizationResponses;

validate.getLinkedStructures = getLinkedStructures;