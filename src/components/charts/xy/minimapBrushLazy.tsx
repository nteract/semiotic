/**
 * Lazy-loaded wrapper for MinimapBrush (pulls LinearBrush).
 */
"use client"
import * as React from "react"
import type { MinimapBrushProps } from "./minimapBrush"

type BrushComponent = React.ComponentType<MinimapBrushProps>

let cached: BrushComponent | null = null
let loadPromise: Promise<BrushComponent> | null = null

function loadMinimapBrush(): Promise<BrushComponent> {
  if (cached) return Promise.resolve(cached)
  if (!loadPromise) {
    loadPromise = import("./minimapBrush")
      .then((mod) => {
        cached = mod.MinimapBrush
        return cached
      })
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

/** Renders nothing until the brush module resolves, then mounts the brush. */
export function MinimapBrushLazy(props: MinimapBrushProps) {
  const [Comp, setComp] = React.useState<BrushComponent | null>(() => cached)

  React.useEffect(() => {
    if (Comp) return
    let cancelled = false
    loadMinimapBrush().then((Loaded) => {
      if (!cancelled) setComp(() => Loaded)
    }).catch(() => {
      // Chunk load failure — leave brush unmounted; chart still works.
    })
    return () => { cancelled = true }
  }, [Comp])

  if (!Comp) return null
  return <Comp {...props} />
}
