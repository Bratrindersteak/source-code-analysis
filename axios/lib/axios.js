'use strict';

import utils from './utils.js';
import bind from './helpers/bind.js';
import Axios from './core/Axios.js';
import mergeConfig from './core/mergeConfig.js';
import defaults from './defaults/index.js';
import formDataToJSON from './helpers/formDataToJSON.js';
import CanceledError from './cancel/CanceledError.js';
import CancelToken from './cancel/CancelToken.js';
import isCancel from './cancel/isCancel.js';
import { VERSION } from './env/data.js';
import toFormData from './helpers/toFormData.js';
import AxiosError from './core/AxiosError.js';
import spread from './helpers/spread.js';
import isAxiosError from './helpers/isAxiosError.js';
import AxiosHeaders from "./core/AxiosHeaders.js";

/**
 * 创建 axios 函数.
 *
 * @param {Object} defaultConfig - 配置对象.
 *
 * @returns {Function} axios 函数.
 */
function createInstance(defaultConfig) {
  // 创建一个 Axios 实例备用.
  const context = new Axios(defaultConfig);

  // axios 函数即绑定了 Axios 实例上下文的 Axios.prototype.request 函数.
  const instance = bind(Axios.prototype.request, context);

  // 将 Axios 的实例方法扩展到 axios 函数上.
  utils.extend(instance, Axios.prototype, context, { allOwnKeys: true });

  // 将 Axios 的实例属性扩展到 axios 函数上.
  utils.extend(instance, context, null, { allOwnKeys: true });

  // 创建新实例的工厂方法，用于创建互不影响的 axios 函数.
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  // 返回 axios 函数.
  return instance;
}

// 创建默认导出的函数.
const axios = createInstance(defaults);

// 挂载 Axios 类用于继承.
axios.Axios = Axios;

// 挂载取消请求的相关属性.
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken;
axios.isCancel = isCancel;

// 挂载版本号.
axios.VERSION = VERSION;

// 挂载对象转换为 FormData 对象的方法.
axios.toFormData = toFormData;

// 挂载错误类.
axios.AxiosError = AxiosError;

// 给 CanceledError 属性添加一个 Cancel 别名，以便向后兼容.
axios.Cancel = axios.CanceledError;

// 挂载 Promise.all 语法.
axios.all = function all(promises) {
  return Promise.all(promises);
};

// 挂载 spread 方法，该方法可将索要执行的函数与所需参数数组分开.
axios.spread = spread;

// 挂载 AxiosError 实例判断方法.
axios.isAxiosError = isAxiosError;

// 挂载头类.
axios.AxiosHeaders = AxiosHeaders;

// 挂载 FormData 对象转换为对象的方法.
axios.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);

// 挂载 axios 函数本身.
axios.default = axios;

// 导出 axios 函数.
export default axios
