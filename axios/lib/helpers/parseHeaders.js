'use strict';

import utils from './../utils.js';

// 不接受多个值的 cookie 名称集合.
const ignoreDuplicateOf = utils.toObjectSet([
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
]);

/**
 * 将 XMLHttpRequest.getAllResponseHeaders() 返回的 headers 字符串解析为 headers 对象.
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} rawHeaders - 待解析的 headers 字符串.
 *
 * @returns {Object} 解析后的 headers 对象.
 */
export default rawHeaders => {
  // 存储解析后的 headers.
  const parsed = {};

  let key;
  let val;
  let i;

  // 先将 rawHeaders 以 \n 分割成字符串数组遍历.
  rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
    // 找到冒号的位置下标，冒号是键值的分隔符.
    i = line.indexOf(':');

    // 取到 cookie 键名，全小写处理.
    key = line.substring(0, i).trim().toLowerCase();

    // 取到 cookie 键值.
    val = line.substring(i + 1).trim();

    // 若未取到 cookie 名则直接返回;
    // 若此 cookie 已添加过键值且此 cookie 不接受多个值，也直接返回.
    if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
      return;
    }

    // set-cookie 这个键的值要设置为数组，再次添加时直接向数组添加;
    // 其他键的值设置为字符串，再次添加时使用逗号加一个空格分割.
    if (key === 'set-cookie') {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};
