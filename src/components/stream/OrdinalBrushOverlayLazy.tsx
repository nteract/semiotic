/**
 * Lazy-loaded wrapper for OrdinalBrushOverlay.
 *
 * Same rationale as XYBrushOverlayLazy: d3-brush is only needed when brushing
 * is enabled. Keep it off the default ordinal cold path (BarChart, PieChart…).
 */
import * as React from "react"
import type { OrdinalBrushOverlayProps } from "./OrdinalBrushOverlay"

type BrushComponent = React.ComponentType<OrdinalBrushOverlayProps>

let cached: BrushComponent | null = null
let loadPromise: Promise<BrushComponent> | null = null

function loadOrdinalBrushOverlay(): Promise<BrushComponent> {
  if (cached) return Promise.resolve(cached)
  if (!loadPromise) {
    loadPromise = import("./OrdinalBrushOverlay")
      .then((mod) => {
        cached = mod.OrdinalBrushOverlay
        return cached
      })
      .catch((err) => {
        // Clear so a later mount can retry after a flaky chunk load.
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

export function OrdinalBrushOverlayLazy(props: OrdinalBrushOverlayProps) {
  const [Comp, setComp] = React.useState<BrushComponent | null>(() => cached)

  React.useEffect(() => {
    if (Comp) return
    let cancelled = false
    loadOrdinalBrushOverlay().then((Loaded) => {
      if (!cancelled) setComp(() => Loaded)
    })
    return () => {
      cancelled = true
    }
  }, [Comp])

  if (!Comp) return null
  return <Comp {...props} />
}
