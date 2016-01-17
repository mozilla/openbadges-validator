#!/usr/bin/env node
var validator = require('../');
var jsonld = require('jsonld');
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
  response: Object;
  toCsvRow() {
    var values = [this.input, this.inputType];
    if (this.inputType == 'Unknown') {
      for (var i = 0; i < SPEC_VERSIONS.length; i++) {
        values.push('FAIL');
        values.push('Unknown assertion format');
      }
    }
    else {
      for (var i = 0; i < SPEC_VERSIONS.length; i++) {
        var version = SPEC_VERSIONS[i];
        //console.log(this.response);
        //console.log(this.response[version]);
        values.push((this.response[version].valid) ? 'PASS' : 'FAIL');
        values.push(this.response[version].reason);
      }      
    }
    return '"' + values.join('","') + '"\n';
  };
  constructor(public input: string) {
    var assertion = new Assertion(input);
    this.inputType = assertion.type;
    if (assertion.type == 'Unknown') {
      return;
    }
    for (var i = 0; i < SPEC_VERSIONS.length; i++) {
      var version = SPEC_VERSIONS[i];
      this.response[version] = new ValidationTest(assertion.body, validate[version]);
    }
  };
}

class Assertion {
  type: string;
  body: string;
  constructor(public input: string) {
    if (isUrl(input)) {
      this.type = 'URL';
      this.body = input;
    } else if (isJson(input)) {
      this.type = 'JSON';
      this.body = input;
    } else {
      this.type = 'Unknown';
      this.body = '';
    }
  }
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
  console.log('Validating input: ' + input);
  validateAll(input, 'toCsvRow');
})();
