'use strict';

/**
 * 将 baseURL 与 relativeURL 拼接到一起, 拼接时处理好接口处的 '/'.
 * 若 relativeURL 为空则直接返回 baseURL.
 *
 * @param {String} baseURL - 前段 URL.
 * @param {string} relativeURL - 后段 URL.
 *
 * @returns {string} 合并后的 URL.
 */
export default function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}
