import * as React from "react"
import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { ConnectorSceneNode, OrdinalSceneNode } from "../stream/ordinalTypes"
import type { PointSceneNode } from "../stream/types"
import { scaleLinear } from "d3-scale"

export interface ParallelCoordinatesConfig {
  /**
   * Field names (in order) defining the axes. Each field must yield a
   * numeric value per datum. The leftmost field is axis 0.
   */
  fields: string[]
  /**
   * Field (or function) yielding a category per datum used for line
   * coloring. If omitted, all lines render in the theme primary color.
   */
  colorBy?: string | ((d: Datum) => string)
  /**
   * Optional per-field [min, max] domains. If omitted, computed from
   * data per field. Useful for locking axes when streaming.
   */
  domains?: Record<string, [number, number]>
  /** Line opacity. Lower for many overlapping rows. @default 0.45 */
  opacity?: number
  /** Line stroke width in px. @default 1.25 */
  strokeWidth?: number
  /**
   * Render small dots at each row's value on each axis. @default false
   * (recommended for low-cardinality data only — gets noisy with 100+ rows).
   */
  showPoints?: boolean
  /**
   * Render axis chrome — vertical axis lines, top labels (the field
   * name), and 5 tick marks per axis showing the domain range. Each
   * axis is independently scaled, so each gets its own ticks. @default
   * true
   */
  showAxes?: boolean
  /**
   * Pixel padding reserved at the **top** of the plot for axis field-name
   * labels. Used only when `showAxes` is `true`. Subtracted from the line
   * drawing area along with bottom padding. @default 24
   *
   * The recipe also reserves bottom padding for tick numbers — 18px when
   * `showAxes` is true, 8px when it's false. That bottom value is fixed;
   * use a smaller chart `margin.bottom` if you need tighter packing.
   * Top padding when `showAxes` is false is also a fixed 8px (so polyline
   * endpoints don't hug the chart edge).
   */
  axisLabelPadding?: number
  /**
   * Optional per-field tick formatter map. Falls back to
   * `v.toLocaleString()` for fields without explicit formatters.
   */
  tickFormat?: Record<string, (v: number) => string>
  /**
   * Predicate that decides which rows render at full opacity. Rows where
   * `highlightFn(d) === false` render at `dimmedOpacity` instead, with
   * the matching rows z-ordered on top so they don't get covered by
   * neighbors. Recipes are pure functions so they can't own brush state
   * themselves — wire this from a parent component that manages the
   * selection (hover, brush, search query, etc.). Leave undefined for
   * uniform opacity.
   *
   * Roadmap: a future `<ParallelCoordinatesBrushes>` overlay component
   * will manage drag-to-brush state and feed this hook automatically;
   * `useBrushSelection` will carry per-field range constraints across
   * linked charts. This prop is the integration point both will use.
   */
  highlightFn?: (d: Datum) => boolean
  /** Stroke opacity for non-matching rows when `highlightFn` is set. @default 0.08 */
  dimmedOpacity?: number
}

/**
 * Parallel coordinates — one polyline per row, traced across N parallel
 * vertical axes. Each axis represents a numeric field with its own
 * independent linear scale, so columns in different units can sit
 * side-by-side without normalizing.
 *
 * Useful for high-dimensional pattern hunting: clusters of similar rows,
 * outliers that "swing wildly" between axes, and inverse correlations
 * (lines crossing).
 *
 * @example
 * ```tsx
 * import { OrdinalCustomChart } from "semiotic/ordinal"
 * import { parallelCoordinatesLayout } from "semiotic/recipes"
 *
 * <OrdinalCustomChart
 *   data={cars}
 *   layout={parallelCoordinatesLayout}
 *   layoutConfig={{
 *     fields: ["mpg", "displacement", "horsepower", "weight", "acceleration"],
 *     colorBy: "origin",
 *   }}
 *   width={800}
 *   height={400}
 * />
 * ```
 */
