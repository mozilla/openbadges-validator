#!/usr/bin/env node
const validator = require('../');
const resources = require('../lib/resources');
const jsonld = require('jsonld');
var promises = jsonld.promises;
var util = require('util');
var input = process.argv.slice(2)[0];
var SPEC_VERSIONS = ['0.5.0', '1.0.0', '1.1.0', '2.0.0'];

const validate = {
  '0.5.0': function(assertion) {
    var errors = validator.validateOldAssertion(assertion.body);
    for (var property in errors) {
      if (errors.hasOwnProperty(property)) {
        assertion.fail(property, errors[property].message, ['0.5.0']);
      }
    }
  },
  '1.0.0': function(assertion) {
    var errors = validator.validateBadgeAssertion(assertion.body);
    for (var property in errors) {
      if (errors.hasOwnProperty(property)) {
        assertion.fail(property, errors[property].message, ['1.0.0']);
      }
    }
  },
  '1.1.0': function(assertion) {
    // First collect any 1.0.0 errors...
    var errors = validator.validateBadgeAssertion(assertion.body);
    for (var property in errors) {
      if (errors.hasOwnProperty(property)) {
        assertion.fail(property, errors[property].message, ['1.1.0']);
      }
    }
    // ...Then apply additional 1.1.0 checks.
    var promise = promises.expand(assertion);
    promise.then(function(expanded) {
      var promise = promises.compact(expanded, expanded['@context']);
      promise.then(function(compacted) {
        assertion.isLinkedData = true;
      }, function(error) {
        assertion.fail('jsonld', error, ['1.1.0']);
      });
    }, function(error) {
      assertion.fail('jsonld', error, ['1.1.0']);
    });
  },
  '2.0.0': function(assertion) {
    assertion.fail('Specification', 'Version 2.0.0 unsupported.', ['2.0.0']);
  }
}

class Assertion {
  public verifyUrl: string;
  public isFetched: boolean;
  public fetchError: string;
  public body: Object;
  public errors: Object;
  public isValid: Object;
  public isLinkedData: boolean;

  constructor(public raw: string) {
    this.raw = raw;
    this.verifyUrl = this.parseVerifyUrl(this.raw);
    this.isFetched = false;
    this.fetchError = '';
    this.body = '';
    this.errors = {};
    this.isValid = {};
    this.isLinkedData = false;
    for (var i = 0; i < SPEC_VERSIONS.length; i++) {
      this.errors[SPEC_VERSIONS[i]] = [];
      this.isValid[SPEC_VERSIONS[i]] = true;
    }
  }

  parseVerifyUrl (rawInput) {
    if (isUrl(rawInput))
      return rawInput;
    if (isJson(rawInput))
      return this.extractVerifyUrl(rawInput);
    return '';
  }

  extractVerifyUrl (json) {
    try {
      var url = json.verify.url;
      if (isUrl(url))
        return url;
      return '';
    } catch(e) { return ''; }
  }

  fail(scope: string, reason: string, versions?:Array<string>, details?: string) {
    versions = versions || SPEC_VERSIONS;
    details = details || '';
    var error = new BadgeError(scope, reason, details);
    for (var i = 0; i < versions.length; i++) {
      this.errors[versions[i]].push(error);
      this.isValid[versions[i]] = false;
    }
  }
}

class BadgeError {
  constructor(public scope: string, public reason: string, public details?: string) {
    this.scope = scope || 'Unknown';
    this.reason = reason || 'No reason provided';
    this.details = details || '';
  }

  toMessage() {
    return this.scope + ': ' + this.reason;
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

function isUrl(str) {
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

function isJson (str) {
  try { JSON.parse(str); return true } catch(e) { return false }
}

function check (input, handleOutput) {
  var assertion = new Assertion(input);
  if (assertion.verifyUrl.length) {
    fetchVerifyUrl(assertion.verifyUrl).then(function(response) {
      if (response !== null && typeof response === 'object') {
        assertion.isFetched = true;
        assertion.body = response;
        for (var i = 0; i < SPEC_VERSIONS.length; i++) {
          validate[SPEC_VERSIONS[i]](assertion);
        }
        handleOutput.output(assertion);
      }
      else {
        assertion.fail('Fetch', 'Not a valid JSON document.');
        handleOutput.output(assertion);
      }
    }, function(error) {
      assertion.fail('Fetch', error);
      handleOutput.output(assertion);
    });
  }
  else {
    assertion.fail('Raw input', 'Not a valid verifier URL');
    handleOutput.output(assertion);
  }
}

function debug(obj) {
  console.log(util.inspect(obj, {showHidden: false, depth: null}));
}

interface OutputHandler {
  output(test: Assertion): void;
}

class CsvWriter {

  constructor (public delimiter?: string, public enclosure?: string) {
    this.delimiter = delimiter || ',';
    this.enclosure = enclosure || '"';
  }

  escapeCol(col) {
    if(isNaN(col)) {
      if (!col || col === '""') {
        col = '';
      } else {
        col = String(col);
        if (col.length) {
          col = col.split( this.enclosure ).join( this.enclosure + this.enclosure );
          col = this.enclosure + col + this.enclosure;
        }
      }
    }
    return col;
  };

  output(assertion: Assertion) {
    console.log(this.toRow(this.toArray(assertion)));
  }

  toArray(assertion: Assertion) {
    var values = [assertion.raw, JSON.stringify(assertion.body), assertion.fetchError];
    for (var i = 0; i < SPEC_VERSIONS.length; i++) {
      var version = SPEC_VERSIONS[i];
      values.push((assertion.errors[version].length) ? 'FAIL' : 'OKAY');
      values.push((assertion.errors[version].length) ? assertion.errors[version][0].toMessage() : '');
    }
    return values;
  }

  toRow(arr) {
      var arr2 = arr.slice(0);
      var i, ii = arr2.length;
      for(i = 0; i < ii; i++) {
          arr2[i] = this.escapeCol(arr2[i]);
      }
      return arr2.join(this.delimiter);
  };
}

(function main () {
  var outputHandler = new CsvWriter();
  check(input, outputHandler);
})();