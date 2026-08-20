/**
 * Lazy wrapper for MarginalGraphics.
 *
 * d3-array binning is unused on charts that never set `marginalGraphics`,
 * so keep that graph off the default LineChart cold path. Charts that do
 * request marginals (Scatterplot, BubbleChart) call
 * {@link provideMarginalGraphics} with a value import so SSR and the
 * hydration SVG pass can paint immediately.
 */
import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { MarginalGraphicsProps } from "./MarginalGraphics"
import { normalizeMarginalConfig } from "./marginalConfig"

export { normalizeMarginalConfig }

type MarginalComponent = React.ComponentType<MarginalGraphicsProps>

let cached: MarginalComponent | null = null
let loadPromise: Promise<MarginalComponent> | null = null

/** Eagerly install the painter. Call from HOCs that expose `marginalGraphics`. */
export function provideMarginalGraphics(Comp: MarginalComponent): void {
  cached = Comp
}

export function collectMarginalValues(
  data: readonly Datum[],
  xAccessor: unknown,
  yAccessor: unknown,
): { xValues: number[]; yValues: number[] } {
  const getX = typeof xAccessor === "function"
    ? xAccessor as (d: Datum) => unknown
    : (d: Datum) => d[(xAccessor as string) || "x"]
  const getY = typeof yAccessor === "function"
    ? yAccessor as (d: Datum) => unknown
    : (d: Datum) => d[(yAccessor as string) || "y"]
  const xValues: number[] = []
  const yValues: number[] = []
  for (const d of data) {
    const x = getX(d)
    const y = getY(d)
    if (typeof x === "number" && isFinite(x)) xValues.push(x)
    if (typeof y === "number" && isFinite(y)) yValues.push(y)
  }
  return { xValues, yValues }
}

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
