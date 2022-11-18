import * as C from './constant'
import en from './locale/en'
import U from './utils'

let L = 'en' // 当前使用的国际化名称，初始指定en.
const Ls = {} // 存放已加载的国际化配置项.
Ls[L] = en

/**
 * 判断是否为Dayjs实例.
 * @param {any} d - 待判断的值.
 * @returns {boolean}
 */
const isDayjs = d => d instanceof Dayjs // eslint-disable-line no-use-before-define

/**
 * 解析国际化配置.
 * @param {string|object} preset - 待解析的配置.
 * @param {object} [object] - 自定义的国际化配置项.
 * @param {boolean} [isLocal] - 是否为本地的locale.
 * @returns {string} 国际化名称.
 */
const parseLocale = (preset, object, isLocal) => {
  let l
  if (!preset) return L // 没传参数时，返回当前使用的国际化名称.
  if (typeof preset === 'string') {
    if (Ls[preset]) {
      l = preset
    }
    if (object) {
      Ls[preset] = object
      l = preset
    }
  } else {
    const { name } = preset
    Ls[name] = preset
    l = name
  }
  if (!isLocal && l) L = l // 当isLocal指定为true时，则不会修改当前使用的国际化名称.
  return l || (!isLocal && L)
}

/**
 * 实例方法.
 * @param {any} date - .
 * @param {object} [c] - 配置.
 * @returns {object} - Dayjs实例.
 */
const dayjs = function (date, c) {
  if (isDayjs(date)) {
    // 如果是Dayjs的实例，则clone一个新的返回.
    return date.clone()
  }
  // eslint-disable-next-line no-nested-ternary
  const cfg = typeof c === 'object' ? c : {}
  cfg.date = date
  cfg.args = arguments// eslint-disable-line prefer-rest-params
  return new Dayjs(cfg) // eslint-disable-line no-use-before-define
}

/**
 * 根据Date对象和Dayjs实例封装出一个新的Dayjs实例.
 * @param date - Date对象.
 * @param instance - Dayjs实例.
 * @returns {*|Dayjs}
 */
const wrapper = (date, instance) =>
  dayjs(date, {
    locale: instance.$L,
    utc: instance.$u,
    x: instance.$x,
    $offset: instance.$offset // todo: refactor; do not use this.$offset in you code
  })

const Utils = U // for plugin use
Utils.l = parseLocale
Utils.i = isDayjs
Utils.w = wrapper

/**
 * 根据配置生成Date实例.
 * @param cfg - 配置.
 * @returns {Date}
 */
const parseDate = (cfg) => {
  const { date, utc } = cfg
  if (date === null) return new Date(NaN) // null is invalid
  if (Utils.u(date)) return new Date() // 如果date为undefined未定义.
  if (date instanceof Date) return new Date(date) // 如果date为Date实例.
  if (typeof date === 'string' && !/Z$/i.test(date)) {
    // 如果date为string并且不以(z|Z)结尾，用REGEX_PARSE来解析返回.
    const d = date.match(C.REGEX_PARSE)
    if (d) {
      const m = d[2] - 1 || 0
      const ms = (d[7] || '0').substring(0, 3)
      if (utc) {
        return new Date(Date.UTC(d[1], m, d[3]
          || 1, d[4] || 0, d[5] || 0, d[6] || 0, ms))
      }
      return new Date(d[1], m, d[3]
          || 1, d[4] || 0, d[5] || 0, d[6] || 0, ms)
    }
  }

  return new Date(date) // everything else
}

class Dayjs {
  constructor(cfg) {
    this.$L = parseLocale(cfg.locale, null, true)
    this.parse(cfg) // for plugin
  }

  parse(cfg) {
    this.$d = parseDate(cfg)
    this.$x = cfg.x || {}
    this.init()
  }

  init() {
    const { $d } = this
    this.$y = $d.getFullYear()
    this.$M = $d.getMonth()
    this.$D = $d.getDate()
    this.$W = $d.getDay()
    this.$H = $d.getHours()
    this.$m = $d.getMinutes()
    this.$s = $d.getSeconds()
    this.$ms = $d.getMilliseconds()
  }

  // eslint-disable-next-line class-methods-use-this
  $utils() {
    return Utils
  }

  /**
   * 判断当前实例是否为有效日期.
   * @returns {boolean}
   */
  isValid() {
    return !(this.$d.toString() === C.INVALID_DATE_STRING)
  }

  /**
   * 当前实例的日期时间是否和提供的日期时间相同.
   * @param that
   * @param units - 比较的单位，默认毫秒.
   * @returns {boolean}
   */
  isSame(that, units) {
    const other = dayjs(that)
    return this.startOf(units) <= other && other <= this.endOf(units)
  }

