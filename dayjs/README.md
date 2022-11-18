# Day.js

> Day.js是一个极简的JavaScript库，它通过与moment .js兼容的API为现代浏览器解析、验证、操作和显示日期和时间。如果你使用Moment.js，你已经知道如何使用Day.js。

`v1.10.7`

## 目录结构

```
|--src/
   |--locale/     // 国际化配置.
   |--plugin/     // 插件.
   |--constant.js // 常量.
   |--index.js    // 核心代码.
   |--utils.js    // 工具方法.
```

## 依赖关系

![image-20211129172418595](images/依赖关系.png)
- **使用除`en`外的其他**国际化**和**插件**时需要单独引入，核心代码中不包括这些.**
```
import 'dayjs/locale/zh-cn.js';
import 'dayjs/locale/de.js';

import 'dayjs/plugin/isToday.js';
```


## 模块分析

### constant.js

```typescript
// 用秒数量级去定义分钟、小时、天、周.
export const SECONDS_A_MINUTE = 60
export const SECONDS_A_HOUR = SECONDS_A_MINUTE * 60
export const SECONDS_A_DAY = SECONDS_A_HOUR * 24
export const SECONDS_A_WEEK = SECONDS_A_DAY * 7

// 用毫秒数量级去定义秒、分钟、小时、天、周.
export const MILLISECONDS_A_SECOND = 1e3
export const MILLISECONDS_A_MINUTE = SECONDS_A_MINUTE * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_HOUR = SECONDS_A_HOUR * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_DAY = SECONDS_A_DAY * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_WEEK = SECONDS_A_WEEK * MILLISECONDS_A_SECOND

// 常用日期单位.
export const MS = 'millisecond'
export const S = 'second'
export const MIN = 'minute'
export const H = 'hour'
export const D = 'day'
export const W = 'week'
export const M = 'month'
export const Q = 'quarter'
export const Y = 'year'
export const DATE = 'date'

// 默认的格式化字符串.
export const FORMAT_DEFAULT = 'YYYY-MM-DDTHH:mm:ssZ'

// 无效日期的字符串标识，用于对无效日期的判断.
export const INVALID_DATE_STRING = 'Invalid Date'

// 解析日期.
export const REGEX_PARSE = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/

// 解析格式化字符串.
export const REGEX_FORMAT = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g

```


### utils.js

```typescript
import * as C from './constant'

const padStart = (string, length, pad) => {
  const s = String(string)
  if (!s || s.length >= length) return string
  return `${Array((length + 1) - s.length).join(pad)}${string}`
}

const padZoneStr = (instance) => {
  const negMinutes = -instance.utcOffset()
  const minutes = Math.abs(negMinutes)
  const hourOffset = Math.floor(minutes / 60)
  const minuteOffset = minutes % 60
  return `${negMinutes <= 0 ? '+' : '-'}${padStart(hourOffset, 2, '0')}:${padStart(minuteOffset, 2, '0')}`
}

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

const absFloor = n => (n < 0 ? Math.ceil(n) || 0 : Math.floor(n))

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
  return special[u] || String(u || '').toLowerCase().replace(/s$/, '')
}

/**
 * 判断传入的值是否为undefined.
 * @param {any} s - 要判断的值.
 * @returns {boolean}
 */
const isUndefined = s => s === undefined

// 向外暴露方法时做了字母缩写别名的映射处理.
export default {
  s: padStart,
  z: padZoneStr,
  m: monthDiff,
  a: absFloor,
  p: prettyUnit,
  u: isUndefined
}

```


### locale/

- en.js
```typescript
// English [en]
// We don't need weekdaysShort, weekdaysMin, monthsShort in en.js locale
export default {
  name: 'en',
  weekdays: 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
  months: 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_')
}

```

