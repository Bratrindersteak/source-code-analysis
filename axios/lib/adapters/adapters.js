import utils from '../utils.js';
import httpAdapter from './http.js';
import xhrAdapter from './xhr.js';
import AxiosError from "../core/AxiosError.js";

// 适配器集合.
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
}

// 给适配器函数添加 name 和 adapterName 字段属性.
utils.forEach(knownAdapters, (fn, value) => {
  if(fn) {
    try {
      Object.defineProperty(fn, 'name', { value });
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, 'adapterName', { value });
  }
});

export default {
  /**
   * 根据参数返回适配器函数.
   *
   * 若参数为字符串则从适配器集合中寻找;
   * 否则将参数作为适配器返回.
   *
   * @param {String|Function} adapters - 适配器名称或者适配器函数.
   *
   * @returns {Function} 适配器函数.
   */
  getAdapter: (adapters) => {
    // 将参数转换为数组，这样做是为了适配传参为数组的情况.
    adapters = utils.isArray(adapters) ? adapters : [adapters];

    const { length } = adapters;
    let nameOrAdapter;
    let adapter;

    // 遍历参数数组，取到第一个有效的适配器即跳出.
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      if((adapter = utils.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter)) {
        break;
      }
    }

    /* --- 适配器合法性校验 start --- */
    if (!adapter) {
      if (adapter === false) {
        throw new AxiosError(
          `Adapter ${nameOrAdapter} is not supported by the environment`,
          'ERR_NOT_SUPPORT'
        );
      }

      throw new Error(
        utils.hasOwnProp(knownAdapters, nameOrAdapter) ?
          `Adapter '${nameOrAdapter}' is not available in the build` :
          `Unknown adapter '${nameOrAdapter}'`
      );
    }

    if (!utils.isFunction(adapter)) {
      throw new TypeError('adapter is not a function');
    }
    /* --- 适配器合法性校验 end --- */

    return adapter;
  },
  adapters: knownAdapters,
}
