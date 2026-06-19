import { useEffect, useRef } from "react"
import type { StalenessConfig } from "./types"
import { resolveStaleness } from "./stalenessBands"

interface StoreWithIngestTime {
  lastIngestTime: number
}

/**
 * Shared hook that polls a store's `lastIngestTime` on a 1-second interval
 * and manages staleness state. When the resolved staleness changes it sets
 * `dirtyRef.current = true` and calls `scheduleRender()` so the canvas
 * repaints with the appropriate dimming.
 *
 * Handles both binary staleness (a single live→stale flip) and graded
 * staleness (progressive dimming through fresh → aging → stale → expired):
 * a repaint is scheduled whenever the resolved *band* changes, so the
 * graded ramp advances even though `isStale` may already be true.
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
  // Last band a repaint was scheduled for, so graded transitions
  // (aging → stale → expired) each trigger exactly one repaint.
  const lastBandRef = useRef<string>("fresh")

  useEffect(() => {
    if (!staleness) return
    const interval = setInterval(() => {
      const store = storeRef.current
      if (!store || store.lastIngestTime === 0) return
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const resolved = resolveStaleness(staleness, now - store.lastIngestTime)

      if (resolved.band !== lastBandRef.current || resolved.isStale !== isStale) {
        lastBandRef.current = resolved.band
        if (resolved.isStale !== isStale) setIsStale(resolved.isStale)
        dirtyRef.current = true
        scheduleRender()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [staleness, isStale, scheduleRender])
}
