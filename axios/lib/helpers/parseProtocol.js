'use strict';

/**
 * 从请求的 URL 中解析出协议名称.
 *
 * @param {string} url - 请求的 URL.
 *
 * @returns {string} 协议名称.
 */
export default function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
}
