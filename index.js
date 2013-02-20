const re = {
  url: /(^(https?):\/\/[^\s\/$.?#].[^\s]*$)|(^\/\S+$)/,
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/,
  origin: /^(https?):\/\/[^\s\/$.?#].[^\s\/]*\/?$/,
  version: /^v?\d+\.\d+(\.\d+)?$/,
  date: /(^\d{4}-\d{2}-\d{2}$)|(^\d{1,10}$)/,
  emailOrHash: /([a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?)|((sha1|sha256|sha512|md5)\$[a-fA-F0-9]+)/,
}

function isObject(thing) {
  return (
    thing &&
    typeof thing === 'object' &&
    !Array.isArray(thing)
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
    if (!value || !test(value)) {
      errors.push(errObj);
      return false;
    }
    return true;
  }
}

function validateStructure(assertion) {
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

  return errs;
};


exports.structure = validateStructure;