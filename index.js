const dataurl = require('dataurl');
const dateutil = require('dateutil');

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

function isObject(thing) {
  return (
    thing
    && typeof thing === 'object'
    && !Array.isArray(thing)
  )
}

function isString(thing) {
  return typeof thing === 'string'
}

function isFormat(format) {
  return function (thing) {
    return format.test(thing);
  }
}

function isBoolean(thing) {
  return (
    typeof thing === 'boolean'
    || /false/i.test(thing)
    || /true/i.test(thing)
  )
}

function isUnixOrISOTime(thing) {
  if (re.unixtime.test(thing))
    return true;
  try {
    const type = dateutil.parse(thing).type;
    return type !== 'unknown_date';
  } catch (e) {
    return false;
  }
}

function isAbsoluteUrlOrDataURI(thing) {
  if (re.absoluteUrl.test(thing))
    return true;
  const image = dataurl.parse(thing);
  if (image && image.mimetype === 'image/png')
    return true;
  return false
}

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
    if (typeof value === 'undefined'
        || value === null
        || !test(value)) {
      errors.push(errObj);
      return false;
    }
    return true;
  }
}

function validateAssertion(assertion){
  const badgeField = assertion.badge;
  if (isObject(badgeField))
    return validateOldAssertion(assertion);
  return validateNewAssertion(assertion);
}

function validateNewAssertion(assertion) {
  const errs = [];
  const recipient = assertion.recipient || {};
  const verify = assertion.verify || {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  // only test the internals of the `recipient` property if it's
  // actually an object.
  if (testRequired(assertion.recipient, isObject, {
    field: 'recipient',
    msg: 'must be an object'
  })) {
    testRequired(recipient.type, isFormat(re.identityType), {
      field: 'recipient.type',
      msg: 'must be `email`'
    });

    testRequired(recipient.identity, isString, {
      field: 'recipient.identity',
      msg: 'must be a string'
    });

    testRequired(recipient.hashed, isBoolean, {
      field: 'recipient.hashed',
      msg: 'must be either `true` or `false`'
    });

    testOptional(recipient.salt, isString, {
      field: 'recipient.salt',
      msg: 'must be a string'
    });
  }

  // only test the internal properties of the `verify` property if it's
  // actually an object.
  if (testRequired(assertion.verify, isObject, {
    field: 'verify',
    msg: 'must be an object',
  })) {
    testRequired(verify.type, isFormat(re.verifyType), {
      field: 'verify.type',
      msg: 'must be either `\'hosted\'` or `\'signed\'`',
    });
    testRequired(verify.url, isFormat(re.absoluteUrl), {
      field: 'verify.url',
      msg: 'must be an absolute url',
    });
  }

  testRequired(assertion.uid, isString, {
    field: 'uid',
    msg: 'must be a string'
  });

  testRequired(assertion.badge, isFormat(re.absoluteUrl), {
    field: 'badge',
    msg: 'must be an absolute url'
  });

  testRequired(assertion.issuedOn, isUnixOrISOTime, {
    field: 'issuedOn',
    msg: 'must be a unix timestamp or ISO8601 date string'
  });

  testOptional(assertion.expires, isUnixOrISOTime, {
    field: 'expires',
    msg: 'must be a unix timestamp or ISO8601 date string'
  });

  testOptional(assertion.evidence, isFormat(re.absoluteUrl), {
    field: 'evidence',
    msg: 'must be an absolute url'
  });

  testOptional(assertion.image, isAbsoluteUrlOrDataURI, {
    field: 'image',
    msg: 'must be an absolute url or data URL representing a PNG'
  });

  return errs;
}

function validateBadgeClass(badge) {
  const errs = [];
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(badge.name, isString, {
    field: 'name',
    msg: 'must be a string'
  });

  return errs;
}

function validateOldAssertion(assertion) {
  const errs = [];
  const badge = assertion.badge || {};
  const issuer = badge.issuer || {};
  const testOptional = makeOptionalValidator(errs);
  const testRequired = makeRequiredValidator(errs);

  testRequired(assertion.recipient, isFormat(re.emailOrHash), {
    field: 'recipient',
    msg: 'must be email address or hash'
  });

  testOptional(assertion.salt, isString, {
    field: 'salt',
    msg: 'must be a string'
  });

  testOptional(assertion.evidence, isFormat(re.url), {
    field: 'evidence',
    msg: 'must be a URL'
  });

  testOptional(assertion.expires, isFormat(re.date), {
    field: 'expires',
    msg: 'must be a unix timestamp or ISO 8601 date string'
  });

  testOptional(assertion.issued_on, isFormat(re.date), {
    field: 'issued_on',
    msg: 'must be a unix timestamp or ISO 8601 date string'
  });

  if (!testRequired(assertion.badge, isObject, {
    field: 'badge',
    msg: 'must be an object'
  })) return errs;

  testOptional(badge.version, isFormat(re.version), {
    field: 'badge.version',
    msg: 'must be a string in the format x.y.z'
  });

  testRequired(badge.name, isString, {
    field: 'badge.name',
    msg: 'must be a string'
  });

  testRequired(badge.description, isString, {
    field: 'badge.description',
    msg: 'must be a string'
  });

  testRequired(badge.image, isFormat(re.url), {
    field: 'badge.image',
    msg: 'must be a url'
  });

  testRequired(badge.criteria, isFormat(re.url), {
    field: 'badge.criteria',
    msg: 'must be a url'
  });

  if (!testRequired(badge.issuer, isObject, {
    field: 'badge.issuer',
    msg: 'must be an object'
  })) return errs;

  testRequired(issuer.name, isString, {
    field: 'badge.issuer.name',
    msg: 'must be a string'
  });

  testRequired(issuer.contact, isFormat(re.email), {
    field: 'badge.issuer.contact',
    msg: 'must be an email address'
  });

  testRequired(issuer.origin, isFormat(re.origin), {
    field: 'badge.issuer.origin',
    msg: 'must be an origin'
  });

  testOptional(issuer.org, isString, {
    field: 'badge.issuer.org',
    msg: 'must be a string'
  });

  return errs;
};

exports.assertion = validateAssertion;
exports.badgeClass = validateBadgeClass;