const fs = require('fs');
const path = require('path');
const jws = require('jws');
const test = require('tap').test;
const validator = require('..');
const nock = require('nock');
const generators = require('./test-generators');
const keys = require('./test-keys');
const dataUrl = require('dataurl');
const Assertion = require('../lib/assertion');
const jsonld = require('jsonld');
const promises = jsonld.promises;

var ORIGIN = 'https://example.org';
var httpScope = nock(ORIGIN);
var imageData = fs.readFileSync(path.join(__dirname, 'cc.large.png'));

var compatibilities = {
  '0.5.0': {'0.5.0': true, '1.0.0': false, '1.1.0': false},
  '1.0.0': {'0.5.0': false, '1.0.0': true, '1.1.0': false},
  '1.1.0': {'0.5.0': false, '1.0.0': true, '1.1.0': true}
}


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

function verify(assertion) {
  if (assertion.verifyUrl.length) {
    fetchVerifyUrl(assertion.verifyUrl).then(function(response) {
      if (response !== null && typeof response === 'object') {
        assertion.isFetched = true;
        assertion.body = response;
        for (var i = 0; i < SPEC_VERSIONS.length; i++) {
          validate[SPEC_VERSIONS[i]](assertion);
        }
        return assertion;
      }
      else {
        assertion.fail('Fetch', 'Not a valid JSON document.');
        return assertion;
      }
    }, function(error) {
      assertion.fail('Fetch', error);
      return assertion;
    });
  }
  else {
    assertion.fail('Raw input', 'Not a valid verifier URL');
    return assertion;
  }
}

test("example", function (t) {
  t.plan(9);
  for (structure in compatibilities) {
    if (compatibilities.hasOwnProperty(structure)) {
      for (spec in compatibilities[structure]) {
        if (compatibilities[structure].hasOwnProperty(spec)) {
          var subtest = structure + " is " + (compatibilities[structure][spec] ? '' : "not ") + "compliant with " + spec;
          var raw = generators[structure + '-assertion']();
          var assertion = new Assertion(raw);
          assertion = verify(assertion);
          // compatibilities[structure][spec]
          t.same(false, assertion.isValid[spec], subtest);
        }
      }
    }
  }
  t.end();
});