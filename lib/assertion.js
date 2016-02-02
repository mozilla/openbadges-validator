'use strict';
const resources = require('../lib/resources');
var SPEC_VERSIONS = ['0.5.0', '1.0.0', '1.1.0', '2.0.0'];
class Assertion {
    constructor(raw) {
        this.raw = raw;
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
    parseVerifyUrl(rawInput) {
        if (isUrl(rawInput))
            return rawInput;
        if (isJson(rawInput))
            return this.extractVerifyUrl(rawInput);
        return '';
    }
    extractVerifyUrl(json) {
        try {
            var url = json.verify.url;
            if (isUrl(url))
                return url;
            return '';
        }
        catch (e) {
            return '';
        }
    }
    fail(scope, reason, versions, details) {
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
    constructor(scope, reason, details) {
        this.scope = scope;
        this.reason = reason;
        this.details = details;
        this.scope = scope || 'Unknown';
        this.reason = reason || 'No reason provided';
        this.details = details || '';
    }
    toMessage() {
        return this.scope + ': ' + this.reason;
    }
}
function fetchVerifyUrl(url) {
    return new Promise(function (resolve, reject) {
        const options = { url: url, json: true, required: true };
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
function isJson(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
/*
declare module "Assertion" {
  export = Assertion;
} */
module.exports = Assertion;
