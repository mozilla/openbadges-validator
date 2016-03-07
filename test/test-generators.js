const CONTEXT_IRI = {
  '1.1.0': 'https://w3id.org/openbadges/v1'
}
module.exports = {
  '0.5.0' : function (replacements) {
    return replaceAll({
      recipient: sha('brian@mozillafoundation.org', 'seasalt'),
      salt: 'seasalt',
      evidence: '/evidence',
      expires: '2013-06-06',
      issued_on: '2013-01-01',
      badge: {
        version: '0.5.0',
        criteria: '/criteria',
        image: 'https://example.org/image',
        name: 'Some Awesome Badge',
        description: 'This is a description',
        issuer: {
          origin: 'https://example.org',
          name: 'Example',
          org: 'Organization',
          contact: 'guy@example.org',
        },
      },
    }, replacements);
  },
  '0.5.0-plain-recipient': function (replacements) {
    return replaceAll({
      parse: {version: '0.5.0'},
      assertion: {
        recipient: 'foo@bar.org'
      }
    }, replacements);
  },
  '0.5.0-hashed-recipient': function (replacements) {
    return replaceAll({
      parse: {version: '0.5.0'},
      assertion: {
        salt: 'lol',
        recipient: 'sha256$abcd'
      }
    }, replacements);
  },
  '1.0.0-assertion': function (replacements) {
    return replaceAll({
      uid: 'd3c4ff',
      recipient: {
        identity: sha('brian@mozillafoundation.org', 'seasalt'),
        salt: 'seasalt',
        hashed: true,
        type: 'email'
      },
      verify: {
        type: 'hosted',
        url: 'https://example.org/assertion'
      },
      badge: 'https://example.org/badge',
      issuedOn: '2013-02-18T18:10+0500',
      image: 'https://example.org/assertion-image',
      evidence: 'https://example.org/evidence',
      expires: '2014-02-18T18:10+0500',
    }, replacements);
  },
  '1.0.0-badge': function (replacements) {
    return replaceAll({
      name: 'Some Badge',
      description: 'A short description of the badge',
      image: 'https://example.org/badge-image',
      criteria: 'https://example.org/criteria',
      issuer: 'https://example.org/issuer',
      alignment: [
        { name: 'Standard One',
          url: 'https://standards.example.org/1',
          description: 'some standard'
        },
        { name: 'Standard Two',
          url: 'https://standards.example.org/2',
          description: 'some other standard'
        },
      ],
      tags: [
        'generic',
        'badge',
        'stuff'
      ]
    }, replacements);
  },
  '1.0.0-issuer': function (replacements) {
    return replaceAll({
      name: 'Some Issuer',
      url: 'https://example.org',
      description: 'We issue example badges.',
      image: 'https://example.org/issuer-image',
      email: 'brian@example.org',
      revocationList: 'https://example.org/revocation-list'
    }, replacements)
  },
  '1.0.0-plain-recipient': function (replacements) {
    return replaceAll({
      parse: {version: '1.0.0'},
      assertion: {
        recipient: {
          hashed: false,
          type: 'email',
          identity: 'foo@bar.org'
        }
      }
    }, replacements);
  },
  '1.0.0-hashed-recipient': function (replacements) {
    return replaceAll({
      parse: {version: '1.0.0'},
      assertion: {
        recipient: {
          hashed: true,
          type: 'email',
          identity: 'sha256$abcd'
        }
      }
    }, replacements);
  },
  '1.1.0-assertion': function (replacements) {
    return replaceAll({
      '@context': CONTEXT_IRI['1.1.0'],
      type: 'Assertion',
      id: 'https://example.org/assertion/1',
      uid: 'd3c4ff',
      recipient: {
        identity: sha('brian@mozillafoundation.org', 'seasalt'),
        salt: 'seasalt',
        hashed: true,
        type: 'email'
      },
      verify: {
        type: 'hosted',
        url: 'https://example.org/1.1/assertion'
      },
      badge: 'https://example.org/1.1/badge',
      issuedOn: '2013-02-18T18:10+0500',
      image: 'https://example.org/assertion-image',
      evidence: 'https://example.org/evidence',
      expires: '2014-02-18T18:10+0500',
    }, replacements);
  },
  '1.1.0-badge': function (replacements) {
    return replaceAll({
      '@context': CONTEXT_IRI['1.1.0'],
      type: 'BadgeClass',
      id: 'https://example.org/badge',
      name: 'Some Badge',
      description: 'A short description of the badge',
      image: 'https://example.org/badge-image',
      criteria: 'https://example.org/criteria',
      issuer: 'https://example.org/1.1/issuer',
      alignment: [
        { name: 'Standard One',
          url: 'https://standards.example.org/1',
          description: 'some standard'
        },
        { name: 'Standard Two',
          url: 'https://standards.example.org/2',
          description: 'some other standard'
        },
      ],
      tags: [
        'generic',
        'badge',
        'stuff'
      ]
    }, replacements);
  },
  '1.1.0-issuer': function (replacements) {
    return replaceAll({
      '@context': CONTEXT_IRI['1.1.0'],
      type: 'Issuer',
      id: 'https://example.org/issuer',
      name: 'Some Issuer',
      url: 'https://example.org',
      description: 'We issue example badges.',
      image: 'https://example.org/issuer-image',
      email: 'brian@example.org',
      revocationList: 'https://example.org/revocation-list'
    }, replacements)
  },
  '1.1.0-extension': function (replacements) {
    return replaceAll({
      '@context': 'http://example.org/1.1/MyExtension/context.json',
      type: ['Extension', 'extensions:MyExtension'],
      myBoolean: true,
      myInteger: 2,
      myString: 'foo',
      myObject: {
        myProperty: 'myValue'
      },
      myOptionalString: 'bar'
    }, replacements)
  },
  '1.1.0-extension-context': function (replacements) {
    return replaceAll({
      "@context": {
        "obi": "https://w3id.org/openbadges#",
        "extensions": "https://example.org/",
        "url": "extensions:1.1/MyExtension/context.json",
      },
      "obi:validation": [
        {
          "obi:validatesType": "extensions:MyExtension",
          "obi:validationSchema": "extensions:1.1/MyExtension/schema.json"
        }
      ]
    }, replacements)
  },
  '1.1.0-extension-schema': function (replacements) {
    return replaceAll({
      "$schema": "http://json-schema.org/draft-04/schema#",
      "title": "My Extension",
      "description": "This extension is for test purposes only.",
      "type": "object",
      "properties": {
        "myBoolean": {
          "type": "boolean"
        },
        "myInteger": {
          "type": "integer"
        },
        "myString": {
          "type": "string"
        },
        "myObject": {
          "type": "object"
        },
        "myOptionalString": {
          "type": "string"
        }
      },
      "required": ["myBoolean", "myInteger", "myString", "myObject"]
    }, replacements)
  }
};