  /**
   * 当前实例的日期时间是否晚于提供的日期时间.
   * @param that
   * @param units - 比较的单位，默认毫秒.
   * @returns {boolean}
   */
  isAfter(that, units) {
    return dayjs(that) < this.startOf(units)
  }

  /**
   * 当前实例的日期时间是否早于提供的日期时间.
   * @param that
   * @param units - 比较的单位，默认毫秒.
   * @returns {boolean}
   */
  isBefore(that, units) {
    return this.endOf(units) < dayjs(that)
  }

  /**
   * getter或者setter，目前只用于向实例添加常用日期单位的setter、getter.
   * @param input
   * @param get
   * @param set
   * @returns {*}
   */
  $g(input, get, set) {
    if (Utils.u(input)) return this[get]
    return this.set(set, input)
  }

  /**
   * 返回当前实例的Unix时间戳（10位|秒级）.
   * @returns {number}
   */
  unix() {
    return Math.floor(this.valueOf() / 1000) // 向下取整.
  }

  /**
   * 返回当前实例的时间戳（13位|毫秒级）.
   * @returns {number}
   */
  valueOf() {
    // timezone(hour) * 60 * 60 * 1000 => ms
    return this.$d.getTime()
  }

  /**
   * 根据单位将实例设置到一个时间段的开始.
   * @param {string} units - 时间单位.
   * @param {boolean} startOf - 用于表示是开始还是结束.
   * @returns {*|Dayjs}
   */
  startOf(units, startOf) { // startOf -> endOf
    const isStartOf = !Utils.u(startOf) ? startOf : true // 如果没传就设置为.
    const unit = Utils.p(units)

    /**
     * 根据月日创建新的Dayjs实例.
     * @param d - 日期[1-31].
     * @param m - 月份[0-11].
     * @returns {*|Dayjs}
     */
    const instanceFactory = (d, m) => {
      const ins = Utils.w(this.$u ?
        Date.UTC(this.$y, m, d) : new Date(this.$y, m, d), this)
      return isStartOf ? ins : ins.endOf(C.D) // 如果是endOf，还要再调用一下endOf(C.D)
    }

    /**
     * 根据传入的method来返回Dayjs新实例.
     * @param method
     * @param slice
     * @returns {*|Dayjs}
     */
    const instanceFactorySet = (method, slice) => {
      const argumentStart = [0, 0, 0, 0]
      const argumentEnd = [23, 59, 59, 999]
      return Utils.w(this.toDate()[method].apply( // eslint-disable-line prefer-spread
        this.toDate('s'),
        (isStartOf ? argumentStart : argumentEnd).slice(slice)
      ), this)
    }
    const { $W, $M, $D } = this // day、month、date.
    const utcPad = `set${this.$u ? 'UTC' : ''}`
    switch (unit) {
      case C.Y: // 年.
        return isStartOf ? instanceFactory(1, 0) :
          instanceFactory(31, 11)
      case C.M: // 月.
        return isStartOf ? instanceFactory(1, $M) :
          instanceFactory(0, $M + 1)
      case C.W: { // 一周的某一天.
        const weekStart = this.$locale().weekStart || 0
        const gap = ($W < weekStart ? $W + 7 : $W) - weekStart
        return instanceFactory(isStartOf ? $D - gap : $D + (6 - gap), $M)
      }
      case C.D: // 日.
      case C.DATE: // 日.
        return instanceFactorySet(`${utcPad}Hours`, 0)
      case C.H: // 时.
        return instanceFactorySet(`${utcPad}Minutes`, 1)
      case C.MIN: // 分.
        return instanceFactorySet(`${utcPad}Seconds`, 2)
      case C.S: // 秒.
        return instanceFactorySet(`${utcPad}Milliseconds`, 3)
      default:
        return this.clone()
    }
  }

  /**
   * 根据单位将实例设置到一个时间段的结束.
   * @param arg - 时间单位.
   * @returns {*|Dayjs}
   */
  endOf(arg) {
    return this.startOf(arg, false)
  }

  $set(units, int) { // private set
    const unit = Utils.p(units)
    const utcPad = `set${this.$u ? 'UTC' : ''}`
    const name = {
      [C.D]: `${utcPad}Date`,
      [C.DATE]: `${utcPad}Date`,
      [C.M]: `${utcPad}Month`,
      [C.Y]: `${utcPad}FullYear`,
      [C.H]: `${utcPad}Hours`,
      [C.MIN]: `${utcPad}Minutes`,
      [C.S]: `${utcPad}Seconds`,
      [C.MS]: `${utcPad}Milliseconds`
    }[unit]
    const arg = unit === C.D ? this.$D + (int - this.$W) : int

    if (unit === C.M || unit === C.Y) {
      // clone is for badMutable plugin
      const date = this.clone().set(C.DATE, 1)
      date.$d[name](arg)
      date.init()
      this.$d = date.set(C.DATE, Math.min(this.$D, date.daysInMonth())).$d
    } else if (name) this.$d[name](arg)

    this.init()
    return this
  }

