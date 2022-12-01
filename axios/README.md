# axios 源码解析

基于 `v1.2.0` 版本进行分析.

## 目录结构

```markdown
- lib/
  - adapters/ -- 适配器
    - adapters.js
    - http.js
    - xhr.js
  - cancel/
    - CanceledError.js
    - CancelToken.js
    - isCancel.js
  - core/
    - Axios.js
    - AxiosError.js
    - AxiosHeaders.js
    - buildFullPath.js
    - dispatchRequest.js
    - InterceptorManager.js
    - mergeConfig.js
    - settle.js
    - transformData.js
  - defaults/
    - index.js
    - transitional.js
  - env/
    - classes/FormData.js
    - data.js
  - helpers/
    - AxiosTransformStream.js
    - AxiosURLSearchParams.js
    - bind.js // 返回一个包装函数，改变传入函数的上下文绑定.
    - buildURL.js
    - combineURLs.js
    - cookies.js
    - deprecatedMethod.js
    - formDataToJSON.js
    - fromDataURI.js
    - isAbsoluteURL.js
    - isAxiosError.js
    - isURLSameOrigin.js
    - null.js // 仅返回一个 null，目前未被使用.
    - parseHeaders.js
    - parseProtocol.js
    - speedometer.js
    - spread.js
    - throttle.js
    - toFormData.js
    - toURLEncodedForm.js
    - validator.js
  - platform/
    - browser/
      - classes/
        - FormData.js
        - URLSearchParams.js
      - index.js
    - node/
      - classes/
        - FormData.js
        - URLSearchParams.js
      - index.js 
  - axios.js // 入口文件，返回 axios 函数（即绑定 Axios 实例上下文的 Axios.prototype.request 方法的包装函数），并在 axios 上挂载若干属性.
  - utils.js // 通用工具、类型判断等方法函数.
```

## Axios.prototype.request

文件位置：`lib/core/Axios.js`

```javascript
/**
 * Dispatch a request.
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
    
  // 设置.
  config.method = (config.method || this.defaults.method || 'get').toLowerCase();

  let contextHeaders;

  // Flatten headers
  contextHeaders = headers && utils.merge(
    headers.common,
    headers[config.method]
  );

  contextHeaders && utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    (method) => {
      delete headers[method];
    }
  );

  config.headers = AxiosHeaders.concat(contextHeaders, headers);

  // filter out skipped interceptors
  const requestInterceptorChain = [];
  let synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  const responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  let promise;
  let i = 0;
  let len;

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
}
```
