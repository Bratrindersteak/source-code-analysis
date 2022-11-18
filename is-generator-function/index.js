'use strict';

var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;

// 匹配生成器函数关键字（即 function*）的正则表达式.
var isFnRegex = /^\s*(?:function)?\*/;

// 是否支持修改类型标签.
var hasToStringTag = require('has-tostringtag/shams')();

// 返回指定对象的原型.
var getProto = Object.getPrototypeOf;

// 生成一个生成器函数.
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	// 若不支持修改类型标签，则直接返回 false.
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};

// 用于存放生成器函数的原型.
var GeneratorFunction;

/**
 * 判断一个函数是否为原生生成器函数.
 *
 * @param {Function} fn - 待判断的函数.
 * @returns {boolean} 判断结果.
 */
module.exports = function isGeneratorFunction(fn) {
	// 若连函数都不是，则直接返回 false.
	if (typeof fn !== 'function') {
		return false;
	}

	// 若函数的字符串形式包含 “function*” ，则认为是生成器函数.
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}

	// 若返回类型不可改写，则使用返回类型判断.
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
	}

	// .
	if (!getProto) {
		return false;
	}

	// 生成生成器函数的原型（即给 GeneratorFunction 变量赋值）.
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}

	// 判断 fn 的原型是否等于生成器函数的原型.
	return getProto(fn) === GeneratorFunction;
};
