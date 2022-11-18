'use strict';

// 导入 tsscmp 模块，使用双 Hmac 进行定时安全字符串比较.
var compare = require('tsscmp');

// 导入 node 内置加密模块.
var crypto = require("crypto");

/**
 *
 * @param keys
 * @param algorithm
 * @param encoding
 * @returns {Keygrip}
 * @constructor
 */
function Keygrip(keys, algorithm, encoding) {
  /* --- 参数校验 start --- */
  if (!algorithm) algorithm = "sha1";
  if (!encoding) encoding = "base64";

  // 若非是带 new 关键字的实例化调用，则帮助其实例化调用.
  if (!(this instanceof Keygrip)) return new Keygrip(keys, algorithm, encoding);

  if (!keys || !(0 in keys)) {
    throw new Error("Keys must be provided.");
  }
  /* --- 参数校验 end --- */

  /**
   *
   * @param data - .
   * @param key - .
   * @returns {*} .
   */
  function sign(data, key) {
    return crypto
      .createHmac(algorithm, key)
      .update(data).digest(encoding)
      .replace(/\/|\+|=/g, function(x) {
        return ({ "/": "_", "+": "-", "=": "" })[x];
      });
  }

  /**
   *
   * @param data - .
   * @returns {*} .
   */
  this.sign = function(data){ return sign(data, keys[0]); };

  /**
   *
   * @param data - .
   * @param digest - .
   * @returns {boolean} .
   */
  this.verify = function(data, digest) {
    return this.index(data, digest) > -1;
  };

  /**
   *
   * @param data - .
   * @param digest - .
   * @returns {number} .
   */
  this.index = function(data, digest) {
    for (var i = 0, l = keys.length; i < l; i++) {
      if (compare(digest, sign(data, keys[i]))) {
        return i;
      }
    }

    return -1;
  };
}

/**
 * 禁止非实例化调用.
 */
Keygrip.sign = Keygrip.verify = Keygrip.index = function() {
  throw new Error("Usage: require('keygrip')(<array-of-keys>)");
};

// 导出 Keygrip 构造函数.
module.exports = Keygrip;
