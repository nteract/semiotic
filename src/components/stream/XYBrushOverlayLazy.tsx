/**
 * Lazy-loaded wrapper for XYBrushOverlay.
 *
 * d3-brush pulls d3-selection + d3-drag + d3-transition (~14 KB gz). Most XY
 * charts never enable brushing, so keep that graph out of the default cold path
 * and only load it when `brush` / `onBrush` is actually used.
 *
 * Pattern mirrors `statisticalOverlaysLazy.ts`.
 */
import * as React from "react"
import type { XYBrushOverlayProps } from "./XYBrushOverlay"

type BrushComponent = React.ComponentType<XYBrushOverlayProps>

let cached: BrushComponent | null = null
let loadPromise: Promise<BrushComponent> | null = null

function loadXYBrushOverlay(): Promise<BrushComponent> {
  if (cached) return Promise.resolve(cached)
  if (!loadPromise) {
    loadPromise = import("./XYBrushOverlay").then((mod) => {
      cached = mod.XYBrushOverlay
      return cached
    })
  }
  return loadPromise
}

/**
 * Renders nothing until the brush module resolves, then mounts the real overlay.
 * Acceptable: brush is interaction-driven; the first paint of the SVG layer can
 * lag one tick without affecting chart layout or data marks.
 */
export function XYBrushOverlayLazy(props: XYBrushOverlayProps) {
  const [Comp, setComp] = React.useState<BrushComponent | null>(() => cached)

  React.useEffect(() => {
    if (Comp) return
    let cancelled = false
    loadXYBrushOverlay().then((Loaded) => {
      if (!cancelled) setComp(() => Loaded)
    })
    return () => {
      cancelled = true
    }
  }, [Comp])

  if (!Comp) return null
  return <Comp {...props} />
}
