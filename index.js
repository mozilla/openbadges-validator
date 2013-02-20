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
    typeof thing === 'object' &&
    !Array.isArray(thing)
  )
}

function validateStructure(badgeObj) {
  const errs = [];
  if (!re.emailOrHash.test(badgeObj.recipient))
    errs.push({
      field: 'recipient',
      msg: 'must be email address or hash'
    });

  if (badgeObj.salt && typeof badgeObj.salt !== 'string')
    errs.push({
      field: 'salt',
      msg: 'must be a string'
    });

  if (!re.url.test(badgeObj.evidence))
    errs.push({
      field: 'evidence',
      msg: 'must be a URL'
    });

  if (!re.date.test(badgeObj.expires))
    errs.push({
      field: 'expires',
      msg: 'must be a unix timestamp or ISO 8601 date string'
    });

  if (!re.date.test(badgeObj.issued_on))
    errs.push({
      field: 'issued_on',
      msg: 'must be a unix timestamp or ISO 8601 date string'
    });

  if (!isObject(badgeObj.badge))
    errs.push({
      field: 'badge',
      msg: 'must be an object'
    });

  return errs;
};


exports.structure = validateStructure;