/** utility methods */

/**
 * Create a self-identifying sha256 hash string
 *
 * @param {String} input
 * @param {String} salt, optional
 * @return {String}
 */

function sha(input, salt) {
  const hasher = require('crypto').createHash('sha256');
  hasher.update(input + (salt||''));
  return 'sha256$' + hasher.digest('hex');
}

/**
 * Safely replace a property in an object with a value. Operates on
 * the object in-place.
 *
 * @param {Object} obj
 * @param {String} dotString String representing the path of the
 *   property to replace. For example, if the target property is
 *   `{ x: { y : { z : 'hi' }`, the `dotString` would be "x.y.z".
 */

function objReplace(obj, dotString, value) {
  const keys = dotString.split('.');
  const target = keys.pop();
  const ref = keys.reduce(function (obj, key) {
    if (obj[key])
      return obj[key]
    return (obj[key] = {});
  }, obj);
  ref[target] = value;
}

/**
 * Replace a whole bunch of properties in an object with substitute
 * values. Operates in-place.
 *
 * @param {Object} obj
 * @param {Object} replacements The substitutions to make. Keys should
 *   be in dotted string form, values are the substitute values.
 * @return {Object} The input object, modified in-place
 * @see objReplace
 */

function replaceAll(obj, replacements) {
  replacements = replacements || {};
  Object.keys(replacements).forEach(function (dotString) {
    const value = replacements[dotString];
    objReplace(obj, dotString, value);
  });
  return obj;
}
