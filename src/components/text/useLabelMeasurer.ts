import { useEffect, useState } from "react"
import type { LabelMeasurer } from "./labelMeasurement"
import { subscribeToCanvasFontInvalidation } from "../stream/fontLoading"

/** Estimates during hydration; remeasure after mount and whenever fonts load. */
export function useLabelMeasurer(enabled: boolean): LabelMeasurer | undefined {
  const [measure, setMeasure] = useState<LabelMeasurer>()
  useEffect(() => {
    if (!enabled) return
    let active = true
    let unsubscribe = () => {}
    import("./browserLabelMeasurement").then(({ browserLabelMeasurer }) => {
      if (!active) return
      const refresh = () => setMeasure(() => browserLabelMeasurer())
      refresh()
      unsubscribe = subscribeToCanvasFontInvalidation(refresh)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [enabled])
  return enabled ? measure : undefined
}
