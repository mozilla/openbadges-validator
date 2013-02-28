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
  return async.parallel(getUrls, function (err, responses) {
    const results = {};
    var errors = {};
    forEach(responses, function (key, response) {
      if (response.error)
        return errors[key] = response.error;
      return results[key] = response.body;
    });
    errors = keys(errors).length ? errors : null;
    return callback(errors, results);
  });
}

function makeError(obj) {
  const err = new Error(obj.message||obj.code);
  keys(obj).forEach(function (key) { err[key] = obj[key] });
  return err;
}

function getUrl(urlObj, callback) {
  function err(code, url) {
    return {
      error: makeError({
        code: code,
        url: url
      })
    }
  }
  const results = {};
  const required = urlObj.required === true || urlObj.optional === false;
  const json = !!urlObj.json;
  const contentType = urlObj['content-type'];
  const url = urlObj.url;
  if (!url) {
    if (required)
      return callback(null, err('missing', url))
    return callback(null, {});
  }
  request({method: 'get', url: url }, function (ex, response, body) {
    if (ex)
      return callback(null, err('unreachable', url));
    const headers = response.headers;
    if (response.statusCode !== 200)
      return callback(null, err('http-status', url));
    if (contentType && headers['content-type'] !== contentType)
      return callback(null, err('content-type', url));
    if (json) {
      try {
        body = JSON.parse(body);
      } catch(e) {
        return callback(null, err('parse', url));
      }
    }
    return callback(null, {body: body});
  });
}

module.exports = getAll;
getAll.getUrl = getUrl;

function forEach(obj, fn) {
  return keys(obj).forEach(function (key) {
    return fn(key, obj[key]);
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

