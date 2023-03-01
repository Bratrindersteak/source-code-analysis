'use strict';

var Promise = require('./core.js');

module.exports = Promise;

/**
 * 新建一个 resolve 的实例执行 finally 提供的回调函数.
 * 然后用 then 将 finally 之前的值返回.
 *
 * @param {function} f - 执行 finally 的回调函数.
 *
 * @returns {Promise<*>} .
 */
Promise.prototype.finally = function (f) {
  return this.then(function (value) {
    return Promise.resolve(f()).then(function () {
      return value;
    });
  }, function (err) {
    return Promise.resolve(f()).then(function () {
      throw err;
    });
  });
};
