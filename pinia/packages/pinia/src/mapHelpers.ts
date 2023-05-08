import type { ComponentPublicInstance } from 'vue-demi'
import type {
  _GettersTree,
  _Method,
  StateTree,
  Store,
  StoreDefinition,
} from './types'

export let mapStoreSuffix = 'Store'

/**
 * Changes the suffix added by `mapStores()`. Can be set to an empty string.
 * Defaults to `"Store"`. Make sure to extend the MapStoresCustomization
 * interface if you are using TypeScript.
 *
 * @param suffix - new suffix
 */
export function setMapStoreSuffix(
  suffix: MapStoresCustomization extends Record<'suffix', infer Suffix>
    ? Suffix
    : string // could be 'Store' but that would be annoying for JS
): void {
  mapStoreSuffix = suffix
}

/**
 * Allows using stores without the composition API (`setup()`) by generating an
 * object to be spread in the `computed` field of a component. It accepts a list
 * of store definitions.
 *
 * @example
 * ```js
 * export default {
 *   computed: {
 *     // other computed properties
 *     ...mapStores(useUserStore, useCartStore)
 *   },
 *
 *   created() {
 *     this.userStore // store with id "user"
 *     this.cartStore // store with id "cart"
 *   }
 * }
 * ```
 *
 * @param stores - list of stores to map to an object
 */
export function mapStores<Stores extends any[]>(
  ...stores: [...Stores]
): _Spread<Stores> {
  if (__DEV__ && Array.isArray(stores[0])) {
    stores = stores[0]
  }

  return stores.reduce((reduced, useStore) => {
    reduced[useStore.$id + mapStoreSuffix] = function (
      this: ComponentPublicInstance
    ) {
      return useStore(this.$pinia)
    }
    return reduced
  }, {} as _Spread<Stores>)
}

export function mapState(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: any
): _MapStateReturn<S, G> | _MapStateObjectReturn<Id, S, G, A> {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        reduced[key] = function (this: ComponentPublicInstance) {
          return useStore(this.$pinia)[key]
        } as () => any
        return reduced
      }, {} as _MapStateReturn<S, G>)
    : Object.keys(keysOrMapper).reduce((reduced, key: string) => {
        reduced[key] = function (this: ComponentPublicInstance) {
          const store = useStore(this.$pinia)
          const storeKey = keysOrMapper[key]
          // for some reason TS is unable to infer the type of storeKey to be a
          // function
          return typeof storeKey === 'function'
            ? (storeKey as (store: Store<Id, S, G, A>) => any).call(this, store)
            : store[storeKey]
        }
        return reduced
      }, {} as _MapStateObjectReturn<Id, S, G, A>)
}

export const mapGetters = mapState

export function mapActions(useStore, keysOrMapper) {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        reduced[key] = function (
          this: ComponentPublicInstance,
          ...args: any[]
        ) {
          return useStore(this.$pinia)[key](...args)
        }
        return reduced
      }, {})
    : Object.keys(keysOrMapper).reduce((reduced, key: keyof KeyMapper) => {
        reduced[key] = function (
          this: ComponentPublicInstance,
          ...args: any[]
        ) {
          return useStore(this.$pinia)[keysOrMapper[key]](...args)
        }
        return reduced
      }, {})
}



/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keys - array of state properties
 */
export function mapWritableState<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A,
  Keys extends keyof S
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keys: readonly Keys[]
): {
  [K in Keys]: {
    get: () => S[K]
    set: (value: S[K]) => any
  }
}
/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keysOrMapper - array or object
 */
export function mapWritableState<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A,
  KeyMapper extends Record<string, keyof S>
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: Array<keyof S> | KeyMapper
): _MapWritableStateReturn<S> | _MapWritableStateObjectReturn<S, KeyMapper> {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        // @ts-ignore
        reduced[key] = {
          get(this: ComponentPublicInstance) {
            return useStore(this.$pinia)[key]
          },
          set(this: ComponentPublicInstance, value) {
            // it's easier to type it here as any
            return (useStore(this.$pinia)[key] = value as any)
          },
        }
        return reduced
      }, {} as _MapWritableStateReturn<S>)
    : Object.keys(keysOrMapper).reduce((reduced, key: keyof KeyMapper) => {
        // @ts-ignore
        reduced[key] = {
          get(this: ComponentPublicInstance) {
            return useStore(this.$pinia)[keysOrMapper[key]]
          },
          set(this: ComponentPublicInstance, value) {
            // it's easier to type it here as any
            return (useStore(this.$pinia)[keysOrMapper[key]] = value as any)
          },
        }
        return reduced
      }, {} as _MapWritableStateObjectReturn<S, KeyMapper>)
}
