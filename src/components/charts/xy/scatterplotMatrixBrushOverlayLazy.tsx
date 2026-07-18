/**
 * Lazy-loaded wrapper for ScatterplotMatrixBrushOverlay (pulls d3-brush).
 */
"use client"
import * as React from "react"
import type { ScatterplotMatrixBrushOverlayProps } from "./scatterplotMatrixBrushOverlay"

type BrushComponent = React.ComponentType<ScatterplotMatrixBrushOverlayProps>

let cached: BrushComponent | null = null
let loadPromise: Promise<BrushComponent> | null = null

function loadBrush(): Promise<BrushComponent> {
  if (cached) return Promise.resolve(cached)
  if (!loadPromise) {
    loadPromise = import("./scatterplotMatrixBrushOverlay")
      .then((mod) => {
        cached = mod.ScatterplotMatrixBrushOverlay
        return cached
      })
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

export function ScatterplotMatrixBrushOverlayLazy(props: ScatterplotMatrixBrushOverlayProps) {
  const [Comp, setComp] = React.useState<BrushComponent | null>(() => cached)

  React.useEffect(() => {
    if (Comp) return
    let cancelled = false
    loadBrush().then((Loaded) => {
      if (!cancelled) setComp(() => Loaded)
    }).catch(() => { /* leave unmounted */ })
    return () => { cancelled = true }
  }, [Comp])

  if (!Comp) return null
  return <Comp {...props} />
}
