"use client"
import * as React from "react"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useLayoutEffect
} from "react"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

interface Source<T> {
  getState(): T
  subscribe: (cb: () => void) => () => void
}

function useSyncExternalStoreShim<T>(
  subscribe: (cb: () => void) => () => void,
  getSnapshot: () => T
): T {
  const [value, setValue] = useState<T>(getSnapshot)
  useIsomorphicLayoutEffect(() => {
    return subscribe(() => setValue(getSnapshot))
  }, [subscribe])
  return value
}

export function createStore<T>(
  fn: (set: (updater: (current: T) => Partial<T>) => void) => T
): [React.FC<{ children: React.ReactNode }>, <R>(selector: (state: T) => R) => R] {
  const Ctx = createContext<Source<T> | null>(null)
  const fallbackSource = createSource(fn)

  function Provider({ children }: { children: React.ReactNode }) {
    const source = useMemo(() => createSource(fn), [])
    return <Ctx.Provider value={source} children={children} />
  }

  const useSelector = <R,>(selector: (state: T) => R): R => {
    const source = useContext(Ctx) ?? fallbackSource
    const getSnapshot = () => selector(source.getState())
    return useSyncExternalStoreShim(source.subscribe, getSnapshot)
  }

  return [Provider, useSelector]
}

function createSource<T>(
  fn: (set: (updater: (current: T) => Partial<T>) => void) => T
): Source<T> {
  const events = new EventTarget()
  let state = fn(set)

  function set(updater: (current: T) => Partial<T>) {
    state = { ...state, ...updater(state) } as T
    events.dispatchEvent(new CustomEvent("update"))
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
