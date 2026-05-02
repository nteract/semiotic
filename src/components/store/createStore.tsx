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
): [React.FC<StoreProviderProps<T>>, <R>(selector: (state: T) => R) => R] {
  const Ctx = createContext<Source<T> | null>(null)
  const fallbackSource = createSource(fn)

  function Provider({ children, initialState }: StoreProviderProps<T>) {
    const initialStateRef = useRef(initialState)
    const source = useMemo(() => createSource(fn, initialStateRef.current), [])
    return <Ctx.Provider value={source} children={children} />
  }

  const useSelector = <R,>(selector: (state: T) => R): R => {
    const source = useContext(Ctx) ?? fallbackSource
    const selectorRef = useRef(selector)
    selectorRef.current = selector
    const getSnapshot = useCallback(
      () => selectorRef.current(source.getState()),
      [source]
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
  const events = new EventTarget()
  let state = {
    ...fn(set),
    ...(initialState ?? {})
  } as T

  function set(updater: (current: T) => Partial<T>) {
    state = { ...state, ...updater(state) } as T
    // Plain `Event`, not `CustomEvent`. CustomEvent landed as a Node
    // global in v19; using it would crash store updates fired during
    // SSR on Node 18 (the package's lower bound). The `detail` field is
    // never read by subscribers, so there's no functional difference.
    events.dispatchEvent(new Event("update"))
  }

  function subscribe(cb: () => void) {
    events.addEventListener("update", cb)
    return () => events.removeEventListener("update", cb)
  }

  return {
    getState() {
      return state
    },
    subscribe
  }
}