  set(string, int) {
    return this.clone().$set(string, int)
  }

  get(unit) {
    return this[Utils.p(unit)]()
  }

  /**
   * 根据单位和值，给当前Date对象增加时间.
   * @param {number} number - 增加的数量.
   * @param {string} units - 增加的单位.
   * @returns {*|Dayjs}
   */
  add(number, units) {
    number = Number(number) // eslint-disable-line no-param-reassign
    const unit = Utils.p(units) // 获取单位.
    const instanceFactorySet = (n) => {
      const d = dayjs(this)
      return Utils.w(d.date(d.date() + Math.round(n * number)), this)
    }
    if (unit === C.M) { // 月.
      return this.set(C.M, this.$M + number)
    }
    if (unit === C.Y) { // 年.
      return this.set(C.Y, this.$y + number)
    }
    if (unit === C.D) { // 日.
      return instanceFactorySet(1)
    }
    if (unit === C.W) { // 周.
      return instanceFactorySet(7)
    }
    const step = {
      [C.MIN]: C.MILLISECONDS_A_MINUTE, // 分.
      [C.H]: C.MILLISECONDS_A_HOUR, // 时.
      [C.S]: C.MILLISECONDS_A_SECOND // 秒.
    }[unit] || 1 // ms

    const nextTimeStamp = this.$d.getTime() + (number * step)
    return Utils.w(nextTimeStamp, this)
  }

  /**
   * 根据单位和值，给当前Date对象减少时间.
   * @param number
   * @param string
   * @returns {*|Dayjs}
   */
  subtract(number, string) {
    return this.add(number * -1, string)
  }

  /**
   * 返回对应格式的时间字符串.
   * @param formatStr - 格式化字符串.
   * @returns {string}
   */
  format(formatStr) {
    const locale = this.$locale() // 获取当前国际化配置对象.

    // 如果当前实例为无效日期，则直接返回无效字符串标识.
    if (!this.isValid()) return locale.invalidDate || C.INVALID_DATE_STRING

    const str = formatStr || C.FORMAT_DEFAULT
    const zoneStr = Utils.z(this)
    const { $H, $m, $M } = this
    const {
      weekdays, months, meridiem
    } = locale

    /**
     * 返回对应缩写的字符串.
     * @param arr - 缩写数组.
     * @param index - 索引.
     * @param full - 非缩写数组.
     * @param length - 返回结果的字符数.
     * @returns {string}
     */
    const getShort = (arr, index, full, length) => (
      (arr && (arr[index] || arr(this, str))) || full[index].substr(0, length)
    )

    /**
     * 设置小时数.
     * @param num - 小时数.
     * @returns {string}
     */
    const get$H = num => (
      // 0点和24点转换为12，根据num判断是否在前面补0.
      Utils.s($H % 12 || 12, num, '0')
    )

    /**
     * 设置上午、下午.
     * @returns {string}
     */
    const meridiemFunc = meridiem || ((hour, minute, isLowercase) => {
      // 如果当前国际化配置中有meridiem方法则使用，如没有则使用此方法.
      const m = (hour < 12 ? 'AM' : 'PM') // 根据小时的数值去做判断.
      return isLowercase ? m.toLowerCase() : m // 是否转换为小写.
    })

    // 不同格式对应的值.
    const matches = {
      YY: String(this.$y).slice(-2),
      YYYY: this.$y,
      M: $M + 1,
      MM: Utils.s($M + 1, 2, '0'),
      MMM: getShort(locale.monthsShort, $M, months, 3),
      MMMM: getShort(months, $M),
      D: this.$D,
      DD: Utils.s(this.$D, 2, '0'),
      d: String(this.$W),
      dd: getShort(locale.weekdaysMin, this.$W, weekdays, 2),
      ddd: getShort(locale.weekdaysShort, this.$W, weekdays, 3),
      dddd: weekdays[this.$W],
      H: String($H),
      HH: Utils.s($H, 2, '0'),
      h: get$H(1),
      hh: get$H(2),
      a: meridiemFunc($H, $m, true),
      A: meridiemFunc($H, $m, false),
      m: String($m),
      mm: Utils.s($m, 2, '0'),
      s: String(this.$s),
      ss: Utils.s(this.$s, 2, '0'),
      SSS: Utils.s(this.$ms, 3, '0'),
      Z: zoneStr // 'ZZ' logic below
    }

    return str.replace(C.REGEX_FORMAT, (match, $1) => $1 || matches[match] || zoneStr.replace(':', '')) // 'ZZ'
  }

