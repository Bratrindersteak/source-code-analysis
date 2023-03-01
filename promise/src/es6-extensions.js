'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js');

module.exports = Promise;

/* Static Functions */

var TRUE = valuePromise(true);
var FALSE = valuePromise(false);
var NULL = valuePromise(null);
var UNDEFINED = valuePromise(undefined);
var ZERO = valuePromise(0);
var EMPTYSTRING = valuePromise('');

function valuePromise(value) {
  var p = new Promise(Promise._noop);
  p._state = 1;
  p._value = value;
  return p;
}
Promise.resolve = function (value) {
  if (value instanceof Promise) return value;

  if (value === null) return NULL;
  if (value === undefined) return UNDEFINED;
  if (value === true) return TRUE;
  if (value === false) return FALSE;
  if (value === 0) return ZERO;
  if (value === '') return EMPTYSTRING;

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new Promise(then.bind(value));
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex);
      });
    }
  }
  return valuePromise(value);
};

/**
 * 将可迭代对象或类数组对象转化为数组.
 *
 * @private
 *
 * @param {object|array} iterable - 待转化的可迭代对象或类数组对象.
 *
 * @returns {*[]} 转化好的数组.
 */
var iterableToArray = function (iterable) {
  // 优先使用 Array.from 方法，此方法可接受数组、迭代对象、类数组对象.
  if (typeof Array.from === 'function') {
    iterableToArray = Array.from;
    return Array.from(iterable);
  }

  // 否则使用 Array.prototype.slice 方法代替，此方法可接受数组、类数组对象，但不接受可迭代对象.
  iterableToArray = function (x) { return Array.prototype.slice.call(x); };
  return Array.prototype.slice.call(iterable);
}

Promise.all = function (arr) {
  // 转换参数类型，将可迭代对象转化为数组.
  var args = iterableToArray(arr);

  // 返回一个新的 promise 对象.
  return new Promise(function (resolve, reject) {
    // 若参数长度为 0 则直接调用 resolve 返回空数组.
    if (args.length === 0) return resolve([]);

    var remaining = args.length;

    function res(i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof Promise && val.then === Promise.prototype.then) {
          while (val._state === 3) {
            val = val._value;
          }
          if (val._state === 1) return res(i, val._value);
          if (val._state === 2) reject(val._value);
          val.then(function (val) {
            res(i, val);
          }, reject);
          return;
        } else {
          var then = val.then;
          if (typeof then === 'function') {
            var p = new Promise(then.bind(val));
            p.then(function (val) {
              res(i, val);
            }, reject);
            return;
          }
        }
      }
      args[i] = val;
      if (--remaining === 0) {
        resolve(args);
      }
    }

    // 遍历参数数组依次执行.
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

function onSettledFulfill(value) {
  return { status: 'fulfilled', value: value };
}
function onSettledReject(reason) {
  return { status: 'rejected', reason: reason };
}
function mapAllSettled(item) {
  if(item && (typeof item === 'object' || typeof item === 'function')){
    if(item instanceof Promise && item.then === Promise.prototype.then){
      return item.then(onSettledFulfill, onSettledReject);
    }
    var then = item.then;
    if (typeof then === 'function') {
      return new Promise(then.bind(item)).then(onSettledFulfill, onSettledReject)
    }
  }

  return onSettledFulfill(item);
}
Promise.allSettled = function (iterable) {
  return Promise.all(iterableToArray(iterable).map(mapAllSettled));
};

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value);
  });
};

Promise.race = function (values) {
  return new Promise(function (resolve, reject) {
    iterableToArray(values).forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    });
  });
};

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
};

function getAggregateError(errors){
  if(typeof AggregateError === 'function'){
    return new AggregateError(errors,'All promises were rejected');
  }

  var error = new Error('All promises were rejected');

  error.name = 'AggregateError';
  error.errors = errors;

  return error;
}

Promise.any = function promiseAny(values) {
  return new Promise(function(resolve, reject) {
    var promises = iterableToArray(values);
    var hasResolved = false;
    var rejectionReasons = [];

    function resolveOnce(value) {
      if (!hasResolved) {
        hasResolved = true;
        resolve(value);
      }
    }

    function rejectionCheck(reason) {
      rejectionReasons.push(reason);

      if (rejectionReasons.length === promises.length) {
        reject(getAggregateError(rejectionReasons));
      }
    }

    if(promises.length === 0){
      reject(getAggregateError(rejectionReasons));
    } else {
      promises.forEach(function(value){
        Promise.resolve(value).then(resolveOnce, rejectionCheck);
      });
    }
  });
};
