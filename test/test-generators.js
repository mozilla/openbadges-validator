module.exports = {
  '0.5.0' : function (replacements) {
    return replaceAll({
      recipient: sha('brian@mozillafoundation.org', 'seasalt'),
      salt: 'seasalt',
      evidence: 'https://example.org',
      expires: '2013-06-06',
      issued_on: '2013-01-01',
      badge: {
        version: '0.5.0',
        criteria: '/criteria',
        image: '/image.png',
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
        url: 'https://example.org/assertion.json'
      },
      badge: 'https://example.org/badge.json',
      issuedOn: '2013-02-18T18:10+0500',
      image: 'https://example.org/image.png',
      evidence: 'https://example.org/evidence.html',
      expires: '2014-02-18T18:10+0500',
    }, replacements);
  },
  '1.0.0-badge': function (replacements) {
    return replaceAll({
      name: 'Some Badge',
      description: 'A short description of the badge',
      image: 'https://example.org/image.png',
      criteria: 'https://example.org/criteria.html',
      issuer: 'https://example.org/issuer.json',
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
    });
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
