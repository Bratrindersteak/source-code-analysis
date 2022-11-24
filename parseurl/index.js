'use strict';

/**
 * 导入 url 模块.
 */
var url = require('url');
var parse = url.parse;
var Url = url.Url;

/**
 * @module
 * 导出 parseurl 方法，并将 originalurl 方法挂在 parseurl 方法的 original 属性上.
 */
module.exports = parseurl;
module.exports.original = originalurl;

/**
 * Parse the `req` url with memoization.
 *
 * @public
 * @param {ServerRequest} req - .
 * @returns {Object} .
 */
function parseurl (req) {
  var url = req.url;

  if (url === undefined) {
    // URL is undefined
    return undefined;
  }

  var parsed = req._parsedUrl;

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed;
  }

  // Parse the URL
  parsed = fastparse(url);
  parsed._raw = url;

  return (req._parsedUrl = parsed);
}

/**
 * Parse the `req` original url with fallback and memoization.
 *
 * @public
 * @param {ServerRequest} req - .
 * @returns {Object} .
 */
function originalurl (req) {
  var url = req.originalUrl;

  if (typeof url !== 'string') {
    // Fallback
    return parseurl(req);
  }

  var parsed = req._parsedOriginalUrl;

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed;
  }

  // Parse the URL
  parsed = fastparse(url);
  parsed._raw = url;

  return (req._parsedOriginalUrl = parsed);
}

/**
 * Parse the `str` url with fast-path short-cut.
 *
 * @private
 * @param {string} str - .
 * @return {Object} .
 */
function fastparse (str) {
  if (typeof str !== 'string' || str.charCodeAt(0) !== 0x2f /* / */) {
    return parse(str);
  }

  var pathname = str;
  var query = null;
  var search = null;

  // This takes the regexp from https://github.com/joyent/node/pull/7878
  // Which is /^(\/[^?#\s]*)(\?[^#\s]*)?$/
  // And unrolls it into a for loop
  for (var i = 1; i < str.length; i++) {
    switch (str.charCodeAt(i)) {
      case 0x3f: /* ?  */
        if (search === null) {
          pathname = str.substring(0, i);
          query = str.substring(i + 1);
          search = str.substring(i);
        }
        break;
      case 0x09: /* \t */
      case 0x0a: /* \n */
      case 0x0c: /* \f */
      case 0x0d: /* \r */
      case 0x20: /*    */
      case 0x23: /* #  */
      case 0xa0:
      case 0xfeff:
        return parse(str);
    }
  }

  var url = Url !== undefined
    ? new Url()
    : {};

  url.path = str;
  url.href = str;
  url.pathname = pathname;

  if (search !== null) {
    url.query = query;
    url.search = search;
  }

  return url;
}

/**
 * Determine if parsed is still fresh for url.
 *
 * @private
 * @param {string} url- .
 * @param {object} parsedUrl - .
 * @returns {boolean} .
 */
function fresh (url, parsedUrl) {
  return typeof parsedUrl === 'object' &&
    parsedUrl !== null &&
    (Url === undefined || parsedUrl instanceof Url) &&
    parsedUrl._raw === url;
}
