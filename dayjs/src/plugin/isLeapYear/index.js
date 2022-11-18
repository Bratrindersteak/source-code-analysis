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

