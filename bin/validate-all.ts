#!/usr/bin/env node
const validator = require('../');
const resources = require('../lib/resources');
const jsonld = require('jsonld');
var input = process.argv.slice(2)[0];
var SPEC_VERSIONS = ['0.5.0', '1.0.0', '1.1.0', '2.0.0'];

var validate = {
  '0.5.0': function (assertion) {
    return toResponse(false, 'None', '');
  },
  '1.0.0': function (assertion) {
    return toResponse(false, 'None', '');
  },
  '1.1.0': function (assertion) {
    return toResponse(false, 'None', '');
  },
  '2.0.0': function (assertion) {
    return toResponse(false, 'Unavailable', '');
  }
}

class FullValidationResponse {
  inputType: string;
  assertion: Assertion;
  response: Object;

  constructor(public input: string) {
    this.response = {};
    this.assertion = new Assertion(input);
    if (this.assertion.inputType == 'Unknown') {
      return;
    }
    for (var i = 0; i < SPEC_VERSIONS.length; i++) {
      var version = SPEC_VERSIONS[i];
      this.response[version] = new ValidationTest(this.assertion.body, validate[version]);
    }
  };

  toCsvRow() {
    var values = [this.assertion.raw, this.assertion.inputType, this.assertion.verifyUrl, this.assertion.body, this.assertion.fetchError];
    if (this.assertion.inputType == 'Unknown') {
      for (var i = 0; i < SPEC_VERSIONS.length; i++) {
        values.push('FAIL');
        values.push('Unknown assertion format');
      }
    }
    else {
      for (var i = 0; i < SPEC_VERSIONS.length; i++) {
        var version = SPEC_VERSIONS[i];
        values.push((this.response[version].valid) ? 'OKAY' : 'FAIL');
        values.push(this.response[version].reason);
      }
    }
    return '"' + values.join('","') + '"\n';
  };
}

class Assertion {
  raw: string;
  inputType: string;
  verifyUrl: string;
  body: string;
  fetchError: string;
  constructor(public input: string) {
    this.raw = input;
    this.body = '';
    this.verifyUrl = '';
    this.fetchError = '';
    this.inputType = (isJson(this.raw) ? 'JSON' : (isUrl(this.raw) ? 'URL': 'Unknown'));
    if (this.inputType == 'URL')
      this.verifyUrl = this.raw;
    if (this.inputType == 'JSON')
      this.verifyUrl = getVerifyUrl(JSON.parse(this.raw));
    if (!this.verifyUrl.length) {
      return;
    }
    const options = {url: this.verifyUrl, json: true, required: true};
    resources.getUrl(options, function (ex, result) {
      if (result.error) {
        this.fetchError = result.error;
        return;
      }
      this.body = result.body;
    });
  }
}

function getVerifyUrl (json) {
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

interface Validator {
    (input: string): ValidatorResponse;   
}

function toResponse(valid, reason, details) {
  return {
    valid: valid,
    reason: reason,
    details: details,
  }
}

interface ValidatorResponse {
  valid: boolean;
  reason: string;
  details: string;
}

class ValidationTest {
  valid: boolean;
  reason: string;
  details: string;
  constructor(public assertion: string, public validate: Validator) {
    var response = validate(assertion);
    this.valid = response.valid;
    this.reason = response.reason;
    this.details = response.details;
  };
}

function validateAll (input, handleResponse) {
  var response = new FullValidationResponse(input);
  console.log(response[handleResponse]());
}

(function main () {
  // Header:
  //console.log("Raw input, input type, verify URL, fetch body, fetch error, [tests 0.5.0 - 2.0.0]");
  validateAll(input, 'toCsvRow');
})();
