const CONTEXT_IRI = {
  '1.1.0': 'https://w3id.org/openbadges/v1'
};
module.exports = {
  'replaceAll': function (object, replacements) {
    return replaceAll(object, replacements);
  },
  'MyExtension': function (replacements) {
    return replaceAll({
      'extensions:MyExtension': {
        '@context': 'http://openbadgespec.org/extensions/MyExtension/context.json',
        type: ['Extension', 'extensions:MyExtension'],
        myBoolean: true,
        myInteger: 2,
        myString: 'foo',
        myObject: {
          myProperty: 'myValue'
        },
        myOptionalString: 'bar'
      }
    }, replacements);
  },
  'MyExtension-context': function (replacements) {
    return replaceAll({
      '@context': {
        'obi': 'https://w3id.org/openbadges#',
        'url': 'https://example.org/1.1/MyExtension/context.json',
      },
      'obi:validation': [
        {
          'obi:validatesType': 'extensions:MyExtension',
          'obi:validationSchema': 'http://openbadgespec.org/extensions/MyExtension/schema.json'
        }
      ]
    }, replacements);
  },
  'MyExtension-schema': function (replacements) {
    return replaceAll({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'title': 'My Extension',
      'description': 'This extension is for test purposes only.',
      'type': 'object',
      'properties': {
        'myBoolean': {
          'type': 'boolean'
        },
        'myInteger': {
          'type': 'integer'
        },
        'myString': {
          'type': 'string'
        },
        'myObject': {
          'type': 'object'
        },
        'myOptionalString': {
          'type': 'string'
        }
      },
      'required': ['myBoolean', 'myInteger', 'myString', 'myObject']
    }, replacements);
  },
  'ExampleExtension': function (replacements) {
    return replaceAll({
      'extensions:ExampleExtension': {
        '@context': 'https://openbadgespec.org/extensions/exampleExtension/context.json',
        'type': ['Extension', 'extensions:ExampleExtension'],
        'exampleProperty': "I'm a property, short and sweet."
      }
    }, replacements);
  },
  'ExampleExtension-context': function (replacements) {
    return replaceAll({
      '@context': {
        'obi': 'https://w3id.org/openbadges#',
        'exampleProperty': 'http://schema.org/text'
      },
      'obi:validation': [
        {
          'obi:validatesType': 'obi:extensions/#ExampleExtension',
          'obi:validationSchema': 'https://openbadgespec.org/extensions/exampleExtension/schema.json'
        }
      ]
    }, replacements);
  },
  'ExampleExtension-schema': function (replacements) {
    return replaceAll({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'title': '1.1 Open Badge Example Extension',
      'description': 'An extension that allows you to add a single string exampleProperty to an extension object to represent some of your favorite text.',
      'type': 'object',
      'properties': {
        'exampleProperty': {
          'type': 'string'
        }
      },
      'required': ['exampleProperty']
    }, replacements);
  },
  'ApplyLink': function (replacements) {
    return replaceAll({
      'extensions:ApplyLink': {
        '@context': 'https://openbadgespec.org/extensions/applyLinkExtension/context.json',
        'type': ['Extension', 'extensions:ApplyLink'],
        'url': 'http://website.com/apply'
      }
    }, replacements);
  },
  'ApplyLink-context': function (replacements) {
    return replaceAll({
      '@context': {
        'obi': 'https://w3id.org/openbadges#',
        'extensions': 'https://w3id.org/openbadges/extensions#',
        'url': 'extensions:#applyLink',
      },
      'obi:validation': [
        {
          'obi:validatesType': 'extensions#applyLinkExtension',
          'obi:validationSchema': 'https://openbadgespec.org/extensions/applyLinkExtension/schema.json'
        }
      ]
    }, replacements);
  },
  'ApplyLink-schema': function (replacements) {
    return replaceAll({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'title': 'Apply Link',
      'description': 'An extension that allows you to add a single url to a web page providing information on how earners may apply for a badge.',
      'type': 'object',
      'properties': {
        'url': {
          'type': 'string',
          'format': 'uri'
        }
      },
      'required': ['url']
    }, replacements);
  },
  'Endorsement': function (replacements) {
    return replaceAll({'extensions:Endorsement': {
        '@context': 'https://w3id.org/openbadges/extensions/endorsement/context.json',
        'type': ['Extension', 'extensions:Endorsement'],
        'description': 'This badge is truly a work of art, and meaningful for its earners besides.',
        'endorsedObject': {
          '**': '*** Full copy of endorsed object ***'
        }
      }
    }, replacements);
  },
  'Endorsement-context': function (replacements) {
    return replaceAll({
      '@context': {
        'obi': 'https://w3id.org/openbadges#',
        'endorsement': 'https://w3id.org/openbadges/extensions#Endorsement',
        'endorsedObject': { '@id': 'endorsement:/endorsedObject'}
      },
      'obi:validation': [
        {
          'obi:validatesType': 'endorsement',
          'obi:validationSchema': 'https://w3id.org/openbadges/extensions/endorsement/schema.json'
        }
      ]
    }, replacements);
  },
  'Endorsement-schema': function (replacements) {
    return replaceAll({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'title': 'Open Badges Endorsement Extension v1.0',
      'description': "Endorse another badge object by including this extension in an assertion that has a Badge Object as its recipient. A 'description' property within the extension may be used to describe the specific endorsement instance.",
      'type': 'object',
      'properties': {
        'description': {
          'type': 'string'
        },
        'endorsedObject': {
          'type': 'object'
        }
      },
      'required': ['description']
    }, replacements);
  },
  'Location': function (replacements) {
    return replaceAll({
      'schema:location': {
        '@context': 'https://openbadgespec.org/extensions/geoCoordinatesExtension/context.json',
        'type': ['Extension', 'extensions:GeoCoordinates', 'schema:Place'],
        'name': 'Stadium of Light, Sunderland',
        'description': 'A foodball stadium in Sunderland, England that is home to Sunderland A.F.C.',
        'geo': {
          'latitude': 54.914440,
          'longitude': -1.387721
        }
      }
    }, replacements);
  },
  'Location-context': function (replacements) {
    return replaceAll({
      '@context': {
        'obi': 'https://w3id.org/openbadges#',
        'schema': 'http://schema.org/',
        'extensions': 'https://w3id.org/openbadges/extensions#',
        'geo': 'schema:geo',
        'name': 'schema:name',
        'description': 'schema:description',
        'latitude': 'schema:latitude',
        'longitude': 'schema:longitude'
      },
      'obi:validation': [
        {
          'obi:validatesType': 'extensions:GeoCoordinates',
          'obi:validationSchema': 'https://w3id.org/openbadges/extensions/geoCoordinatesExtension/schema.json'
        }
      ]
    }, replacements);
  },
  'Location-schema': function (replacements) {
    return replaceAll({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'title': 'GeoCoordinates Open Badges Extension',
      'description': "An extension allowing for the addition of the geographic coordinates associated with a badge object. For example, geolocation could represent where a Badge Class is available, where a badge was earned or the location of an issuer. The required description property allows implementers to be more specific about the reason location is included. Implements Schema.org's Place class",
      'type': 'object',
      'properties': {
        'name': {'type': 'string'},
        'description': { 'type': 'string' },
        'geo': {
          'type': 'object',
          'properties': {
            'latitude': { 'type': 'number' },
            'longitude': { 'type': 'number' }
          },
          'required': ['latitude', 'longitude']
        },
        'required': ['description', 'geo']
      }
    }, replacements);
  },
  'Accessibility': function (replacements) {
    return replaceAll({
      'extensions:Accessibility': {
        '@context': 'https://w3id.org/openbadges/extensions/accessibilityExtension/context.json',
        'type': ['Extension', 'extensions:Accessibility'],
        'accessibilityAPI': 'ARIA',
        'accessibilityControl': ['fullKeyboardControl', 'fullMouseControl', 'fullTouchControl'],
        'accessibilityFeature': 'audioDescription',
        'accessibilityHazard': 'noFlashingHazard',
        'url': 'http://exampleaccessiblecontent.org/'
      }
    }, replacements);
  },
  'Accessibility-context': function (replacements) {
    return replaceAll({
      '@context': {
        'obi': 'https://w3id.org/openbadges#',
        'extensions': 'https://w3id.org/openbadges/extensions#',
        'url': 'extensions:#accessibility',
        'accessibilityAPI': 'https://schema.org/accessibilityAPI',
        'accessibilityControl': 'https://schema.org/accessibilityControl',
        'accessibilityFeature': 'https://schema.org/accessibilityFeature',
        'accessibilityHazard': 'https://schema.org/accessibilityHazard'
      },
      'obi:validation': [
        {
          'obi:validatesType': 'extensions#accessibility',
          'obi:validationSchema': 'https://openbadgespec.org/extensions/accessibilityExtension/schema.json'
        }
      ]
    }, replacements);
  },
  'Accessibility-schema': function (replacements) {
    return replaceAll({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'title': 'Accessibility extension',
      'description': 'An extension allowing for the addition of the accessibility informations.',
      'type': 'object',
      'properties': {
        'accessibilityAPI': {
          'type': 'string'
        },
        'accessibilityControl': {
          'type': 'array',
          'items': {
            'type': 'string'
          }
        },
        'accessibilityFeature': {
          'type': 'string'
        },
        'accessibilityHazard': {
          'type': 'string'
        },
        'url': {
          'type': 'string',
          'format': 'uri'
        },
        'required': ['url', 'accessibilityFeature']
      }
    }
      , replacements);
  },
  'OriginalCreator': function (replacements) {
    return replaceAll({
      'extensions:OriginalCreator': {
        '@context': 'https://openbadgespec.org/extensions/originalCreatorExtension/context.json',
        'type': ['Extension', 'extensions:OriginalCreator'],
        'url': 'https://example.org/creator-organisation.json'
      }
    }, replacements);
  },
  'OriginalCreator-context': function (replacements) {
    return replaceAll({
      '@context': {
        'obi': 'https://w3id.org/openbadges#',
        'extensions': 'https://w3id.org/openbadges/extensions#',
        'url': 'extensions:#originalCreator'
      },
      'obi:validation': [
        {
          'obi:validatesType': 'extensions:originalCreator',
          'obi:validationSchema': 'https://openbadgespec.org/extensions/originalCreatorExtension/schema.json'
        }
      ]
    }, replacements);
  },
  'OriginalCreator-schema': function (replacements) {
    return replaceAll({
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'title': 'Original Creator',
      'description': 'When a badge is shared with another issuer, this extension allows you to show the original creator of the badge.',
      'type': 'object',
      'properties': {
        'url': {
          'type': 'string',
          'format': 'uri'
        }
      },
      'required': ['url']
    }, replacements);
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

function sha (input, salt) {
  const hasher = require('crypto').createHash('sha256');
  hasher.update(input + (salt || ''));
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

function objReplace (obj, dotString, value) {
  const keys = dotString.split('.');
  const target = keys.pop();
  const ref = keys.reduce(function (obj, key) {
    if (obj[key])
      return obj[key];
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

function replaceAll (obj, replacements) {
  replacements = replacements || {};
  Object.keys(replacements).forEach(function (dotString) {
    const value = replacements[dotString];
    objReplace(obj, dotString, value);
  });
  return obj;
}
