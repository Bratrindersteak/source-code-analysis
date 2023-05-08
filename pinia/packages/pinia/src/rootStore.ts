import {
  App,
  EffectScope,
  inject,
  hasInjectionContext,
  InjectionKey,
  Ref,
} from 'vue-demi'
import {
  StateTree,
  PiniaCustomProperties,
  _Method,
  Store,
  _GettersTree,
  _ActionsTree,
  PiniaCustomStateProperties,
  DefineStoreOptionsInPlugin,
  StoreGeneric,
} from './types'

/**
 * setActivePinia must be called to handle SSR at the top of functions like
 * `fetch`, `setup`, `serverPrefetch` and others
 */
export let activePinia: Pinia | undefined

/**
 * Sets or unsets the active pinia. Used in SSR and internally when calling
 * actions and getters
 *
 * @param pinia - Pinia instance
 */
// @ts-expect-error: cannot constrain the type of the return
export const setActivePinia: _SetActivePinia = (pinia) => (activePinia = pinia)

// Get the currently active pinia if there is any.
export const getActivePinia = () => (hasInjectionContext() && inject(piniaSymbol)) || activePinia

// Every application must own its own pinia to be able to create stores
export interface Pinia {
  install: (app: App) => void
  state: Ref<Record<string, StateTree>> // root state
  use(plugin: PiniaPlugin): Pinia // Adds a store plugin to extend every store
  _p: PiniaPlugin[] // Installed store plugins
  _a: App // App linked to this Pinia instance
  _e: EffectScope // Effect scope the pinia is attached to
  _s: Map<string, StoreGeneric> // Registry of stores used by this pinia.
  _testing?: boolean // Added by `createTestingPinia()` to bypass `useStore(pinia)`.
}

export const piniaSymbol = (__DEV__ ? Symbol('pinia') : Symbol()) as InjectionKey<Pinia>