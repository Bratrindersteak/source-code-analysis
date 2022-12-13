'use strict';

import utils from './../utils.js';
import buildURL from '../helpers/buildURL.js';
import InterceptorManager from './InterceptorManager.js';
import dispatchRequest from './dispatchRequest.js';
import mergeConfig from './mergeConfig.js';
import buildFullPath from './buildFullPath.js';
import validator from '../helpers/validator.js';
import AxiosHeaders from './AxiosHeaders.js';


const validators = validator.validators;

/**
 * Axios类.
 *
 * @param {Object} instanceConfig - 配置对象.
 *
 * @returns {Axios} Axios实例对象.
 */
class Axios {
  constructor(instanceConfig) {
    // 初始化默认配置对象.
    this.defaults = instanceConfig;

    // 初始化拦截器对象.
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager(),
    };
  }

  /**
   * 发送请求.
   *
   * @param {String|Object} configOrUrl - URL字段或者配置对象.
   * @param {Object} [config] - 配置对象.
   *
   * @returns {Promise} 经拦截器处理过的 Promise 函数.
   */
  request(configOrUrl, config) {
    /* --- 参数处理 start --- */
    // 判断 configOrUrl 的类型，若为字符串类型，则认为是 url，赋值 config 的 url 字段.
    // 否则就认为是配置对象，整体替换给 config.
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    // 合并默认配置和传入的配置（如有重名属性，则传入的覆盖默认的）.
    config = mergeConfig(this.defaults, config);
    /* --- 参数处理 end --- */

    const { transitional, paramsSerializer, headers } = config;

    /* --- start --- */
    if (transitional !== undefined) {
      validator.assertOptions(transitional, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean),
      }, false);
    }

    if (paramsSerializer !== undefined) {
      validator.assertOptions(paramsSerializer, {
        encode: validators.function,
        serialize: validators.function,
      }, true);
    }
    /* --- end --- */

    // 优化方法字段: 若不合法则使用默认方法，若默认的也不合法则使用 get 字段; 且转换为小写.
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    /* --- headers处理 start --- */
    let contextHeaders;

    // 设置扁平的 headers.
    contextHeaders = headers && utils.merge(
      headers.common,
      headers[config.method]
    );

    // 删除 headers 中的方法属性.
    contextHeaders && utils.forEach(
      ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
      (method) => {
        delete headers[method];
      }
    );

    // 优化头部字段.
    config.headers = AxiosHeaders.concat(contextHeaders, headers);
    /* --- headers处理 end --- */

    /* --- 拦截器处理 start --- */
    // 请求拦截器数组.
    const requestInterceptorChain = [];

    // 判断是否为同步请求拦截器，后续调用会用到.
    let synchronousRequestInterceptors = true;

    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      // 若请求拦截器具有 runWhen 属性函数，并且传入 config 的执行结果为 false，则跳过此请求拦截器直接判断处理下一个.
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }

      // 若有一个请求拦截器的 synchronous 属性为 false, 则 synchronousRequestInterceptors 即为 false.
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

      // 将请求拦截器的 fulfilled、rejected 回调函数依次存入 requestInterceptorChain 中.
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    // 响应拦截器数组.
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      // 遍历响应拦截器堆栈，将每个响应拦截器的 fulfilled、rejected 回调函数依次存入 responseInterceptorChain 中.
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    /* --- 拦截器处理 end --- */

    let promise;
    let i = 0;
    let len;

    /* --- 含有异步请求拦截器的处理 start --- */
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }
    /* --- 含有异步请求拦截器的处理 end --- */

    /* --- 全同步请求拦截器的处理 start --- */
    len = requestInterceptorChain.length;

    let newConfig = config;

    i = 0;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }

    return promise;
    /* --- 全同步请求拦截器的处理 end --- */
  }

  /**
   * 获取请求的完成地址.
   *
   * @param {object} config - 配置对象.
   *
   * @returns {string|*} 完成请求地址.
   */
  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

/* --- 设置别名请求方法 start --- */
// 这 10 个别名方法只是整理了一下配置对象，最终调用的还是 Axios.prototype.request 方法.
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url,
      data: (config || {}).data,
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url,
        data,
      }));
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});
/* --- 设置别名请求方法 end --- */

export default Axios;
