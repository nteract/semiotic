import type { CustomLayout } from "../components/stream/customLayout"
import type { Datum } from "../components/charts/shared/datumTypes"
import type { AreaSceneNode } from "../components/stream/types"
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
 * Horizon chart — N stacked, mirrored, color-banded slices of a continuous
 * series. Compresses high-cardinality time series into compact rows. Built
 * on AreaSceneNode `clipRect` to band a single full-amplitude area into
 * progressively-darker stripes.
 *
 * Pass an `xExtent` / `yExtent` prop on `<CustomChart>` to lock the domain;
 * otherwise the chart auto-scales to your data.
 *
 * @example
 * ```tsx
 * <CustomChart
 *   data={timeSeries}
 *   layout={horizonLayout}
 *   layoutConfig={{
 *     xAccessor: "time",
 *     yAccessor: "value",
 *     bands: 4,
 *   }}
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

  // Compute amplitude (max |y|). Used to size each band.
  let amp = 0
  for (const d of data) {
    const y = Number(getY(d))
    if (!Number.isFinite(y)) continue
    if (Math.abs(y) > amp) amp = Math.abs(y)
  }
  if (amp === 0) return { nodes: [] }

  const bandHeight = plot.height / bands

  // Build full-amplitude paths once. We render the same area `bands` times,
  // each clipped to a different horizontal slice.
  const positive: { x: number; y: number }[] = []
  const negative: { x: number; y: number }[] = []
  // Map data y onto band-stack space: a single band spans [0, amp], stacked.
  // We emit two areas (positive, negative-flipped-up), each scaled so 0 is at
  // the bottom of the plot and amp is at the top. Negative values are folded
  // up by negating before scaling.
  const yToPx = (yMagnitude: number) => plot.y + plot.height - (yMagnitude / amp) * plot.height
  for (const d of data) {
    const xRaw = getX(d)
    const xVal = xRaw instanceof Date ? xRaw.valueOf() : Number(xRaw)
    const yVal = Number(getY(d))
    if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue
    const px = scales.x(xVal)
    if (yVal >= 0) {
      positive.push({ x: px, y: yToPx(yVal) })
      negative.push({ x: px, y: yToPx(0) })
    } else {
      positive.push({ x: px, y: yToPx(0) })
      negative.push({ x: px, y: yToPx(-yVal) })
    }
  }
  positive.sort((a, b) => a.x - b.x)
  negative.sort((a, b) => a.x - b.x)

  const baselineY = plot.y + plot.height
  const nodes: AreaSceneNode[] = []

  const posLow = cfg.positiveColors?.[0] ?? mix(ctx.theme.semantic.success ?? "#2e7d32", "#ffffff", 0.6)
  const posHigh = cfg.positiveColors?.[1] ?? (ctx.theme.semantic.success ?? "#2e7d32")
  const negLow = cfg.negativeColors?.[0] ?? mix(ctx.theme.semantic.danger ?? "#c62828", "#ffffff", 0.6)
  const negHigh = cfg.negativeColors?.[1] ?? (ctx.theme.semantic.danger ?? "#c62828")

  for (let b = 0; b < bands; b++) {
    // Each band shows the slice of full-amplitude path corresponding to
    // |y| ∈ [b/bands, (b+1)/bands] * amp. We render the full path but clip
    // to a horizontal stripe at the bottom of the plot, then translate the
    // visual so progressively-larger values appear in the same band.
    //
    // Concretely: the b-th band's clip rect is the bottom-most band-row of
    // the plot. The path for band b is the full amplitude shifted UP by
    // b * bandHeight so only the top portion (representing |y| > b * amp/bands)
    // intrudes into the visible band.
    const shift = b * bandHeight
    const clipRect = {
      x: plot.x,
      y: plot.y + plot.height - bandHeight,
      width: plot.width,
      height: bandHeight,
    }

    // Positive band b — color darkens with b.
    const posT = bands === 1 ? 1 : b / (bands - 1)
    const posColor = interpolateRgb(posLow, posHigh)(posT)
    nodes.push({
      type: "area",
      topPath: positive.map((p) => [p.x, p.y - shift + (plot.height - bandHeight)]),
      bottomPath: positive.map((p) => [p.x, baselineY]),
      style: { fill: posColor, stroke: "none", fillOpacity: 1 },
      datum: null,
      group: `horizon-pos-${b}`,
      clipRect,
    })

    // Negative band b — folded up + recolored.
    const negColor = interpolateRgb(negLow, negHigh)(posT)
    nodes.push({
      type: "area",
      topPath: negative.map((p) => [p.x, p.y - shift + (plot.height - bandHeight)]),
      bottomPath: negative.map((p) => [p.x, baselineY]),
      style: { fill: negColor, stroke: "none", fillOpacity: 1 },
      datum: null,
      group: `horizon-neg-${b}`,
      clipRect,
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