export const parallelCoordinatesLayout: OrdinalCustomLayout<ParallelCoordinatesConfig> = (ctx) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  const fields = cfg.fields ?? []
  if (fields.length < 2 || plot.width <= 0 || plot.height <= 0) return { nodes: [] }
  if (ctx.data.length === 0) return { nodes: [] }

  // Compute per-field domain — either user-supplied or inferred from data.
  const domains: Record<string, [number, number]> = {}
  for (const f of fields) {
    if (cfg.domains?.[f]) {
      domains[f] = cfg.domains[f]
      continue
    }
    let lo = Infinity
    let hi = -Infinity
    for (const d of ctx.data) {
      const v = Number(d[f])
      if (!Number.isFinite(v)) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
      // Degenerate axis (all-equal or all-missing) — pin to a unit range so
      // every row plots at the axis midpoint instead of NaN.
      domains[f] = [0, 1]
    } else {
      domains[f] = [lo, hi]
    }
  }

  // Each axis gets a linear scale mapping its domain → vertical pixel
  // span. Reserve top space for axis labels (the field name) and bottom
  // space for tick numbers when chrome is enabled.
  const showAxes = cfg.showAxes !== false
  const topPadding = showAxes ? (cfg.axisLabelPadding ?? 24) : 8
  const bottomPadding = showAxes ? 18 : 8
  const yScales = fields.map((f) =>
    scaleLinear()
      .domain(domains[f])
      .range([plot.y + plot.height - bottomPadding, plot.y + topPadding])
  )

  // Axis x-positions evenly spaced across the plot.
  const axisX: number[] = fields.map((_, i) =>
    fields.length === 1
      ? plot.x + plot.width / 2
      : plot.x + (i / (fields.length - 1)) * plot.width
  )

  const getColor = cfg.colorBy
    ? (typeof cfg.colorBy === "function"
        ? cfg.colorBy
        : (d: Datum) => String(d[cfg.colorBy as string] ?? ""))
    : null

  const opacity = cfg.opacity ?? 0.45
  const strokeWidth = cfg.strokeWidth ?? 1.25
  const defaultStroke = ctx.theme.semantic.primary ?? "#3b6cb1"
  const dimmedOpacity = cfg.dimmedOpacity ?? 0.08
  const highlightFn = cfg.highlightFn

  // When highlightFn is set, build the scene in two passes so highlighted
  // rows render *after* dimmed rows (canvas paints in array order). That
  // way the highlighted polyline isn't covered by faint neighbors.
  const dimmedNodes: OrdinalSceneNode[] = []
  const highlightNodes: OrdinalSceneNode[] = []

  for (const d of ctx.data) {
    const stroke = getColor ? ctx.resolveColor(String(getColor(d))) : defaultStroke
    const isHighlighted = highlightFn ? highlightFn(d) : true
    const rowOpacity = highlightFn
      ? (isHighlighted ? Math.min(1, opacity + 0.4) : dimmedOpacity)
      : opacity
    const target = isHighlighted ? highlightNodes : dimmedNodes

    // For each consecutive pair of fields, emit one connector segment.
    for (let i = 0; i < fields.length - 1; i++) {
      const a = Number(d[fields[i]])
      const b = Number(d[fields[i + 1]])
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue
      const seg: ConnectorSceneNode = {
        type: "connector",
        x1: axisX[i],
        y1: yScales[i](a),
        x2: axisX[i + 1],
        y2: yScales[i + 1](b),
        style: {
          stroke,
          // Thicken highlighted lines slightly for extra emphasis.
          strokeWidth: highlightFn && isHighlighted ? strokeWidth + 0.75 : strokeWidth,
          opacity: rowOpacity,
          fill: "none",
        },
        datum: d,
      }
      target.push(seg)
    }

    // Optional: dots at each axis crossing.
    if (cfg.showPoints) {
      for (let i = 0; i < fields.length; i++) {
        const v = Number(d[fields[i]])
        if (!Number.isFinite(v)) continue
        const pt: PointSceneNode = {
          type: "point",
          x: axisX[i],
          y: yScales[i](v),
          r: 2.5,
          style: { fill: stroke, stroke: "none", opacity: Math.min(1, rowOpacity + 0.3) },
          datum: d,
        }
        target.push(pt)
      }
    }
  }

  // Axis chrome — vertical axis lines, top labels (the field name), and
  // 5 tick marks per axis. Each axis is independently scaled so each
  // gets its own ticks. Emitted as overlays so they sit above the
  // canvas-rendered polylines.
  let overlays: React.ReactNode = null
  if (showAxes) {
    // CSS variable wins so a dark-mode parent (setting `--semiotic-*`
    // vars on a wrapper, per the docs) overrides the default light
    // theme's semantic colors. Theme color is the var's fallback.
    const axisColor = `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#aaa"})`
    const labelColor = `var(--semiotic-text, ${ctx.theme.semantic.text ?? "currentColor"})`
    const subtleColor = `var(--semiotic-text-secondary, ${ctx.theme.semantic.textSecondary ?? "#888"})`
    const axisTop = plot.y + topPadding
    const axisBot = plot.y + plot.height - bottomPadding
    const elements: React.ReactNode[] = []
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      const x = axisX[i]
      const fmt = cfg.tickFormat?.[f] ?? ((v: number) => v.toLocaleString())

      // Vertical axis line.
      elements.push(
        React.createElement("line", {
          key: `pc-axis-line-${i}`,
          x1: x, x2: x,
          y1: axisTop, y2: axisBot,
          stroke: axisColor,
          strokeWidth: 1,
        })
      )

      // Field name above the axis.
      elements.push(
        React.createElement("text", {
          key: `pc-axis-label-${i}`,
          x,
          y: plot.y + topPadding - 8,
          textAnchor: "middle",
          fontSize: 12,
          fontWeight: 600,
          fill: labelColor,
        }, f)
      )

      // 5 ticks per axis spanning the field's domain.
      const [lo, hi] = domains[f]
      const tickCount = 5
      for (let t = 0; t < tickCount; t++) {
        const v = lo + ((hi - lo) * t) / (tickCount - 1)
        const ty = yScales[i](v)
        elements.push(
          React.createElement("line", {
            key: `pc-tick-${i}-${t}`,
            x1: x - 3, x2: x + 3,
            y1: ty, y2: ty,
            stroke: axisColor,
            strokeWidth: 1,
          }),
          React.createElement("text", {
            key: `pc-ticktext-${i}-${t}`,
            x: x + 6,
            y: ty + 3,
            fontSize: 10,
            fill: subtleColor,
          }, fmt(v))
        )
      }
    }
    overlays = React.createElement(React.Fragment, null, ...elements)
  }

  // Concat: dimmed first, highlighted last → highlighted polylines paint
  // on top so neighbors don't cover them.
  return { nodes: dimmedNodes.concat(highlightNodes), overlays }
}
