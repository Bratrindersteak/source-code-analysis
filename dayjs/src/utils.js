import * as C from './constant'

/**
 * 在字符串开头补充填充值，类似于String.prototype.padStart().
 * @param {string} string - 源字符串.
 * @param {number} length - 返回的字符串长度.
 * @param {string} pad - 填充字符串.
 * @returns {string}
 */
const padStart = (string, length, pad) => {
  const s = String(string)
  if (!s || s.length >= length) return string
  return `${Array((length + 1) - s.length).join(pad)}${string}`
}

/**
 * 返回实例的UTC偏移量（分钟）转化成的 [+|-]HH:mm的格式.
 * @param instance
 * @returns {string}
 */
const padZoneStr = (instance) => {
  const negMinutes = -instance.utcOffset() // -480
  const minutes = Math.abs(negMinutes)
  const hourOffset = Math.floor(minutes / 60)
  const minuteOffset = minutes % 60

  // +08:00.
  return `${negMinutes <= 0 ? '+' : '-'}${padStart(hourOffset, 2, '0')}:${padStart(minuteOffset, 2, '0')}`
}

/**
 *  求两个Dayjs实例的月份差.
 * @param a - Dayjs实例a.
 * @param b - Dayjs实例b.
 * @returns {number}
 */
const monthDiff = (a, b) => {
  // function from moment.js in order to keep the same result
  if (a.date() < b.date()) return -monthDiff(b, a)
  const wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month())
  const anchor = a.clone().add(wholeMonthDiff, C.M)
  const c = b - anchor < 0
  const anchor2 = a.clone().add(wholeMonthDiff + (c ? -1 : 1), C.M)
  return +(-(wholeMonthDiff + ((b - anchor) / (c ? (anchor - anchor2) :
    (anchor2 - anchor)))) || 0)
}

/**
 * 取整，去掉小数部分.
 * @param {number} n - 待取整的数字.
 * @returns {number}
 */
const absFloor = n => (n < 0 ? Math.ceil(n) || 0 : Math.floor(n))

/**
 * 用缩写字母获取对应的时间单位名称.
 * @param {string} u - 缩写字母.
 * @returns {string}
 */
const prettyUnit = (u) => {
  const special = {
    M: C.M,
    y: C.Y,
    w: C.W,
    d: C.D,
    D: C.DATE,
    h: C.H,
    m: C.MIN,
    s: C.S,
    ms: C.MS,
    Q: C.Q
  }

  // 如果没匹配上，则将原字符串转小写并去掉尾部s字符后返回.
  return special[u] || String(u || '').toLowerCase().replace(/s$/, '')
}

/**
 * 判断传入的值是否为undefined.
 * @param {any} s - 要判断的值.
 * @returns {boolean}
 */
const isUndefined = s => s === undefined

export default {
  s: padStart,
  z: padZoneStr,
  m: monthDiff,
  a: absFloor,
  p: prettyUnit,
  u: isUndefined
}
