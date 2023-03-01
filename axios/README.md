# axios 源码解析

> 基于 `1.2.0` 版本

## 目录结构

```markdown
- lib/
| - adapters/ -- 适配器相关.
| | - adapters.js // 适配器入口，返回合适的适配器.
| | - http.js // nodejs 环境的适配器，使用 http 或 https 模块.
| | - xhr.js // 浏览器环境的适配器，使用 XMLHttpRequest 构造函数.
| - cancel/ -- 取消请求相关.
| | - CanceledError.js // 取消请求出错时调用的构造函数.
| | - CancelToken.js // 取消请求类.
| | - isCancel.js // 判断请求是否已经取消.
| - core/ -- 核心实现相关.
| | - Axios.js // 核心实现类.
| | - AxiosError.js // 请求错误类.
| | - AxiosHeaders.js // 请求头类.
| | - buildFullPath.js // 构建完整请求路径方法.
| | - dispatchRequest.js // 发送请求并处理请求响应数据.
| | - InterceptorManager.js // 请求拦截类.
| | - mergeConfig.js // 合并配置方法.
| | - settle.js // 包装方法，根据状态码选择执行 promise 的解决或拒绝回调.
| | - transformData.js // 转换请求或响应数据的方法.
| - defaults/ -- 默认配置相关.
| | - index.js // 默认配置对象.
| | - transitional.js // 未知.
| - env/ -- 环境相关.
| | - classes/
| | | - FormData.js
| | - data.js // 版本号.
| - helpers/ -- 辅助方法集合.
| - platform/ -- 平台相关.
| | - browser/
| | | - classes/
| | | | - FormData.js // 导出内置的 FormData 构造函数.
| | | | - URLSearchParams.js // 导出内置的 URLSearchParams 或 AxiosURLSearchParams 构造函数.
| | | - index.js // 导出浏览器环境的信息.
| | - node/
| | | - classes/
| | | | - FormData.js // 导出 form-data 模块.
| | | | - URLSearchParams.js // 导出 url 模块的 URLSearchParams 类.
| | | - index.js // 导出 nodejs 环境的信息.
| | - index.js // 默认导出 nodejs 环境的信息.
| - axios.js // 真正的入口文件.
| - utils.js // 工具方法集合.
- index.js // 入口文件，仅导入 lib/axios.js 的内容又导出.
```

## 概述

默认导出 `axios` 函数，并将 `axios` 函数上挂载的若干属性一并导出。

调用 `axios` 函数实为使用 `bind` 方式调用 `Axios` 类的实例方法 `request` 并将 `Axios` 实例化作为上下文传入。

`axios` 函数使用默认配置，不支持传入配置项（但可以通过修改默认配置项的方式修改配置，比如`axios.defaults.xxx = xxxx;`）。若想传入配置项，则使用 `axios.create` 代替，`create` 支持传入一个配置对象与默认配置对象合并。

实例方法 `request` 先整理 `config` 配置对象，然后将依次将请求拦截器集合 `responseInterceptorChain`、请求函数 `dispatchRequest`、响应拦截器集合 `responseInterceptorChain` 放入栈数组中分别执行。

请求函数 `dispatchRequest` 先是调用 `transformData` 转换请求数据；然后调用适配器 `adapter` 发送请求；最后再次调用 `transformData` 转换响应数据并返回。

适配器 `adapter` 分为内置适配器和自定义适配器。自定义适配器通过配置对象 `config` 传入，内置适配器有两个，分别是适用浏览器环境的 `XMLHttpRequest` 构造函数和适用 `node` 环境的 `http`、`https`模块。

## 源码解析

### 入口 index

> 位置 `index.js`

仅导入又导出。

```typescript
import axios from './lib/axios.js';

const {
  Axios, AxiosHeaders, AxiosError,
  CancelToken, CanceledError, Cancel, isCancel,
  VERSION, all, isAxiosError, spread, toFormData, formToJSON,
} = axios;

export {
  axios as default,
  Axios, AxiosHeaders, AxiosError,
  CancelToken, CanceledError, Cancel, isCancel,
  VERSION, all, isAxiosError, spread, toFormData, formToJSON,
}

```



### 实际入口 axios

> 位置 `lib/axios.js`

#### 1. 创建 axios 函数

