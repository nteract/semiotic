"use client"
import * as React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore
} from "react"

interface Source<T> {
  getState(): T
  subscribe: (cb: () => void) => () => void
}

export interface StoreProviderProps<T> {
  children: React.ReactNode
  initialState?: Partial<T>
}

export function createStore<T>(
  fn: (set: (updater: (current: T) => Partial<T>) => void) => T
): [React.FC<StoreProviderProps<T>>, <R>(selector: (state: T) => R, equalityFn?: (a: R, b: R) => boolean) => R] {
  // `createContext` is called lazily — not at module load. Why: React
  // Server Components ship a build of `react` that omits `createContext`
  // entirely (along with the rest of the client-only API surface). When
  // a Server Component imports from `semiotic/server`, the import chain
  // pulls in module-level `createStore(...)` calls scattered across
  // store files. If `createContext` were invoked at module load, that
  // import would crash before `renderChart` ever ran with
  // `(0, p.createContext) is not a function`. Deferring the call until
  // `Provider` / `useSelector` actually executes means the call
  // happens only on the client (Server Components never render the
  // Provider tree directly), so RSC never sees it.
  let ctx: React.Context<Source<T> | null> | null = null
  const getCtx = (): React.Context<Source<T> | null> => {
    if (!ctx) ctx = createContext<Source<T> | null>(null)
    return ctx
  }
  const fallbackSource = createSource(fn)

  function Provider({ children, initialState }: StoreProviderProps<T>) {
    const initialStateRef = useRef(initialState)
    const source = useMemo(() => createSource(fn, initialStateRef.current), [])
    const Ctx = getCtx()
    return <Ctx.Provider value={source} children={children} />
  }

  const useSelector = <R,>(
    selector: (state: T) => R,
    equalityFn?: (a: R, b: R) => boolean
  ): R => {
    const Ctx = getCtx()
    const source = useContext(Ctx) ?? fallbackSource
    const selectorRef = useRef(selector)
    selectorRef.current = selector
    const lastSelectedRef = useRef<{ hasValue: boolean; value: R | undefined }>({
      hasValue: false,
      value: undefined
    })
    const getSnapshot = useCallback(
      () => {
        const nextSelected = selectorRef.current(source.getState())
        const lastSelected = lastSelectedRef.current
        if (
          lastSelected.hasValue &&
          equalityFn &&
          equalityFn(lastSelected.value as R, nextSelected)
        ) {
          return lastSelected.value as R
        }
        lastSelectedRef.current = {
          hasValue: true,
          value: nextSelected
        }
        return nextSelected
      },
      [source, equalityFn]
    )
    const getServerSnapshot = useCallback(
      () => selectorRef.current(source.getState()),
      [source]
    )
    return useSyncExternalStore(source.subscribe, getSnapshot, getServerSnapshot)
  }

  return [Provider, useSelector]
}

function createSource<T>(
  fn: (set: (updater: (current: T) => Partial<T>) => void) => T,
  initialState?: Partial<T>
): Source<T> {
  const listeners = new Set<() => void>()
  let state = {
    ...fn(set),
    ...(initialState ?? {})
  } as T

  function set(updater: (current: T) => Partial<T>) {
    const update = updater(state)
    if (!hasOwnEnumerableKey(update)) return
    state = { ...state, ...update } as T
    for (const listener of listeners) {
      listener()
    }
  }

  function subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }

  return {
    getState() {
      return state
    },
    subscribe
  }
}

function hasOwnEnumerableKey(value: object): boolean {
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) return true
  }
  return false
}
