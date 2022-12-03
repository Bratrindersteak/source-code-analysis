'use strict';

/**
 * 判断请求是否已经取消.
 *
 * @param {Error} value - 待判断的错误对象.
 *
 * @returns {boolean} 判断结果.
 */
export default function isCancel(value) {
  return !!(value && value.__CANCEL__);
}