```typescript
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
```

#### 2. 给 axios 函数挂载属性

```typescript
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
```

#### 3. 导出 axios 函数

```typescript
// 导出 axios 函数.
export default axios
```



### 核心类 Axios

> 代码位置 `lib/core/Axios.js`

#### 构造器 constructor

```typescript
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
}
```

#### 实例方法 request

核心方法，用于发送请求，主要分为两部分：

1. 整合配置对象（包括请求头字段的整合）。

```typescript
class Axios {
  request(configOrUrl, config) {
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    // 合并默认配置和传入的配置（如有重名属性，则传入的覆盖默认的）.
    config = mergeConfig(this.defaults, config);

    // 优化方法字段: 若不合法则使用默认方法，若默认的也不合法则使用 get 字段; 且转换为小写.
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

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
  }
}
```



2. 将请求拦截器方法集、适配器方法、响应拦截器方法集依次执行，并返回结果。执行方式分两种情况：

  1. 请求拦截器含有异步操作：将请求拦截器方法集、适配器方法、响应拦截器方法集压入栈中，使用一个 `promise` 遍历执行。
  2. 请求拦截器均为同步操作：先遍历执行请求拦截器方法集，然后将其执行结果 `newConfig` 传给适配器方法执行，最后遍历执行响应拦截器方法集。

   另：请求拦截器支持传递 `runWhen` 方法，遍历请求拦截器时执行 `runWhen(config)`，若执行结果为 `false` 则忽略此拦截器，不压入栈中。

```typescript
class Axios {
  request(configOrUrl, config) {
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
  }
}
```

#### 实例方法 getUri

获取 URL

```typescript
getUri(config) {
  // 合并配置对象.
  config = mergeConfig(this.defaults, config);
  
  // 构建完整请求路径.
  const fullPath = buildFullPath(config.baseURL, config.url);
  
  // 构建 URL 并返回.
  return buildURL(fullPath, config.params, config.paramsSerializer);
}
```

#### 设置10个别名请求方法

分别是 `delete`、`get`、`head`、`options`、`post`、`put`、`patch`、`postForm`、`putForm`、`patchForm` 等 `10` 个方法。

其内部实现均为先合并配置对象然后调用实例方法 `request`。

```typescript
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
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
```



### 发送请求方法 dispatchRequest

>  代码位置 `lib/core/dispatchRequest.js`

1. 请求前的操作：格式化请求头并转换请求数据。

2. 取到合适的适配器函数发送请求。

3. 请求后的操作：格式化响应头并转换响应数据然后返回。

```typescript
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
```



### 适配器

#### 适配器入口

> 代码位置 `lib/adapters/adapters.js`

- 内置适配器有 `2` 个：适用 `node` 环境的 `httpAdapter` 和适用浏览器环境的 `xhrAdapter`。

```typescript
// 适配器集合.
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
};
```

- 给适配器挂载 `name` 和 `adapterName` 属性。

```typescript
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
```

- 导出获取适配器的方法 `getAdapter` 和内置适配器集合 `adapters`。

```typescript
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
    // 在浏览器环境中会取到 xhr 适配器，在 node 环境中会取到 http 适配器.
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      if((adapter = utils.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter)) {
        break;
      }
    }

    /* --- 适配器合法性校验 start --- */
    if (!adapter) {
      // 这里判断是否等于 false 是因为在浏览器环境中 http 适配器会取到 false，而在 node 环境中 xhr 适配器会取到 false.
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

    // 适配器必须是函数类型.
    if (!utils.isFunction(adapter)) {
      throw new TypeError('adapter is not a function');
    }
    /* --- 适配器合法性校验 end --- */

    return adapter;
  },
  adapters: knownAdapters,
}
```



#### 适用浏览器环境的适配器 xhrAdapter

> 代码位置 `lib/adapters/xhr.js`

- 判断当前环境是否支持使用 `XMLHttpRequest` 构造函数。

```typescript
// 判断当前环境是否支持使用 XMLHttpRequest 构造函数.
const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';
```

- 导出适配器函数，若当前环境不支持 `XMLHttpRequest` 构造函数，只会导出 `false`。

```typescript
export default isXHRAdapterSupported && function (config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {...});
}
```

- 实例化请求对象。

```typescript
let request = new XMLHttpRequest();
```

