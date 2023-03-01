'use strict';

import transformData from './transformData.js';
import isCancel from '../cancel/isCancel.js';
import defaults from '../defaults/index.js';
import CanceledError from '../cancel/CanceledError.js';
import AxiosHeaders from '../core/AxiosHeaders.js';
import adapters from "../adapters/adapters.js";

/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
export default function dispatchRequest(config) {
  // 若已发送取消请求则报错返回.
  throwIfCancellationRequested(config);

  // 格式化请求头.
  config.headers = AxiosHeaders.from(config.headers);

  // 转换请求数据.
  config.data = transformData.call(
    config,
    config.transformRequest
  );

  // 给 post, put, patch 类型的请求设置 Content-Type.
  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  // 获取适配器函数.
  const adapter = adapters.getAdapter(config.adapter || defaults.adapter);

  // 调用适配器发送请求并返回处理后的响应结果.
  return adapter(config).then(function onAdapterResolution(response) {
    // 若已发送取消请求则报错返回.
    throwIfCancellationRequested(config);

    // 转换响应数据.
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );

    // 格式化响应头.
    response.headers = AxiosHeaders.from(response.headers);

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      // 若已发送取消请求则报错返回.
      throwIfCancellationRequested(config);

      if (reason && reason.response) {
        // 转换响应数据.
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );

        // 格式化响应头.
        reason.response.headers = AxiosHeaders.from(reason.response.headers);
      }
    }

    return Promise.reject(reason);
  });
}
