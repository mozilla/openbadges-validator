# OpenBadges Validator Tools [![Build Status](https://secure.travis-ci.org/mozilla/openbadges-validator.png?branch=master)](http://travis-ci.org/mozilla/openbadges-validator)

# Usage

## validator(assertionOrSignatuure, callback)
The callback is passed two arguments, `(err, info)`.

`info` is an object containing the following properties:
- `version`: Version of the specification that the analyzed assertion
  corresponds to. Currently, either "1.0.0" or "0.5.0".
- `signature`: JSON Web Signature representation of the assertion. This
  will only be present if the assertion came in as a JWS.
- `assertion`: The assertion data
- `badge`: Badge data related to assertion.
- `issuer`: Issuer data related to badge.
- `resources`: Object with all of the resources related to the
  assertion, badge and issuer. A list of the possible properties
  follows (properties marked with a star are guaranteed to exist.
  - `assertion.image`
  - `assertion.verify.url`
  - `assertion.evidence`
  - `badge.criteria`★
  - `badge.image`★
  - `issuer.url`
  - `issuer.image`
  - `issuer.revocationList`