- zh-cn.js
```typescript
// Chinese (China) [zh-cn]
import dayjs from 'dayjs'

const locale = {
  name: 'zh-cn',
  weekdays: '星期日_星期一_星期二_星期三_星期四_星期五_星期六'.split('_'),
  weekdaysShort: '周日_周一_周二_周三_周四_周五_周六'.split('_'),
  weekdaysMin: '日_一_二_三_四_五_六'.split('_'),
  months: '一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月'.split('_'),
  monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
  ordinal: (number, period) => {
    switch (period) {
      case 'W':
        return `${number}周`
      default:
        return `${number}日`
    }
  },
  weekStart: 1,
  yearStart: 4,
  formats: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'YYYY/MM/DD',
    LL: 'YYYY年M月D日',
    LLL: 'YYYY年M月D日Ah点mm分',
    LLLL: 'YYYY年M月D日ddddAh点mm分',
    l: 'YYYY/M/D',
    ll: 'YYYY年M月D日',
    lll: 'YYYY年M月D日 HH:mm',
    llll: 'YYYY年M月D日dddd HH:mm'
  },
  relativeTime: {
    future: '%s内',
    past: '%s前',
    s: '几秒',
    m: '1 分钟',
    mm: '%d 分钟',
    h: '1 小时',
    hh: '%d 小时',
    d: '1 天',
    dd: '%d 天',
    M: '1 个月',
    MM: '%d 个月',
    y: '1 年',
    yy: '%d 年'
  },
  meridiem: (hour, minute) => {
    const hm = (hour * 100) + minute
    if (hm < 600) {
      return '凌晨'
    } else if (hm < 900) {
      return '早上'
    } else if (hm < 1100) {
      return '上午'
    } else if (hm < 1300) {
      return '中午'
    } else if (hm < 1800) {
      return '下午'
    }
    return '晚上'
  }
}

// 引入国际化文件时会自动导入到Ls.
dayjs.locale(locale, null, true)

export default locale
```


### index.js

- 初始国际化配置
```typescript
let L = 'en' // 当前使用的国际化名称，初始指定en.
const Ls = {} // 存放已加载的国际化配置项.
Ls[L] = en
```

- 对utils的补充
```typescript
/**
 * 判断是否为Dayjs实例.
 * @param {any} d - 待判断的值.
 * @returns {boolean}
 */
const isDayjs = d => d instanceof Dayjs

/**
 * 解析国际化配置.
 * @param {string|object} preset - 待解析的配置.
 * @param {object} [object] - 自定义的国际化配置项.
 * @param {boolean} [isLocal] - .
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
  if (!isLocal && l) L = l
  return l || (!isLocal && L)
}

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
```

- dayjs() 最后默认导出的就是它.
```typescript
/**
 * 实例方法.
 * @param {} date - Dayjs实例.
 * @param {object} [c] - 配置.
 * @returns {object} - Dayjs实例.
 */
const dayjs = function (date, c) {
  if (isDayjs(date)) {
    return date.clone()
  }
  // eslint-disable-next-line no-nested-ternary
  const cfg = typeof c === 'object' ? c : {}
  cfg.date = date
  cfg.args = arguments// eslint-disable-line prefer-rest-params
  return new Dayjs(cfg) // eslint-disable-line no-use-before-define
}
```


#### 静态方法

- 扩展插件
```typescript
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
```


### plugin/

#### is辈的

- isLeapYear
```typescript
/**
 * 判断是否为闰年.
 * @param {any} o - option.
 * @param {Class} c - Dayjs类.
 * @returns {boolean}
 */
export default (o, c) => {
  const proto = c.prototype
  // 添加到Dayjs类的实例方法中.
  proto.isLeapYear = function () {
  	// 普通闰年：公历年份是4的倍数，且不是100的倍数的，为闰年（如2004年、2020年等就是闰年）.
  	// 世纪闰年：公历年份是整百数的，必须是400的倍数才是闰年（如1900年不是闰年，2000年是闰年）.
    return ((this.$y % 4 === 0) && (this.$y % 100 !== 0)) || (this.$y % 400 === 0)
  }
}
```

