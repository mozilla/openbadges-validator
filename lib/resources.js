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
  Object.defineProperty(err, 'message', { enumerable: true });
  return err;
}

function getUrl(urlObj, callback) {
  function error(obj) {
    obj.name = 'ResourceError';
    return {error: makeError(obj)}
  }
  const results = {};
  const required = urlObj.required === true || urlObj.optional === false;
  const json = !!urlObj.json;
  const contentType = urlObj['content-type'];
  const url = urlObj.url;
  if (!url) {
    if (required)
      return callback(null, error({
        message: 'missing required field',
        code: 'required'
      }))
    return callback(null, {});
  }
  request({
    method: 'get',
    url: url,
    encoding: null
  }, function (ex, response, body) {
    if (ex)
      return callback(null, error({
        message: 'could not retrieve url',
        code: 'unreachable',
        url: url,
        reason: ex
      }));
    const headers = response.headers;
    if (response.statusCode !== 200)
      return callback(null, error({
        message: 'invalid http status',
        code: 'http-status',
        url: url,
        expected: 200,
        received: response.statusCode
      }));
    if (contentType && headers['content-type'] !== contentType)
      return callback(null, error({
        code: 'content-type',
        url: url,
        expected: contentType,
        received: headers['content-type'],
      }));
    if (json) {
      try {
        body = JSON.parse(body);
      } catch(ex) {
        return callback(null, error({
          code: 'parse',
          url: url,
          reason: ex
        }));
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

