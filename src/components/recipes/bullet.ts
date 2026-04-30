import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"

export interface BulletConfig {
  /** Field (or function) yielding the row label per datum. Each row is one bullet. */
  categoryAccessor: string | ((d: Datum) => string)
  /** Field (or function) yielding the actual measured value (the dark bar). */
  valueAccessor: string | ((d: Datum) => number)
  /** Field (or function) yielding the target marker value (the perpendicular tick). */
  targetAccessor: string | ((d: Datum) => number)
  /**
   * Field (or function) yielding the qualitative range thresholds — an
   * ascending array of cutoffs ([poor, satisfactory, good]) per datum.
   * The ranges paint as background bars in successively darker shades.
   */
  rangesAccessor: string | ((d: Datum) => number[])
  /** Pixel height of each row's bullet. @default 28 */
  rowHeight?: number
  /** Pixel gap between rows. @default 12 */
  rowGap?: number
  /** Color for the actual-value bar. Defaults to theme primary. */
  actualColor?: string
  /** Color for the target tick. Defaults to theme text. */
  targetColor?: string
}

/**
 * Bullet chart (Stephen Few, 2005) — a compact replacement for KPI gauges.
 * Each row stacks three layers along the value axis:
 *
 *   1. Three background bars in successively darker shades (poor →
 *      satisfactory → good zones) sized by `rangesAccessor` values.
 *   2. The actual measured value as a thinner dark bar.
 *   3. A perpendicular tick at the target.
 *
 * Reads from low to high left-to-right. Far better than a half-circle
 * gauge for dashboards — same information, ~5× the data density, no
 * pie-shaped overhead.
 *
 * All inputs (`actual`, `target`, range thresholds) are treated as
 * non-negative — values < 0 or non-finite are clamped to 0. Range
 * thresholds are also sorted ascending so band order is always
 * deterministic regardless of input order.
 *
 * @example
 * ```tsx
 * import { OrdinalCustomChart } from "semiotic/ordinal"
 * import { bulletLayout } from "semiotic/recipes"
 *
 * <OrdinalCustomChart
 *   data={[
 *     { metric: "Revenue",   actual: 270, target: 250, ranges: [150, 225, 300] },
 *     { metric: "Profit",    actual:  23, target:  27, ranges: [ 20,  25,  30] },
 *     { metric: "Order Size", actual: 102, target: 120, ranges: [ 80, 110, 140] },
 *   ]}
 *   layout={bulletLayout}
 *   layoutConfig={{
 *     categoryAccessor: "metric",
 *     valueAccessor: "actual",
 *     targetAccessor: "target",
 *     rangesAccessor: "ranges",
 *   }}
 *   width={500}
 *   height={180}
 * />
 * ```
 */
export const bulletLayout: OrdinalCustomLayout<BulletConfig> = (ctx) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0 || ctx.data.length === 0) return { nodes: [] }

  const rowH = cfg.rowHeight ?? 28
  const rowGap = cfg.rowGap ?? 12

  const getCategory = resolveAccessor(cfg.categoryAccessor) as (d: Datum) => string
  // Bullet charts are inherently non-negative (they measure progress along
  // a 0-anchored axis). Clamp every numeric input at 0 so a stray negative
  // can't produce inverted rect geometry. Same for non-finite values.
  const clampNonNegative = (v: unknown): number => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const getValue = (d: Datum): number =>
    clampNonNegative(typeof cfg.valueAccessor === "function" ? cfg.valueAccessor(d) : d[cfg.valueAccessor])
  const getTarget = (d: Datum): number =>
    clampNonNegative(typeof cfg.targetAccessor === "function" ? cfg.targetAccessor(d) : d[cfg.targetAccessor])
  const getRanges = (d: Datum): number[] => {
    const v = typeof cfg.rangesAccessor === "function" ? cfg.rangesAccessor(d) : d[cfg.rangesAccessor]
    if (!Array.isArray(v)) return []
    // Clamp at 0 and sort ascending so range bands always paint left-to-right
    // even if the user passed thresholds out of order.
    return v.map(clampNonNegative).sort((a, b) => a - b)
  }

  // Compute a per-row max so every bullet is independently scaled (one
  // metric in dollars, another in counts — no shared axis).
  const baseColor = cfg.actualColor ?? ctx.theme.semantic.primary ?? "#3b6cb1"
  const targetColor = cfg.targetColor ?? ctx.theme.semantic.text ?? "#222"
  // Three grays of increasing darkness for the qualitative ranges. Use
  // theme grid/border/secondary if available, else fall back to fixed grays.
  const rangeColors = [
    ctx.theme.semantic.surface ?? "#e8eaed",
    ctx.theme.semantic.grid ?? "#cdd1d6",
    ctx.theme.semantic.border ?? "#a3a8af",
  ]

  const nodes: RectSceneNode[] = []
  for (let i = 0; i < ctx.data.length; i++) {
    const d = ctx.data[i]
    const ranges = getRanges(d)
    const actual = getValue(d)
    const target = getTarget(d)
    const maxVal = Math.max(actual, target, ...(ranges.length ? ranges : [0]))
    if (maxVal <= 0) continue

    const yTop = plot.y + i * (rowH + rowGap)
    if (yTop + rowH > plot.y + plot.height) break // overflow guard
    const xToPx = (v: number) => plot.x + (v / maxVal) * plot.width

    // Background range bars — full row height, successively darker.
    let lastEnd = plot.x
    for (let r = 0; r < ranges.length; r++) {
      const endPx = xToPx(ranges[r])
      const w = endPx - lastEnd
      if (w > 0) {
        nodes.push({
          type: "rect",
          x: lastEnd,
          y: yTop,
          w,
          h: rowH,
          style: { fill: rangeColors[Math.min(r, rangeColors.length - 1)], stroke: "none" },
          datum: { _bulletRow: getCategory(d), _bulletRange: r, _bulletRangeValue: ranges[r] },
          group: `range-${r}`,
        })
      }
      lastEnd = endPx
    }

    // Actual value bar — thinner, centered vertically inside the row.
    const actualH = Math.max(6, Math.floor(rowH * 0.45))
    nodes.push({
      type: "rect",
      x: plot.x,
      y: yTop + (rowH - actualH) / 2,
      w: xToPx(actual) - plot.x,
      h: actualH,
      style: { fill: baseColor, stroke: "none" },
      datum: { _bulletRow: getCategory(d), _bulletValue: actual, _bulletKind: "actual" },
      group: "actual",
    })

    // Target tick — narrow vertical mark spanning ~80% of row height.
    const tickW = 3
    const tickH = Math.floor(rowH * 0.8)
    nodes.push({
      type: "rect",
      x: xToPx(target) - tickW / 2,
      y: yTop + (rowH - tickH) / 2,
      w: tickW,
      h: tickH,
      style: { fill: targetColor, stroke: "none" },
      datum: { _bulletRow: getCategory(d), _bulletValue: target, _bulletKind: "target" },
      group: "target",
    })
  }

  return { nodes }
}

function resolveAccessor<T = unknown>(a: string | ((d: Datum) => T)): (d: Datum) => T {
  if (typeof a === "function") return a
  return (d: Datum) => d[a] as T
}
