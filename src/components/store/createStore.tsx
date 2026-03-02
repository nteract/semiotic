"use client"
import * as React from "react"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useLayoutEffect
} from "react"

function useSyncExternalStoreShim<T>(
  subscribe: (cb: Function) => () => void,
  getSnapshot: () => T
): T {
  const [value, setValue] = useState<T>(getSnapshot)
  useLayoutEffect(() => {
    return subscribe(() => setValue(getSnapshot))
  }, [subscribe])
  return value
}

export function createStore(fn) {
  let Ctx = createContext(null)
  // Shared fallback source for when there's no provider in the tree.
  // This allows hooks to be called unconditionally (rules of hooks)
  // without crashing. The fallback state is inert (empty selections, etc.).
  let fallbackSource = createSource(fn)

  function Provider({ children }) {
    let source = useMemo(() => createSource(fn), [])

    return <Ctx.Provider value={source} children={children} />
  }

  let useSelector = (selector) => {
    let source = useContext(Ctx) ?? fallbackSource
    let getSnapshot = () => selector(source.getState())
    return useSyncExternalStoreShim(source.subscribe, getSnapshot)
  }

  return [Provider, useSelector]
}

function createSource(fn) {
  let events = new EventTarget()
  let state = fn(set)

  function set(fn) {
    state = Object.assign(state, fn(state))
    events.dispatchEvent(new CustomEvent("update"))
  }

  function subscribe(cb) {
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
