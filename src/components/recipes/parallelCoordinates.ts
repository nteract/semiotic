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
  // span (with 8px top/bottom padding so endpoints don't hug the edge).
  const padding = 8
  const yScales = fields.map((f) =>
    scaleLinear()
      .domain(domains[f])
      .range([plot.y + plot.height - padding, plot.y + padding])
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

  const nodes: OrdinalSceneNode[] = []
  for (const d of ctx.data) {
    const stroke = getColor ? ctx.resolveColor(String(getColor(d))) : defaultStroke

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
        style: { stroke, strokeWidth, opacity, fill: "none" },
        datum: d,
      }
      nodes.push(seg)
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
          style: { fill: stroke, stroke: "none", opacity: Math.min(1, opacity + 0.3) },
          datum: d,
        }
        nodes.push(pt)
      }
    }
  }

  return { nodes }
}
