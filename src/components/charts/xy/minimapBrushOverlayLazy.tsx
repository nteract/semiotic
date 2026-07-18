/**
 * Lazy-loaded wrapper for MinimapBrushOverlay (pulls d3-brush).
 */
"use client"
import * as React from "react"
import type { MinimapBrushOverlayProps } from "./minimapBrushOverlay"

type BrushComponent = React.ComponentType<MinimapBrushOverlayProps>

let cached: BrushComponent | null = null
let loadPromise: Promise<BrushComponent> | null = null

function loadMinimapBrushOverlay(): Promise<BrushComponent> {
  if (cached) return Promise.resolve(cached)
  if (!loadPromise) {
    loadPromise = import("./minimapBrushOverlay")
      .then((mod) => {
        cached = mod.MinimapBrushOverlay
        return cached
      })
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

/** Renders nothing until d3-brush module resolves, then mounts the brush. */
export function MinimapBrushOverlayLazy(props: MinimapBrushOverlayProps) {
  const [Comp, setComp] = React.useState<BrushComponent | null>(() => cached)

  React.useEffect(() => {
    if (Comp) return
    let cancelled = false
    loadMinimapBrushOverlay().then((Loaded) => {
      if (!cancelled) setComp(() => Loaded)
    }).catch(() => {
      // Chunk load failure — leave brush unmounted; chart still works.
    })
    return () => { cancelled = true }
  }, [Comp])

  if (!Comp) return null
  return <Comp {...props} />
}
