/**
 * 将 src 对象上的属性拷贝到 dst 对象上，并返回 dst 对象.
 *
 * @param {Object} dst - 目标独享.
 * @param {Object} src - 源对象.
 * @returns {Object} dst 对象.
 */
module.exports = function(dst, src) {
  Object.keys(src).forEach(function(prop) {
    dst[prop] = dst[prop] || src[prop];
  });

  return dst;
};
