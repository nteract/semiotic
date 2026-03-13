import { useEffect } from "react"
import type { StalenessConfig } from "./types"

interface StoreWithIngestTime {
  lastIngestTime: number
}

/**
 * Shared hook that polls a store's `lastIngestTime` on a 1-second interval
 * and manages staleness state. When staleness changes it sets
 * `dirtyRef.current = true` and calls `scheduleRender()` so the canvas
 * repaints with the appropriate dimming.
 *
 * Call this hook after `storeRef`, `dirtyRef`, and `scheduleRender` are
 * declared. The `isStale` / `setIsStale` state must live in the caller
 * so that the `useState` call order stays unchanged.
 */
export function useStalenessCheck(
  staleness: StalenessConfig | undefined,
  storeRef: React.RefObject<StoreWithIngestTime | null>,
  dirtyRef: React.MutableRefObject<boolean>,
  scheduleRender: () => void,
  isStale: boolean,
  setIsStale: (stale: boolean) => void
): void {
  useEffect(() => {
    if (!staleness) return
    const interval = setInterval(() => {
      const store = storeRef.current
      if (!store || store.lastIngestTime === 0) return
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const threshold = staleness.threshold ?? 5000
      const stale = (now - store.lastIngestTime) > threshold
      if (stale !== isStale) {
        setIsStale(stale)
        dirtyRef.current = true
        scheduleRender()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [staleness, isStale, scheduleRender])
}
