'use strict'

/**
 * 导出 compose 函数.
 */
module.exports = compose

/**
 * 实现 Koa2 洋葱模型的方法.
 *
 * @param {Function[]} middleware - 中间件数组.
 * @returns {Function} 返回一个闭包函数.
 */
function compose (middleware) {
  /* --- 参数类型检查 start --- */
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }
  /* --- 参数类型检查 end --- */

  /**
   * 闭包函数.
   *
   * @param {Object} context - 上下文对象.
   * @returns {Promise} 以 promise 形式返回中间件函数.
   */
  return function (context, next) {
    // last called middleware #
    let index = -1;

    return dispatch(0);

    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));

      index = i;

      /* --- 处理 fn start --- */
      // 取出当前中间件函数.
      let fn = middleware[i];

      // 如果 i 等于中间件数组的长度，就将 next 赋值给 fn.
      if (i === middleware.length) fn = next;

      // 如果 fn 还是无值则返回空.
      if (!fn) return Promise.resolve();
      /* --- 处理 fn end --- */

      try {
        // 执行中间件方法，第一个参数是上下文，第二个参数是执行下一个中间件的 dispatch 函数.
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  }
}
