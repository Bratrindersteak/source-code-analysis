'use strict';

import isAbsoluteURL from '../helpers/isAbsoluteURL.js';
import combineURLs from '../helpers/combineURLs.js';

/**
 * 组合 baseURL 和 requestedURL.
 *
 * @param {string} baseURL - 头一段 URL.
 * @param {string} requestedURL - 尾一段 URL.
 *
 * @returns {string} 组合后的 URL.
 */
export default function buildFullPath(baseURL, requestedURL) {
  // 仅当 baseURL 合法且 requestedURL 不为绝对 URL时才将二者组合.
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }

  // 否则直接返回 requestedURL.
  return requestedURL;
}
