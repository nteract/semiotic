import * as React from "react"
import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"
import { resolveAccessor, createSafeDatum } from "./recipeUtils"

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
  /**
   * Render the metric name to the left of each row. Reserves
   * `labelWidth` from the bullet area. @default true
   */
  showLabels?: boolean
  /**
   * Pixel width reserved on the left for row labels. Only used when
   * `showLabels` is true. @default 120
   */
  labelWidth?: number
  /**
   * Render value-axis tick marks below each bullet (since each row is
   * independently scaled, ticks are per-row). @default true
   */
  showTicks?: boolean
  /**
   * Format function for the per-row tick labels rendered below each
   * bullet. @default v => v.toLocaleString()
   */
  tickFormat?: (v: number) => string
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
  const showLabels = cfg.showLabels !== false
  const labelW = showLabels ? (cfg.labelWidth ?? 120) : 0
  const showTicks = cfg.showTicks !== false
  const tickAreaH = showTicks ? 14 : 0
  const tickFormat = cfg.tickFormat ?? ((v: number) => v.toLocaleString())

  // Bullet area sits to the right of the labels. Bars draw inside [bulletX, plot.right].
  const bulletX = plot.x + labelW
  const bulletW = Math.max(0, plot.width - labelW)
  if (bulletW <= 0) return { nodes: [] }

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

  // Datum keys readable by the default tooltip — prefer user-supplied
  // accessor names (when string) plus generic fallbacks.
  const categoryKey = typeof cfg.categoryAccessor === "string" ? cfg.categoryAccessor : "metric"
  const valueKey = typeof cfg.valueAccessor === "string" ? cfg.valueAccessor : "value"
  const targetKey = typeof cfg.targetAccessor === "string" ? cfg.targetAccessor : "target"

  // Compute a per-row max so every bullet is independently scaled (one
  // metric in dollars, another in counts — no shared axis).
  const baseColor = cfg.actualColor ?? ctx.theme.semantic.primary ?? "#3b6cb1"
  // Color cascade: CSS custom property on a parent element (the
  // documented dark-mode pattern) wins, then the theme's semantic color,
  // then the hex fallback. The previous order had the theme winning over
  // the CSS var, which broke dark mode whenever the default light theme
  // was active (its semantic.text is dark, so the wrapper's
  // `--semiotic-text: #e2e8f0` got ignored).
  const themeText = ctx.theme.semantic.text ?? "currentColor"
  const themeTextSecondary = ctx.theme.semantic.textSecondary ?? "#888"
  const themeSurface = ctx.theme.semantic.surface ?? "#e8eaed"
  const themeGrid = ctx.theme.semantic.grid ?? "#cdd1d6"
  const themeBorder = ctx.theme.semantic.border ?? "#a3a8af"
  const targetColor = cfg.targetColor ?? `var(--semiotic-text, ${themeText})`
  const rangeColors = [
    `var(--semiotic-surface, ${themeSurface})`,
    `var(--semiotic-grid, ${themeGrid})`,
    `var(--semiotic-border, ${themeBorder})`,
  ]
  const labelColor = `var(--semiotic-text, ${themeText})`
  const subtleColor = `var(--semiotic-text-secondary, ${themeTextSecondary})`

  const nodes: RectSceneNode[] = []
  // Per-row info captured for overlay rendering after the bar pass.
  const rowInfo: Array<{
    yTop: number
    label: string
    actual: number
    target: number
    maxVal: number
  }> = []

  for (let i = 0; i < ctx.data.length; i++) {
    const d = ctx.data[i]
    const ranges = getRanges(d)
    const actual = getValue(d)
    const target = getTarget(d)
    const maxVal = Math.max(actual, target, ...(ranges.length ? ranges : [0]))
    if (maxVal <= 0) continue

    const yTop = plot.y + i * (rowH + rowGap + tickAreaH)
    // Overflow guard accounts for tick chrome too — when showTicks is
    // enabled the row's footprint is rowH + tickAreaH (the bar plus the
    // ticks/labels rendered below it). Without including tickAreaH here,
    // the last row's tick labels can spill past the plot rect.
    if (yTop + rowH + tickAreaH > plot.y + plot.height) break
    rowInfo.push({ yTop, label: getCategory(d), actual, target, maxVal })

    const xToPx = (v: number) => bulletX + (v / maxVal) * bulletW
    const cat = getCategory(d)

    const makeDatum = (extras: Record<string, unknown>): Datum => {
      const entries: Record<string, unknown> = { metric: cat, ...extras }
      if (categoryKey !== "metric") entries[categoryKey] = cat
      return createSafeDatum(entries)
    }

    // Background range bars — full row height, successively darker.
    let lastEnd = bulletX
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
          datum: makeDatum({ range: r, rangeValue: ranges[r], kind: "range" }),
          group: `range-${r}`,
        })
      }
      lastEnd = endPx
    }

    // Actual value bar — thinner, centered vertically inside the row.
    const actualH = Math.max(6, Math.floor(rowH * 0.45))
    const actualExtras: Record<string, unknown> = { value: actual, kind: "actual" }
    if (valueKey !== "value") actualExtras[valueKey] = actual
    nodes.push({
      type: "rect",
      x: bulletX,
      y: yTop + (rowH - actualH) / 2,
      w: xToPx(actual) - bulletX,
      h: actualH,
      style: { fill: baseColor, stroke: "none" },
      datum: makeDatum(actualExtras),
      group: "actual",
    })

    // Target tick — narrow vertical mark spanning ~80% of row height.
    const tickW = 3
    const tickH = Math.floor(rowH * 0.8)
    const targetExtras: Record<string, unknown> = { target, kind: "target" }
    if (targetKey !== "target") targetExtras[targetKey] = target
    nodes.push({
      type: "rect",
      x: xToPx(target) - tickW / 2,
      y: yTop + (rowH - tickH) / 2,
      w: tickW,
      h: tickH,
      style: { fill: targetColor, stroke: "none" },
      datum: makeDatum(targetExtras),
      group: "target",
    })
  }

  // Chrome overlays (labels + per-row tick marks). Built as React
  // elements via React.createElement so the recipe stays JSX-free.
  const overlayChildren: React.ReactNode[] = []
  for (let i = 0; i < rowInfo.length; i++) {
    const info = rowInfo[i]
    const rowMid = info.yTop + rowH / 2
    if (showLabels) {
      overlayChildren.push(
        React.createElement("text", {
          key: `bullet-label-${i}`,
          x: plot.x + labelW - 8,
          y: rowMid,
          textAnchor: "end",
          dominantBaseline: "middle",
          fontSize: 13,
          fontWeight: 500,
          fill: labelColor,
        }, info.label)
      )
    }
    if (showTicks) {
      // 5 evenly-spaced ticks per row including 0 and max.
      const tickCount = 5
      const tickY = info.yTop + rowH + 2
      for (let t = 0; t < tickCount; t++) {
        const v = (info.maxVal * t) / (tickCount - 1)
        const x = bulletX + (v / info.maxVal) * bulletW
        overlayChildren.push(
          React.createElement("line", {
            key: `bullet-tick-${i}-${t}`,
            x1: x, x2: x,
            y1: tickY, y2: tickY + 3,
            stroke: subtleColor,
            strokeWidth: 1,
          }),
          React.createElement("text", {
            key: `bullet-ticktext-${i}-${t}`,
            x,
            y: tickY + 12,
            textAnchor: t === 0 ? "start" : t === tickCount - 1 ? "end" : "middle",
            fontSize: 10,
            fill: subtleColor,
          }, tickFormat(v))
        )
      }
    }
  }
  const overlays = overlayChildren.length > 0
    ? React.createElement(React.Fragment, null, ...overlayChildren)
    : null

  return { nodes, overlays }
}

