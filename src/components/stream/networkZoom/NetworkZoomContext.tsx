"use client"
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react"
import type { ReactNode } from "react"
import type { NetworkZoomState } from "./types"
import {
  createNetworkZoomStore,
  type NetworkZoomStore
} from "./NetworkZoomStore"

const defaultStore = /* @__PURE__ */ createNetworkZoomStore()
const NetworkZoomContext = /* @__PURE__ */ createContext(defaultStore)

/** Internal provider. A supplied value also supports isolated content/SSR tests. */
export function NetworkZoomProvider({
  value,
  store,
  children
}: {
  value?: NetworkZoomState
  store?: NetworkZoomStore
  children: ReactNode
}) {
  const [local] = useState(() => store ?? createNetworkZoomStore(value))
  const active = store ?? local
  useLayoutEffect(() => {
    if (value) active.update(value)
  }, [active, value])
  return (
    <NetworkZoomContext.Provider value={active}>
      {children}
    </NetworkZoomContext.Provider>
  )
}

/** Read live camera facts inside a zoomable chart. Outside a chart the identity
 * camera keeps reusable content usable. Changes include pan and visibleRect. */
export function useNetworkZoom(): NetworkZoomState {
  const store = useContext(NetworkZoomContext)
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )
}

/** Displayed CSS-pixel size, with the last settled size for deferred work. */
export function useNetworkProjectedSize(width: number, height: number) {
  const store = useContext(NetworkZoomContext)
  const { k, settledK, isInteracting } = useSyncExternalStore(
    store.subscribeSize,
    store.getSize,
    store.getSize
  )
  return {
    width: width * k,
    height: height * k,
    settledWidth: width * settledK,
    settledHeight: height * settledK,
    isInteracting
  }
}

/** Consumer-authored width thresholds; levels are 0 through breakpoints.length. */
export interface NetworkLODOptions {
  /** Ascending CSS-pixel widths at which the next detail level becomes useful. */
  breakpoints: readonly number[]
  /** CSS-pixel dead band around each threshold. @default 8 */
  hysteresis?: number
  /** Preserve full detail while an editor has focus; prevents input unmounting. */
  keepDetail?: boolean
}

/** Projected size plus a stable LOD. Demotion is immediate; promotion waits
 * until interaction settles. This does not fetch data or choose card markup.
 * Use the returned level/isInteracting to gate cancellable consumer requests. */
export function useNetworkLOD(
  width: number,
  height: number,
  options: NetworkLODOptions
) {
  const size = useNetworkProjectedSize(width, height)
  const thresholds = options.breakpoints
    .filter(Number.isFinite)
    .slice()
    .sort((a, b) => a - b)
  const desired = thresholds.filter((value) => size.width >= value).length
  // A deferred first render is not a real previous detail level. Newly
  // virtualized cards establish their level at the first settle; applying the
  // promotion dead band to the placeholder can leave them behind neighbors.
  const [previous, setPrevious] = useState<number | null>(() =>
    size.isInteracting ? null : desired
  )
  const band = Number.isFinite(options.hysteresis)
    ? Math.max(0, options.hysteresis!)
    : 8
  const level = resolveLevel(
    previous,
    size.width,
    size.isInteracting,
    thresholds,
    band,
    options.keepDetail
  )
  useEffect(() => {
    if (previous !== level && (previous !== null || !size.isInteracting))
      setPrevious(level)
  }, [level, previous, size.isInteracting])
  return { ...size, level }
}

function resolveLevel(
  previous: number | null,
  width: number,
  moving: boolean,
  thresholds: number[],
  band: number,
  keepDetail?: boolean
) {
  const desired = thresholds.filter((value) => width >= value).length
  let level = Math.min(previous ?? (moving ? 0 : desired), thresholds.length)
  while (level > 0 && width < thresholds[level - 1] - band) level--
  if (!moving)
    while (level < thresholds.length && width >= thresholds[level] + band)
      level++
  return keepDetail ? thresholds.length : level
}

/** Discrete detail level without subscribing to live pixel sizes or viewport
 * movement. Demotion is immediate, promotion waits for settle, and keepDetail
 * retains focused editors. Levels range from 0 through breakpoints.length. */
export function useNetworkLODLevel(
  width: number,
  options: NetworkLODOptions
): number {
  const store = useContext(NetworkZoomContext)
  const thresholdsKey = options.breakpoints
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .join(",")
  const band = Number.isFinite(options.hysteresis)
    ? Math.max(0, options.hysteresis!)
    : 8
  const committed = useRef<{ previous: number | null }>({ previous: null })
  const selection = useMemo(() => {
    const thresholds = thresholdsKey ? thresholdsKey.split(",").map(Number) : []
    let snapshot: ReturnType<NetworkZoomStore["getSize"]> | undefined
    let level = 0
    const result = {
      previous: committed.current.previous,
      read() {
        const next = store.getSize()
        if (next !== snapshot) {
          snapshot = next
          level = resolveLevel(
            result.previous,
            width * next.k,
            next.isInteracting,
            thresholds,
            band,
            options.keepDetail
          )
          if (result.previous !== null || !next.isInteracting)
            result.previous = level
        }
        return level
      }
    }
    return result
  }, [store, width, thresholdsKey, band, options.keepDetail])
  const level = useSyncExternalStore(
    store.subscribeSize,
    selection.read,
    selection.read
  )
  useLayoutEffect(() => {
    committed.current = selection
  }, [selection])
  return level
}
