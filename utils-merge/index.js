/**
 * 将对象 b 并入对象 a，若出现相同属性，则对象 b 的属性覆盖对象 a 的属性.
 *
 * var a = { foo: 'bar' }
 * var b = { bar: 'baz' };
 *
 * merge(a, b); // => { foo: 'bar', bar: 'baz' }
 *
 * @param {Object} a - 对象 a.
 * @param {Object} b - 对象 b.
 * @returns {Object} 合并后的对象 a.
 */
exports = module.exports = function(a, b) {
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }

  return a;
};
