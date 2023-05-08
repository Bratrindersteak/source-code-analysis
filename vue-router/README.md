# vue-router

> `v3.6.5` 版本.

## 目录结构

```markdown
- src/
| - components/
| | - link.js
| | - view.js
| - composables/
| | - index.js
| | - globals.js
| | - guards.js
| | - useLink.js
| | - utils.js
| - entries/ // 环境适配.
| | - cjs.js // nodejs 环境.
| | - esm.js // es6 环境.
| - history/ // 路由模式.
| | - base.js // 基类.
| | - hash.js // 哈希模式：使用 URL hash 值来作路由。支持所有浏览器，包括不支持 HTML5 History Api 的浏览器.
| | - html5.js // history 模式：依赖 HTML5 History API 和服务器配置.
| | - abstract.js // 抽象模式：支持所有 JavaScript 运行环境，如 Node.js 服务器端渲染.
| - util/
| - create-matcher.js
| - create-route-map.js
| - index.js // 入口文件.
| - install.js // 作为 vue 插件需要提供的 install 方法.
| - router.js // 真正的入口文件.
```

## 使用方法

```typescript
import Vue from 'vue';
import VueRouter from 'vue-router';

// 第一步：安装.
Vue.use(VueRouter);

// 第二步：实例化.
const router = new VueRouter({
  routes: [
    { path: '/foo', component: { template: '<div>foo</div>' } },
    { path: '/bar', component: { template: '<div>bar</div>' } }
  ],
});

// 第三步：挂载.
const app = new Vue({
  ...,
  router,
}).$mount('#app');
```


## 插件安装方法

> 源码位置：`src/install.js`

```typescript
export function install (Vue) {
  // 防止重复安装.
  if (install.installed && _Vue === Vue) return;
  install.installed = true
  _Vue = Vue

  const isDef = v => v !== undefined;

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode;
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal);
    }
  };

  // 第一步：全局混入 vue-router 在 beforeCreate、destroyed 两个生命周期钩子的回调方法.
  Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) {
        // 若 options 上存在 router 属性则代表是根实例.
        
        this._routerRoot = this; // 保存挂载 VueRouter 的 Vue 实例.
        this._router = this.$options.router; // 保存 VueRouter 实例.
        this._router.init(this); // 执行初始化方法.
        
        // 响应式定义 _route 属性，保证 _route 发生变化时，<router-view>组件会重新渲染.
        Vue.util.defineReactive(this, '_route', this._router.history.current);
      } else {
        // 非根实例情况下则回溯查找父节点的_routerRoot.
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this;
      }
      
      registerInstance(this, this); // 为 <router-view> 组件关联路由组件.
    },
    destroyed () {
      registerInstance(this); // 为 <router-view> 组件解绑路由组件（不传第二个参数会触发解绑操作）.
    },
  })

  // 第二步：将 $router、$route 作为 Vue 的实例属性.
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router; },
  });

  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route; },
  });

  // 第三步：全局注册组件 <router-view>、<router-link>.
  Vue.component('RouterView', View);
  Vue.component('RouterLink', Link);

  // 第四步：设置路由组件守卫的合并策略.
  const strats = Vue.config.optionMergeStrategies;
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created;
}
```

## 核心类

```typescript
export default class VueRouter {
  constructor (options: RouterOptions = {}) {
    this.app = null
    this.apps = []
    this.options = options
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    this.matcher = createMatcher(options.routes || [], this)

    /* 设置路由模式 start */
    let mode = options.mode || 'hash'; // 默认 hash 模式.

    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false;
    // 降级处理，若选择了history模式但环境不支持 pushState 方法，则降级为 hash 模式.
    if (this.fallback) {
      mode = 'hash';
    }

    // 非浏览器环境使用抽象模式.
    if (!inBrowser) {
      mode = 'abstract';
    }

    this.mode = mode;
    /* 设置路由模式 end */

    // 根据路由模式设置 history 对象.
    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
  }

  match (raw: RawLocation, current?: Route, redirectedFrom?: Location): Route {
    return this.matcher.match(raw, current, redirectedFrom)
  }

  get currentRoute (): ?Route {
    return this.history && this.history.current
  }

  init (app: any /* Vue component instance */) {
    this.apps.push(app)
    
    app.$once('hook:destroyed', () => {
      const index = this.apps.indexOf(app)
      if (index > -1) this.apps.splice(index, 1)
      
      if (this.app === app) this.app = this.apps[0] || null

      if (!this.app) this.history.teardown()
    })
    
    if (this.app) {
      return
    }

    this.app = app

    const history = this.history

    if (history instanceof HTML5History || history instanceof HashHistory) {
      const handleInitialScroll = routeOrError => {
        const from = history.current
        const expectScroll = this.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll && 'fullPath' in routeOrError) {
          handleScroll(this, routeOrError, from, false)
        }
      }
      const setupListeners = routeOrError => {
        history.setupListeners()
        handleInitialScroll(routeOrError)
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupListeners,
        setupListeners
      )
    }

    history.listen(route => {
      this.apps.forEach(app => {
        app._route = route
      })
    })
  }

  beforeEach (fn: Function): Function {
    return registerHook(this.beforeHooks, fn)
  }

  beforeResolve (fn: Function): Function {
    return registerHook(this.resolveHooks, fn)
  }

  afterEach (fn: Function): Function {
    return registerHook(this.afterHooks, fn)
  }

  onReady (cb: Function, errorCb?: Function) {
    this.history.onReady(cb, errorCb)
  }

  onError (errorCb: Function) {
    this.history.onError(errorCb)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        this.history.push(location, resolve, reject)
      })
    } else {
      this.history.push(location, onComplete, onAbort)
    }
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        this.history.replace(location, resolve, reject)
      })
    } else {
      this.history.replace(location, onComplete, onAbort)
    }
  }

  go (n: number) {
    this.history.go(n)
  }

  back () {
    this.go(-1)
  }

  forward () {
    this.go(1)
  }

  getMatchedComponents (to?: RawLocation | Route): Array<any> {
    const route: any = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute
    if (!route) {
      return []
    }
    return [].concat.apply(
      [],
      route.matched.map(m => {
        return Object.keys(m.components).map(key => {
          return m.components[key]
        })
      })
    )
  }

  resolve (to: RawLocation, current?: Route, append?: boolean) {
    current = current || this.history.current
    const location = normalizeLocation(to, current, append, this)
    const route = this.match(location, current)
    const fullPath = route.redirectedFrom || route.fullPath
    const base = this.history.base
    const href = createHref(base, fullPath, this.mode)
    return {
      location,
      route,
      href,
      normalizedTo: location,
      resolved: route
    }
  }

  getRoutes () {
    return this.matcher.getRoutes()
  }

  addRoute (parentOrRoute: string | RouteConfig, route?: RouteConfig) {
    this.matcher.addRoute(parentOrRoute, route)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
  }

  addRoutes (routes: Array<RouteConfig>) {
    this.matcher.addRoutes(routes)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
  }
}
```