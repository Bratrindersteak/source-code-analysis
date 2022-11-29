'use strict';

/**
 * 该方法用于改变指定函数的上下文绑定.
 * 将 thisArg 对象作为上下文绑定给 fn 函数.
 *
 * @param {Function} fn - 待绑定上下文的函数.
 * @param {Object} thisArg - 上下文对象.
 * @returns {function(): *} 绑定好上下文的闭包函数.
 */
export default function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
