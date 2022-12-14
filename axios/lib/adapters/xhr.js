'use strict';

import utils from './../utils.js';
import settle from './../core/settle.js';
import cookies from './../helpers/cookies.js';
import buildURL from './../helpers/buildURL.js';
import buildFullPath from '../core/buildFullPath.js';
import isURLSameOrigin from './../helpers/isURLSameOrigin.js';
import transitionalDefaults from '../defaults/transitional.js';
import AxiosError from '../core/AxiosError.js';
import CanceledError from '../cancel/CanceledError.js';
import parseProtocol from '../helpers/parseProtocol.js';
import platform from '../platform/index.js';
import AxiosHeaders from '../core/AxiosHeaders.js';
import speedometer from '../helpers/speedometer.js';

/**
 * .
 *
 * @param {function} listener - .
 * @param isDownloadStream - .
 *
 * @returns {(function(*): void)|*} .
 */
function progressEventReducer(listener, isDownloadStream) {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);

  return e => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;

    bytesNotified = loaded;

    const data = {
      loaded,
      total,
      progress: total ? (loaded / total) : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
    };

    data[isDownloadStream ? 'download' : 'upload'] = true;

    listener(data);
  };
}

// 判断当前环境是否支持使用 XMLHttpRequest 构造函数.
const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

/**
 *
 */
export default isXHRAdapterSupported && function (config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    let requestData = config.data;
    const requestHeaders = AxiosHeaders.from(config.headers).normalize();
    const responseType = config.responseType;
    let onCanceled;

    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData) && platform.isStandardBrowserEnv) {
      requestHeaders.setContentType(false); // Let the browser set it
    }

    // 实例化请求对象.
    let request = new XMLHttpRequest();

    // 请求头添加 Authorization 属性.
    if (config.auth) {
      const username = config.auth.username || '';
      const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
    }

    // 组装完整请求路径.
    const fullPath = buildFullPath(config.baseURL, config.url);

    // 初始化请求，将请求方法、完整 URL、是否异步等三个参数传入.
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // 设置超时毫秒数.
    request.timeout = config.timeout;

    /**
     * 请求结束后的回调函数（无论请求最终是 load、error、timeout、abort）.
     */
    function onloadend() {
      if (!request) {
        return;
      }

      // 组装响应头对象.
      const responseHeaders = AxiosHeaders.from(
        'getAllResponseHeaders' in request && request.getAllResponseHeaders()
      );

      // 响应数据.
      const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
        request.responseText : request.response;

      // 组装响应对象.
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request,
      };

      // 将组装好的响应对象 response 传给顶层 Promise 函数的回调执行.
      // 至于执行 resolve 还是 reject 由 response.status 决定.
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // 清空请求对象.
      request = null;
    }

    // 优先使用 loadend 事件执行回调，否则使用 readystatechange 事件回调代替.
    if ('onloadend' in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // 由于在大多数浏览器中，使用 file 协议的请求即便成功 status 也会返回 0，
        // 所以在这里做特殊判断，将 status 为 0 且并非 file 协议的请求忽略.
        // 由 onerror 回调统一去处理它们.
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }

        // 由于 readystatechange 事件的执行顺序早于 error 事件和 timeout 事件，
        // 所以通过使用 setTimeout 将 onloadend 的执行放到下一轮来修正执行顺序.
        setTimeout(onloadend);
      };
    }

    // 请求取消的回调.
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      // 执行 reject 返回 Promise.
      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

      // 清空请求对象.
      request = null;
    };

    // 取消出错的回调.
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

      // 清空请求对象.
      request = null;
    };

    // 请求超时的回调.
    request.ontimeout = function handleTimeout() {
      // 默认超时信息.
      let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';

      const transitional = config.transitional || transitionalDefaults;

      // 若配置传入了超时信息则覆盖默认的.
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }

      // 执行 reject 返回 Promise.
      reject(new AxiosError(
        timeoutErrorMessage,
        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
        config,
        request));

      // 清空请求对象.
      request = null;
    };

    // 给标准浏览器环境添加跨站请求伪造的头属性，这属于双重 cookie 验证方式.
    if (platform.isStandardBrowserEnv) {
      // 若允许跨源传递 cookie 或者本来就是同源请求，则读取 cookie 中对应的的属性住.
      const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath))
        && config.xsrfCookieName && cookies.read(config.xsrfCookieName);

      // 将取到的跨站请求伪造 cookie 属性值赋给 header 相应的属性字段.
      if (xsrfValue) {
        requestHeaders.set(config.xsrfHeaderName, xsrfValue);
      }
    }

    // 若没传递 data 属性则清除请求头的 ContentType 属性.
    requestData === undefined && requestHeaders.setContentType(null);

    // 遍历逐个添加请求头.
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }

    // 添加 withCredentials 属性.
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // 添加 responseType 属性.
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // 若配置传递了下载过程的回调，则给请求对象添加 progress 监听器.
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
    }

    // 若配置传递了上传过程的回调，则给请求对象的 upload 属性添加 progress 监听器.
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
    }

    // 设置取消请求的回调.
    if (config.cancelToken || config.signal) {
      // 取消请求的回调函数.
      onCanceled = cancel => {
        if (!request) {
          return;
        }

        // 执行 reject 返回 Promise.
        reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);

        // 调用 XMLHttpRequest 取消请求的原生方法.
        request.abort();

        // 清空请求对象.
        request = null;
      };

      // axios 自带的取消请求的配置项，订阅回调函数.
      config.cancelToken && config.cancelToken.subscribe(onCanceled);

      // 以 fetch 的方式使用 AbortController 取消请求的配置项.
      if (config.signal) {
        // 若已经是取消状态，则直接执行回调取消请求，否则声明一个取消监听器.
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    // 使用完整请求路径解析出协议名称.
    const protocol = parseProtocol(fullPath);

    // 若解析出的协议不在当前环境支持的协议列表中，则报错并返回.
    if (protocol && platform.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
      return;
    }

    // 发送请求.
    request.send(requestData || null);
  });
}
