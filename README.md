# OpenBadges Validator Tools [![Build Status](https://secure.travis-ci.org/mozilla/openbadges-validator.png?branch=master)](http://travis-ci.org/mozilla/openbadges-validator)

# Installing

```bash
$ npm install openbadges-validator
```

# Usage

## validator(assertionOrSignature, callback)
Validate a badge assertion and return an object containing info about
the validated assertion.

The callback is passed two arguments, `(err, info)`.

`info` is an object containing the following properties:

- `version`: Version of the specification that the analyzed assertion
  corresponds to. Currently this will be either "1.0.0" or "0.5.0".

- `signature`: JSON Web Signature representation of the assertion. This
  will only be present if the assertion came in as a JWS.

- `structure`
  - `assertion`: The assertion data
  - `badge`: Badge data related to assertion.
  - `issuer`: Issuer data related to badge.

- `resources`: Object with all of the resources related to the
  assertion, badge and issuer. A list of the possible properties follows
  (properties marked with a star are guaranteed to exist. **NOTE**,
  property names are the literal dotted strings, not deep property
  lookups, i.e, `resources['assertion.image']`.
  - `assertion.image`
  - `assertion.verify.url`
  - `assertion.evidence`
  - `badge.criteria`★
  - `badge.image`★
  - `issuer.url`
  - `issuer.image`
  - `issuer.revocationList`

## validator.getAssertionGUID(assertionOrSignature, callback)

Given a badge assertion, return an alphanumeric string that uniquely
identifies the badge.

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

# License

[MPL 2.0](http://www.mozilla.org/MPL/2.0/)