- 请求头添加 Authorization 属性。

```typescript
if (config.auth) {
  const username = config.auth.username || '';
  const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
  requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
}
```

- 初始化请求。

```typescript
// 组装完整请求路径.
const fullPath = buildFullPath(config.baseURL, config.url);

// 初始化请求，将请求方法、完整 URL、是否异步等三个参数传入.
request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);
```

- 设置超时时间。

```typescript
request.timeout = config.timeout;
```

- 设置请求结束后的回调函数（无论请求最终是 load、error、timeout、abort）.

```typescript
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
```

```typescript
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
```

- 设置请求取消的回调.

```typescript
request.onabort = function handleAbort() {
  if (!request) {
    return;
  }

  // 执行 reject 返回 Promise.
  reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

  // 清空请求对象.
  request = null;
};
```

- 设置请求出错的回调.

```typescript
request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

      // 清空请求对象.
      request = null;
    };
```

- 设置请求超时的回调.

```typescript
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
```

- 给标准浏览器环境添加跨站请求伪造的头属性，此操作属于双重 cookie 验证方式.

```typescript
if (platform.isStandardBrowserEnv) {
  // 若允许跨源传递 cookie 或者本来就是同源请求，则读取 cookie 中对应的的属性住.
  const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath))
    && config.xsrfCookieName && cookies.read(config.xsrfCookieName);

  // 将取到的跨站请求伪造 cookie 属性值赋给 header 相应的属性字段.
  if (xsrfValue) {
    requestHeaders.set(config.xsrfHeaderName, xsrfValue);
  }
}
```

- 设置请求头.

```typescript
// 若没传递 data 属性则清除请求头的 ContentType 属性.
requestData === undefined && requestHeaders.setContentType(null);

// 遍历逐个添加请求头.
if ('setRequestHeader' in request) {
  utils.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
    request.setRequestHeader(key, val);
  });
}
```

- 设置 `withCredentials` 属性.

```typescript
if (!utils.isUndefined(config.withCredentials)) {
  request.withCredentials = !!config.withCredentials;
}
```

- 设置 `responseType` 属性.

```typescript
if (responseType && responseType !== 'json') {
  request.responseType = config.responseType;
}
```

- 设置上传下载事件的监听器.

```typescript
// 若配置传递了下载过程的回调，则给请求对象添加 progress 监听器.
if (typeof config.onDownloadProgress === 'function') {
  request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
}

// 若配置传递了上传过程的回调，则给请求对象的 upload 属性添加 progress 监听器.
if (typeof config.onUploadProgress === 'function' && request.upload) {
  request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
}
```

- 设置请求取消的回调.

```typescript
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
```

- 若当前环境支持的协议列表中不包含此请求的协议，则报错并返回.

```typescript
// 使用完整请求路径解析出协议名称.
const protocol = parseProtocol(fullPath);

// 若解析出的协议不在当前环境支持的协议列表中，则报错并返回.
if (protocol && platform.protocols.indexOf(protocol) === -1) {
  reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
  return;
}
```

- 发送请求.

```typescript
request.send(requestData || null);
```



### 拦截器类

> 代码位置 `lib/core/InterceptorManager.js`



请求拦截器和响应拦截器会分别实例化一个对象独自保存。

> 代码位置 `lib/core/Axios.js`

```typescript
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
}
```



#### 构造器 constructor

```typescript
class InterceptorManager {
  constructor() {
    // 存放拦截器的堆栈数组.
    this.handlers = [];
  }
}
```



#### 实例方法 use

向堆栈 `handlers` 中添加一个新的拦截器.

```typescript
class InterceptorManager {
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null,
    });

    // 返回拦截器在堆栈数组中的下标作为 ID.
    return this.handlers.length - 1;
  }
}
```



#### 实例方法 eject

从堆栈 `handlers` 中移除一个拦截器.

```typescript
class InterceptorManager {
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
}
```



#### 实例方法 clear

清空拦截器堆栈 `handlers`.

```typescript
class InterceptorManager {
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
}
```



#### 实例方法 forEach

遍历拦截器堆栈 `handlers`，将每个有效的拦截器作为参数传递给 `fn` 函数分别执行.

```typescript
class InterceptorManager {
  forEach(fn) {
    utils.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
```

