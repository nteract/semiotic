/**
 * Lazy wrapper for MarginalGraphics.
 *
 * d3-array binning is unused on charts that never set `marginalGraphics`,
 * so keep that graph off the default LineChart cold path.
 */
import * as React from "react"
import type { MarginalGraphicsProps } from "./MarginalGraphics"
import { normalizeMarginalConfig } from "./marginalConfig"

export { normalizeMarginalConfig }

type MarginalComponent = React.ComponentType<MarginalGraphicsProps>

let cached: MarginalComponent | null = null
let loadPromise: Promise<MarginalComponent> | null = null

function loadMarginalGraphics(): Promise<MarginalComponent> {
  if (cached) return Promise.resolve(cached)
  if (!loadPromise) {
    loadPromise = import("./MarginalGraphics")
      .then((mod) => {
        cached = mod.MarginalGraphics
        return cached
      })
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

export function MarginalGraphicsLazy(props: MarginalGraphicsProps) {
  const [Comp, setComp] = React.useState<MarginalComponent | null>(() => cached)

  React.useEffect(() => {
    if (Comp) return
    let cancelled = false
    loadMarginalGraphics().then((Loaded) => {
      if (!cancelled) setComp(() => Loaded)
    })
    return () => {
      cancelled = true
    }
  }, [Comp])

  if (!Comp) return null
  return <Comp {...props} />
}
