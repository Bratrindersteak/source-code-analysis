'use strict';

import utils from './../utils.js';

/**
 * 判断抛出的错误是否是 AxiosError 实例对象.
 *
 * @param {*} payload - 待判断的错误.
 *
 * @returns {boolean} 判断结果.
 */
export default function isAxiosError(payload) {
  return utils.isObject(payload) && (payload.isAxiosError === true);
}
