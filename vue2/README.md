# Vue2 源码分析

基于 `v2.6.14` 版本进行分析.

## 目录结构

```markdown
- flow/
- packages/
- scripts/
- src/
  - compiler/
  - core/
    - instance/
      - init.js
      - index.js
    - config.js
    - index.js
  - platforms/
  - server/
  - sfc/
  - shared/
    - constants.js
    - util.js
```

## 核心方法

### `initMixin()`

代码位置：`src/core/instance/init.js`
```typescript
// initMixin 只声明了实例方法 _init
export function initMixin (Vue) {
  Vue.prototype._init = function (options?: Object) {...}
}
```

#### `Vue.prototype._init()`
```typescript
Vue.prototype._init = function (options?: Object) {
  const vm: Component = this

  vm._uid = uid++

  // a flag to avoid this being observed
  vm._isVue = true

  // merge options
  if (options && options._isComponent) {
    initInternalComponent(vm, options)
  } else {
    vm.$options = mergeOptions(
      resolveConstructorOptions(vm.constructor),
      options || {},
      vm
    )
  }
  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    initProxy(vm)
  } else {
    vm._renderProxy = vm
  }

  vm._self = vm
  initLifecycle(vm)
  initEvents(vm)
  initRender(vm)
  callHook(vm, 'beforeCreate')
  initInjections(vm) // resolve injections before data/props
  initState(vm)
  initProvide(vm) // resolve provide after data/props
  callHook(vm, 'created')

  if (vm.$options.el) {
    vm.$mount(vm.$options.el)
  }
}
```

### diff 算法

双端比较

- 只做同层比较，以保证最小的时间复杂度
- 同层比较时，若 VNode 节点类型不同，则直接抛弃旧 VNode 节点及其子节点
- 类型相同时，善用 key 属性做优化

