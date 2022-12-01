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

## 核心类 Axios

文件位置：`lib/core/Axios.js`

### 构造器

```javascript
constructor(instanceConfig) {
  // 初始化默认配置对象.
  this.defaults = instanceConfig;
  
  // 初始化拦截器对象.
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager(),
  };
}
```

### 核心方法 Axios.prototype.request

```javascript
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
```
