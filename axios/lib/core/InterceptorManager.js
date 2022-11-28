'use strict';

import utils from './../utils.js';

/**
 * 拦截器管理器类.
 */
class InterceptorManager {
  constructor() {
    // 存放拦截器的堆栈数组.
    this.handlers = [];
  }

  /**
   * 向堆栈数组中添加一个新的拦截器.
   *
   * @param {Function} fulfilled - 处理 then 的函数.
   * @param {Function} rejected - 处理 reject 的函数.
   * @param {Object} options - .
   *
   * @returns {Number} 拦截器在堆栈数组中的下标，用于删除拦截器使用.
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });

    // 返回拦截器在堆栈数组中的下标作为 ID.
    return this.handlers.length - 1;
  }

  /**
   * 从堆栈数组中移除指定的拦截器.
   *
   * @param {Number} id 待移除拦截器的 ID.
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  /**
   * 清空拦截器堆栈数组.
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }

  /**
   * 遍历拦截器堆栈数组，将每个有效的拦截器作为参数传递给 fn 函数分别执行.
   *
   * @param {Function} fn - The function to call for each interceptor.
   */
  forEach(fn) {
    utils.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}

export default InterceptorManager;
