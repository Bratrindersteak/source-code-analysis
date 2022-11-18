'use strict';

// 导入 node 内置加密模块.
var crypto = require('crypto');

/**
 * 比较给定 ArrayBuffer、Buffer、TypedArray 或 DataView 实例的底层字节是否相等.
 *
 * @param a {ArrayBuffer|Buffer|TypedArray|DataView} - 实例a.
 * @param b {ArrayBuffer|Buffer|TypedArray|DataView} - 实例b.
 * @returns {boolean} 比较结果.
 */
function bufferEqual(a, b) {
  // 若长度不相等，则返回 false.
  if (a.length !== b.length) {
    return false;
  }

  // 使用恒定时间算法比较给定 ArrayBuffer、Buffer、TypedArray 或 DataView 实例的底层字节是否相等.
  if (crypto.timingSafeEqual) {
    return crypto.timingSafeEqual(a, b);
  }

  // 遍历实例进行比较，若有一个子项不相等则立即返回 false.
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  // 若以上判断都通过，则认为相等.
  return true;
}

/**
 * 使用双 Hmac 进行定时安全字符串比较.
 *
 * @param a {string} - 字符串a.
 * @param b {string} - 字符串b.
 * @returns {boolean} 比较结果.
 */
function timeSafeCompare(a, b) {
  var sa = String(a);
  var sb = String(b);
  var key = crypto.pseudoRandomBytes(32);
  var ah = crypto.createHmac('sha256', key).update(sa).digest();
  var bh = crypto.createHmac('sha256', key).update(sb).digest();

  // 当 hmac 对象和字符串比较都相等时才是真的相等.
  return bufferEqual(ah, bh) && a === b;
}

// 导出比较方法.
module.exports = timeSafeCompare;
