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

  function Provider({ children }) {
    let source = useMemo(() => createSource(fn), [])

    return <Ctx.Provider value={source} children={children} />
  }

  let useSelector = (selector) => {
    let source = useContext(Ctx)
    let getSnapshot = () => selector(source.getState())
    return useSyncExternalStoreShim(source?.subscribe, getSnapshot)
  }

  return [Provider, useSelector]
}

function createSource(fn) {
  let events = new EventTarget()
  let state = fn(set)

  function set(fn) {
    state = Object.assign(state, fn(set))
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