  /**
   * 返回 UTC 和本地时间之间的时差，单位为分钟.（精度15分钟）
   * @returns {number}
   */
  utcOffset() {
    // Because a bug at FF24, we're rounding the timezone offset around 15 minutes
    // https://github.com/moment/moment/pull/1871
    return -Math.round(this.$d.getTimezoneOffset() / 15) * 15
  }

  diff(input, units, float) {
    const unit = Utils.p(units)
    const that = dayjs(input)
    const zoneDelta = (that.utcOffset() - this.utcOffset()) * C.MILLISECONDS_A_MINUTE
    const diff = this - that
    let result = Utils.m(this, that)

    result = {
      [C.Y]: result / 12,
      [C.M]: result,
      [C.Q]: result / 3,
      [C.W]: (diff - zoneDelta) / C.MILLISECONDS_A_WEEK,
      [C.D]: (diff - zoneDelta) / C.MILLISECONDS_A_DAY,
      [C.H]: diff / C.MILLISECONDS_A_HOUR,
      [C.MIN]: diff / C.MILLISECONDS_A_MINUTE,
      [C.S]: diff / C.MILLISECONDS_A_SECOND
    }[unit] || diff // milliseconds

    return float ? result : Utils.a(result)
  }

  daysInMonth() {
    return this.endOf(C.M).$D
  }

  /**
   * 返回当前的国际化配置对象.
   * @returns {object}
   */
  $locale() { // get locale object
    return Ls[this.$L]
  }

  /**
   * 国际化设置.
   * @param preset
   * @param object
   * @returns {string|*|Dayjs}
   */
  locale(preset, object) {
    if (!preset) return this.$L // 如果没传，则返回当前国际化名称.
    const that = this.clone()
    const nextLocaleName = parseLocale(preset, object, true)
    if (nextLocaleName) that.$L = nextLocaleName
    return that
  }

  /**
   * 克隆当前Dayjs实例.
   * @returns {*|Dayjs}
   */
  clone() {
    return Utils.w(this.$d, this)
  }

  /**
   * 返回实例对应的Date对象.
   * @returns {Date}
   */
  toDate() {
    return new Date(this.valueOf())
  }

  toJSON() {
    return this.isValid() ? this.toISOString() : null
  }

  /**
   * 使用 ISO 标准返回 Date 对象的字符串格式.
   * @returns {string}
   */
  toISOString() {
    // ie 8 return
    // new Dayjs(this.valueOf() + this.$d.getTimezoneOffset() * 60000)
    // .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
    return this.$d.toISOString()
  }

  /**
   * 根据世界时 (UTC) 把 Date 对象转换为字符串.
   * @returns {string}
   */
  toString() {
    return this.$d.toUTCString()
  }
}

const proto = Dayjs.prototype
dayjs.prototype = proto;

// 遍历统一设置常用日期单位的getter、setter方法.
[
  ['$ms', C.MS],
  ['$s', C.S],
  ['$m', C.MIN],
  ['$H', C.H],
  ['$W', C.D],
  ['$M', C.M],
  ['$y', C.Y],
  ['$D', C.DATE]
].forEach((g) => {
  proto[g[1]] = function (input) {
    return this.$g(input, g[0], g[1])
  }
})

/* ------ 挂载静态方法 start ------ */

/**
 * 扩展插件.
 * @param {function} plugin - 插件.
 * @param {any} [option] - 配置选项.
 * @returns {function} - dayjs函数.
 */
dayjs.extend = (plugin, option) => {
  if (!plugin.$i) { // 判断标识，防止重复加载.
    plugin(option, Dayjs, dayjs) // 执行插件方法.
    plugin.$i = true // 将标识置为true，意为已加载.
  }
  return dayjs
}

dayjs.locale = parseLocale

dayjs.isDayjs = isDayjs

/**
 * 解析一个Unix时间戳 (10 位数字).
 * @param timestamp - 时间戳.
 * @returns {*|Dayjs}
 */
dayjs.unix = timestamp => (
  dayjs(timestamp * 1e3)
)
/* ------ 挂载静态方法 end ------ */

/* ------ 挂载静态变量 start ------ */
dayjs.en = Ls[L]
dayjs.Ls = Ls
dayjs.p = {}
/* ------ 挂载静态变量 end ------ */

export default dayjs
