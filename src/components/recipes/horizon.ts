import type { CustomLayout } from "../stream/customLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { AreaSceneNode } from "../stream/types"
import { interpolateRgb } from "d3-interpolate"

export interface HorizonConfig {
  /** Field name (or function) yielding the x value (typically time/date). */
  xAccessor: string | ((d: Datum) => number | Date)
  /** Field name (or function) yielding the y value. */
  yAccessor: string | ((d: Datum) => number)
  /** Number of horizon bands per side (positive + negative). @default 3 */
  bands?: number
  /**
   * Two-stop ramps for positive and negative values. Successive bands
   * darken as |value| grows. Defaults pull from theme semantic colors
   * (success/danger).
   */
  positiveColors?: [string, string]
  negativeColors?: [string, string]
}

/**
 * Horizon chart — N stacked, color-banded slices of a continuous series
 * compressed into a compact row. The classic overlay algorithm: each
 * band b draws `clamp(val - b * amp/N, 0, amp/N)` from the baseline,
 * scaled so a full-band magnitude fills the entire plot height. Bands
 * paint in order with progressively darker colors so high-magnitude
 * regions naturally appear darkest.
 *
 * Negatives fold upward into the same row with a contrasting color ramp.
 *
 * Pass an `xExtent` / `yExtent` on `<CustomChart>` to lock the domain;
 * otherwise the chart auto-scales to your data.
 *
 * @example
 * ```tsx
 * <CustomChart
 *   data={timeSeries}
 *   layout={horizonLayout}
 *   layoutConfig={{ xAccessor: "time", yAccessor: "value", bands: 4 }}
 * />
 * ```
 */
export const horizonLayout: CustomLayout<HorizonConfig> = (ctx) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  const { scales, data } = ctx
  if (data.length === 0 || plot.width <= 0 || plot.height <= 0) return { nodes: [] }

  const getX = resolveAccessor(cfg.xAccessor)
  const getY = resolveAccessor(cfg.yAccessor) as (d: Datum) => number
  const bands = Math.max(1, Math.floor(cfg.bands ?? 3))

  // Sample (px, value) pairs sorted by x.
  const samples: { x: number; v: number }[] = []
  for (const d of data) {
    const xRaw = getX(d)
    const xVal = xRaw instanceof Date ? xRaw.valueOf() : Number(xRaw)
    const yVal = Number(getY(d))
    if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue
    samples.push({ x: scales.x(xVal), v: yVal })
  }
  if (samples.length === 0) return { nodes: [] }
  samples.sort((a, b) => a.x - b.x)

  // Amplitude = max |value| across the series. Each band represents amp/N.
  let amp = 0
  for (const s of samples) {
    if (Math.abs(s.v) > amp) amp = Math.abs(s.v)
  }
  if (amp === 0) return { nodes: [] }
  const ampPerBand = amp / bands

  const baselineY = plot.y + plot.height
  const nodes: AreaSceneNode[] = []

  const posLow = cfg.positiveColors?.[0] ?? mix(ctx.theme.semantic.success ?? "#2e7d32", "#ffffff", 0.7)
  const posHigh = cfg.positiveColors?.[1] ?? (ctx.theme.semantic.success ?? "#2e7d32")
  const negLow = cfg.negativeColors?.[0] ?? mix(ctx.theme.semantic.danger ?? "#c62828", "#ffffff", 0.7)
  const negHigh = cfg.negativeColors?.[1] ?? (ctx.theme.semantic.danger ?? "#c62828")

  // For each band, draw `clamp(val - b*ampPerBand, 0, ampPerBand)` mapped
  // so a full-band magnitude (== ampPerBand) reaches the top of the plot.
  // Bands paint in order; higher bands overlap lower ones for the classic
  // horizon-darkness-by-magnitude look.
  for (let b = 0; b < bands; b++) {
    const t = bands === 1 ? 1 : b / (bands - 1)

    // Positive side
    const posTopPath: [number, number][] = new Array(samples.length)
    const posBottomPath: [number, number][] = new Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      const vAboveBase = Math.max(0, s.v - b * ampPerBand)
      const vb = Math.min(ampPerBand, vAboveBase)
      const y = baselineY - (vb / ampPerBand) * plot.height
      posTopPath[i] = [s.x, y]
      posBottomPath[i] = [s.x, baselineY]
    }
    nodes.push({
      type: "area",
      topPath: posTopPath,
      bottomPath: posBottomPath,
      style: { fill: interpolateRgb(posLow, posHigh)(t), stroke: "none", fillOpacity: 1 },
      datum: null,
      group: `horizon-pos-${b}`,
    })

    // Negative side (folded upward into the same row).
    const negTopPath: [number, number][] = new Array(samples.length)
    const negBottomPath: [number, number][] = new Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      const absMag = Math.max(0, -s.v)
      const vAboveBase = Math.max(0, absMag - b * ampPerBand)
      const vb = Math.min(ampPerBand, vAboveBase)
      const y = baselineY - (vb / ampPerBand) * plot.height
      negTopPath[i] = [s.x, y]
      negBottomPath[i] = [s.x, baselineY]
    }
    nodes.push({
      type: "area",
      topPath: negTopPath,
      bottomPath: negBottomPath,
      style: { fill: interpolateRgb(negLow, negHigh)(t), stroke: "none", fillOpacity: 1 },
      datum: null,
      group: `horizon-neg-${b}`,
    })
  }

  return { nodes }
}

function resolveAccessor<T = unknown>(a: string | ((d: Datum) => T)): (d: Datum) => T {
  if (typeof a === "function") return a
  return (d: Datum) => d[a] as T
}

function mix(a: string, b: string, t: number): string {
  return interpolateRgb(a, b)(t)
}
