'use strict';

/**
 *  判断一个 URL 是否是绝对的.
 *
 *  以双斜杠 // 开头（双斜杠前可以有以字母开头后跟若干个字母、数字、加号、句号、连词符的标识符）的 URL 被认为是绝对 URL.
 *
 * @param {string} url - 待判断的 URL.
 *
 * @returns {boolean} 判断结果.
 */
export default function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
