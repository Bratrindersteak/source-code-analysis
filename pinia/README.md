# Pinia 源码分析

基于 `v2.1.7` 版本进行分析.

## 目录结构

```markdown
- packages/
  - pinia/
    - src/
      - index.ts // 入口文件，仅导出各种TS类型、方法、属性.
      - createPinia.ts
      - rootStore.ts
      - store.ts
      - mapHelpers.ts // 选项式 API 使用的映射辅助函数.
      - storeToRefs.ts
      - hmr.ts
```

## 使用方式

### 引入 Pinia

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.mount('#app')
```

### 定义 store

```typescript
import { defineStore } from 'pinia'

export const useStore = defineStore('storeId', {
  state: () => {
    return {
      count: 0,
      name: 'Eduardo',
      isAdmin: true,
      items: [],
      hasChanged: true,
    }
  },
  getters: {
    doubleCount(state) {
      return state.count * 2
    },
    doublePlusOne(): number {
      return this.doubleCount + 1
    },
  },
  actions: {
    increment() {
      this.count++
    },
    randomizeCounter() {
      this.count = Math.round(100 * Math.random())
    },
  },
})
```

### 使用插件

```typescript
import { createPinia } from 'pinia'

function SecretPiniaPlugin() {
  return { secret: 'the cake is a lie' }
}

const pinia = createPinia()
pinia.use(SecretPiniaPlugin)
```

## 核心 API

### `createPinia`

位置：`packages/pinia/src/createPinia.ts`
```typescript
export function createPinia(): Pinia {
  const scope = effectScope(true)
  // NOTE: here we could check the window object for a state and directly set it
  // if there is anything like it with Vue 3 SSR
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!

  let _p: Pinia['_p'] = []
  // plugins added before calling app.use(pinia)
  let toBeInstalled: PiniaPlugin[] = []

  const pinia: Pinia = markRaw({...})

  return pinia
}
```


#### pinia

位置：`packages/pinia/src/createPinia.ts -> createPinia()`
```typescript
const pinia: Pinia = markRaw({
  install(app: App) {
    setActivePinia(pinia)
    if (!isVue2) {
      pinia._a = app
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia

      toBeInstalled.forEach((plugin) => _p.push(plugin))
      toBeInstalled = []
    }
  },
  use(plugin) {
    if (!this._a && !isVue2) {
      toBeInstalled.push(plugin)
    } else {
      _p.push(plugin)
    }
    return this
  },
  _p,
  _a: null,
  _e: scope,
  _s: new Map<string, StoreGeneric>(),
  state,
})
```


### `defineStore`

位置：`packages/pinia/src/store.ts`
```typescript
export function defineStore(
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): StoreDefinition {
  let id: string
  let options

  const isSetupStore = typeof setup === 'function'
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    options = isSetupStore ? setupOptions : setup
  } else {
    options = idOrOptions
    id = idOrOptions.id
  }

  function useStore(pinia?: Pinia | null, hot?: StoreGeneric): StoreGeneric {...}

  useStore.$id = id

  return useStore
}
```

#### `useStore`

位置：`packages/pinia/src/store.ts -> defineStore()`
```typescript
function useStore(pinia?: Pinia | null, hot?: StoreGeneric): StoreGeneric {
    const hasContext = hasInjectionContext()

    if (pinia) setActivePinia(pinia)

    pinia = activePinia!

    if (!pinia._s.has(id)) {
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia)
      } else {
        createOptionsStore(id, options as any, pinia)
      }
    }

    const store: StoreGeneric = pinia._s.get(id)!

    if (__DEV__ && hot) {
      const hotId = '__hot:' + id
      const newStore = isSetupStore
        ? createSetupStore(hotId, setup, options, pinia, true)
        : createOptionsStore(hotId, assign({}, options) as any, pinia, true)

      hot._hotUpdate(newStore)
      
      delete pinia.state.value[hotId]
      pinia._s.delete(hotId)
    }
    
    return store as any
  }
```
