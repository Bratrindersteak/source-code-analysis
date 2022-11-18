/*!
 * statuses
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * 键值对状态对象.
 */
var codes = require('./codes.json');

/**
 * 导出 status 函数.
 */
module.exports = status;

// 码-消息键值对象.
status.message = codes;

// 消息-码键值对象.
status.code = createMessageToStatusCodeMap(codes);

// 状态码数组.
status.codes = createStatusCodeList(codes);

// 重定向对应的状态集合，用于判定某个状态码是否属于重定向.
status.redirect = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true,
};

// 空 body 对应的状态集合，用于判定某个状态码是否属于空 body .
status.empty = {
    204: true,
    205: true,
    304: true,
};

// 重试请求对应的状态集合，用于判定某个状态码是否属于重试请求.
status.retry = {
    502: true,
    503: true,
    504: true,
};

/**
 * 根据码-消息键值对象生成消息-码键值对象.
 *
 * @param {Object} codes - 码-消息键值对象，即 ./codes.json 的内容.
 * @returns {Object} 消息-码键值对象.
 */
function createMessageToStatusCodeMap (codes) {
    // 消息-码映射对象.
    var map = {};

    // 遍历反向生成键值对.
    Object.keys(codes).forEach(function forEachCode (code) {
        var message = codes[code];
        var status = Number(code);

        // 存储时将状态消息键转换成小写.
        map[message.toLowerCase()] = status;
    });

    return map;
}

/**
 * 生成状态码数组.
 *
 * @param {Object} codes - 状态对象，即 ./codes.json 的内容.
 * @returns {number[]} 状态码数组.
 */
function createStatusCodeList (codes) {
    return Object.keys(codes).map(function mapCode (code) {
        return Number(code);
    });
}

/**
 * 根据状态消息返回对应的状态码.
 *
 * @param {string} message - 状态消息.
 * @returns {number} 状态码.
 */
function getStatusCode (message) {
    // 将状态消息转换成小写.
    var msg = message.toLowerCase();

    // 参数校验，若传入的状态消息在 status.code 对象中匹配不到就报错.
    if (!Object.prototype.hasOwnProperty.call(status.code, msg)) {
        throw new Error('invalid status message: "' + message + '"');
    }

    // 从 status.code 对象中返回对应的状态码.
    return status.code[msg];
}

/**
 * 根据状态码返回对应的状态消息.
 *
 * @param {number} code - 状态码.
 * @returns {string} 状态消息.
 */
function getStatusMessage (code) {
    // 参数校验，若传入的状态码在 status.message 对象中匹配不到就报错.
    if (!Object.prototype.hasOwnProperty.call(status.message, code)) {
        throw new Error('invalid status code: ' + code);
    }

    // 从 status.message 对象中返回对应的状态消息.
    return status.message[code];
}

/**
 * 状态函数，根据传入的参数类型来判断返回值：
 * - 若传入状态码则返回对应的状态消息；
 * - 若传入状态消息则返回对应的状态码.
 *
 * @param {string|number} code - 状态码或者是状态消息.
 * @returns {string|number} 状态消息或者是状态码.
 */
function status (code) {
    // 若参数是数字类型，则返回对应状态消息.
    if (typeof code === 'number') {
        return getStatusMessage(code);
    }

    // 参数校验，若既不是数字也不是字符串则报错.
    if (typeof code !== 'string') {
        throw new TypeError('code must be a number or string');
    }

    // 若参数是字符串数字，则一样按数字类型处理，返回对应状态消息.
    var n = parseInt(code, 10);
    if (!isNaN(n)) {
        return getStatusMessage(n);
    }

    // 否则就认为参数是状态消息字符串，返回对应的状态码.
    return getStatusCode(code);
}
