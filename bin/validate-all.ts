#!/usr/bin/env node
const validator = require('../');
const resources = require('../lib/resources');
const jsonld = require('jsonld');
var util = require('util');
var input = process.argv.slice(2)[0];
var SPEC_VERSIONS = ['0.5.0', '1.0.0', '1.1.0', '2.0.0'];

class BadgeAssertion {
  structuresValid
  constructor(public body: string) {
    this.validateStructures = {
      '0.5.0': function () {
        return new ValidatorResponse(false, 'None', '');
      },
      '1.0.0': function () {
        return new ValidatorResponse(false, 'None', '');
      },
      '1.1.0': function () {
        return new ValidatorResponse(false, 'None', '');
      },
      '2.0.0': function () {
        return new ValidatorResponse(false, 'Unavailable', '');
      }
    }
  }

  this.toCsvRow = function() {

  }
}

function fetchVerifyUrl (url) {
  return new Promise(function (resolve, reject) {
    const options = {url: url, json: true, required: true};
    resources.getUrl(options, function (ex, result) {
      if (result.error) {
        reject(result.error);
      }
      resolve(result.body);
    });
  });
}

function parseVerifyUrl (rawInput) {
  if (isUrl(rawInput))
    return rawInput;
  if isJson(rawInput)
    return extractVerifyUrl(rawInput);
  return '';
}

function extractVerifyUrl (json) {
  try {
    var url = json.verify.url;
    if (isUrl(url))
      return url;
    return '';
  } catch(e) { return ''; }
}

function isUrl(str) {
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

function isJson (str) {
  try { JSON.parse(str); return true } catch(e) { return false }
}

function validateInput (input, handleOutput) {
  //var response = new FullValidationResponse(input);
  var verifyUrl = parseVerifyUrl(input);
  if (verifyUrl.length) {
    fetchAssertion(verifyUrl).then(function(response) {
      if (isJson(response)) {
        var assertion = new BadgeAssertion(JSON.parse(response));
        assertion[handleOutput]();
      }
      else {
        handleOutput(input, response, 'Not a valid JSON document.');
      }
    }, function(error) {
      handleOutput(input, verifyUrl, 'Error fetching assertion from verifier IRI');
    });
  }
  else {
    handleOutput(input, null, 'Not a valid URL');
  }
}

function toCsvRow(raw, processed, messages) {
  
}

(function main () {
  validateInput(input, 'toCsvRow');
})();
