const async = require('async');
const request = require('request');

function getAll(structure, spec, callback) {
  const finder = find.bind(null, structure);
  const getUrls = keys(spec).reduce(function (aggr, field) {
    aggr[field] = spec[field];
    aggr[field].url = finder(field);
    aggr[field] = getUrl.bind(null, aggr[field]);
    return aggr;
  }, {});
  return async.parallel(getUrls, callback);
}

function makeError(obj) {
  const err = new Error(obj.message||obj.code);
  keys(obj).forEach(function (key) { err[key] = obj[key] });
  return err;
}

function getUrl(urlObj, callback) {
  function err(code) { return {error: makeError({code: code})} }
  const results = {};
  const required = urlObj.required === true || urlObj.optional === false;
  const contentType = urlObj['content-type'];
  const url = urlObj.url;
  if (!url) {
    if (required)
      return callback(null, err('missing'))
    return callback(null, {});
  }
  request({method: 'get', url: url }, function (ex, response, body) {
    if (ex)
      return callback(null, err('unreachable'));
    const headers = response.headers;
    if (response.statusCode !== 200)
      return callback(null, err('http-status'));
    if (contentType && headers['content-type'] !== contentType)
      return callback(null, err('content-type'));
    return callback(null, {body: body});
  });
}

function keys(obj) {
  return Object.keys(obj);
}

function find(obj, path) {
  return path.split('.').reduce(function (aggr, part) {
    if (aggr === null || aggr === undefined)
      return null;
    return aggr[part]
  }, obj);
}

module.exports = getAll;
getAll.getUrl = getUrl;