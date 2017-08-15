# OpenBadges Validator Tools [![Build Status](https://secure.travis-ci.org/mozilla/openbadges-validator.png?branch=master)](http://travis-ci.org/mozilla/openbadges-validator)

# Installing

```bash
$ npm install openbadges-validator
```

# Usage

The following documentation assumes the module has been imported
like so:

```javascript
var validator = require('openbadges-validator');
```

### validator(input, callback, version, verificationType)

Validate a badge assertion and return an object containing info about
the validated assertion.

- `input` (object or string) should be an assertion object, json string representing an assertion object,URL for a hosted assertion, or a signed badge signature.

- `callback` (function) A function taking two parameters `(err, data)`, where `err == null` indicates a valid badge, and `data` is an object containing all validation data collected before an error was thrown.<br><br>Take a look at the structure of [the full resulting `data` object](https://github.com/mozilla/openbadges-validator/wiki/Example-Validator-Result).

- `version` (string) Optional: force the validator to check against a certain specification version. <br>Allowed values: `"0.5.0"`, `"1.0.0"` `"1.1.0"`. 

- `verificationType` (string) Optional: force the validator to use a certain type of verification. <br>Allowed values: `"hosted"`, `"signed"`.

### validator.getAssertionGUID(urlOrSignature, callback)

Given either a hosted assertion URL or a signed assertion,
return an alphanumeric string that uniquely identifies the badge.

The callback is passed two arguments, `(err, guid)`.

If the assertion is hosted, `guid` will be the SHA256 hash of the following 
string:

`hosted:` **assertion URL**

If the assertion is signed, `guid` will be the SHA256 hash of the following
string:

`signed:` **assertion UID** `:` **origin of assertion's public key**

For example, if the signed assertion's public key is hosted at
`https://example.org/public-key` and the assertion's UID is `abcd`, then
the assertion's GUID will be the hex-encoded SHA256 hash of
`signed:abcd:https://example.org`, or
`61ae9c039ecc7d08cac6fea3ed6fa3d47463b34e3f2f3bbe86be33688b2f105a`.

### validator.doesRecipientMatch(info, identity)

Returns a boolean indicating whether or not an assertion has
been issued to a particular recipient.

`info` is an object containing properties about the assertion, as returned
by the `validator` function.

`identity` is an email address. (In the future, identities other than
email addresses may be supported.)

### validator.parseVersion(assertion)

- `assertion` (object)

Returns one of `"1.1.0"`, `"1.0.0"`, `"0.5.0"`, or `false` if no version recognized.

### validator.isSignedBadge(signature)

Returns `true` if the signature can be decoded and looks like a badge.

# Tests

By default, this only runs local tests:

`npm test`

To run all tests (including those that require an internet connection), use:

`node node_modules/tap/bin/tap test/*`

A code coverage report can be generated with `node_modules/.bin/jake test-cov`
(or `jake test-cov` if you have [jake][] installed globally)
and viewed in `cover_html/index.html`.

The coverage tool used is [node-cover][], see its documentation for details.

[jake]: https://github.com/mde/jake
[node-cover]: https://github.com/itay/node-cover

# License

[MPL 2.0](http://www.mozilla.org/MPL/2.0/)
