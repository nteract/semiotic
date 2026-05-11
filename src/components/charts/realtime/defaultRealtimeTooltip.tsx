/**
 * Default tooltip for the Realtime HOCs.
 *
 * Reads the raw datum off `hover.data` using the consumer's
 * configured `timeAccessor` / `valueAccessor` (string field names or
 * accessor functions, mirroring the HOC prop shape) and renders an
 * `x: …` / `y: …` two-line layout. Each Realtime HOC threads this
 * through its `resolvedTooltip = tooltipContent ?? tooltip ??
 * buildDefault(...)` chain so the chart shows real data values out
 * of the box without overriding any explicit consumer tooltip.
 *
 * The Stream Frame's generic `DefaultTooltip` doesn't know the
 * consumer's accessor names, so it falls back on canonical-shape
 * field lookup (`y` / `value`, `x` / `time`) on the raw datum. This
 * helper exists so Realtime HOCs — which DO know their accessor
 * names — can render values from any field shape the user pushes.
 */
import * as React from "react"
import type { ReactNode } from "react"
import type { Datum } from "../shared/datumTypes"
import type { HoverData } from "../../realtime/types"
import type { ChartAccessor } from "../shared/types"

const tooltipStyle: React.CSSProperties = {
  background: "var(--semiotic-tooltip-bg, rgba(0, 0, 0, 0.85))",
  color: "var(--semiotic-tooltip-text, #f3f4f6)",
  padding: "6px 10px",
  borderRadius: "var(--semiotic-tooltip-radius, 4px)",
  fontSize: "var(--semiotic-tooltip-font-size, 12px)",
  fontFamily: "var(--semiotic-tick-font-family, var(--semiotic-font-family, sans-serif))",
  boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 8px rgba(0, 0, 0, 0.25))",
  lineHeight: 1.4,
  pointerEvents: "none",
  whiteSpace: "nowrap",
}

const labelStyle: React.CSSProperties = { opacity: 0.7, marginRight: 4 }

interface DefaultRealtimeTooltipOptions<TDatum extends Datum = Datum> {
  timeAccessor?: ChartAccessor<TDatum, number>
  valueAccessor?: ChartAccessor<TDatum, number>
  /**
   * Field-name aliases shown in the tooltip ("x" / "y" by default).
   * Some Realtime HOCs may want to show "time" / "value" or
   * "category" / "count" — pass overrides here. The strings are
   * cosmetic; data lookup still uses `timeAccessor`/`valueAccessor`.
   */
  xLabel?: string
  yLabel?: string
}

function readField<TDatum extends Datum>(
  datum: TDatum | null | undefined,
  accessor: ChartAccessor<TDatum, number> | undefined,
  fallback: string,
): unknown {
  if (datum == null) return undefined
  if (typeof accessor === "function") return accessor(datum)
  const key = (typeof accessor === "string" ? accessor : fallback) as keyof TDatum
  return datum[key]
}

function format(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(2)
  }
  if (v instanceof Date) return v.toLocaleString()
  return String(v)
}

/**
 * Build a default tooltip renderer for a Realtime HOC. Returns a
 * function compatible with `tooltipContent: (d: HoverData) => ReactNode`.
 */
export function buildDefaultRealtimeTooltip<TDatum extends Datum = Datum>(
  options: DefaultRealtimeTooltipOptions<TDatum> = {},
): (d: HoverData) => ReactNode {
  const { timeAccessor, valueAccessor, xLabel = "x", yLabel = "y" } = options
  return (d: HoverData) => {
    const datum = (d?.data ?? null) as TDatum | null
    const x = readField(datum, timeAccessor, "time")
    const y = readField(datum, valueAccessor, "value")
    return (
      <div className="semiotic-tooltip" style={tooltipStyle}>
        <div><span style={labelStyle}>{xLabel}:</span>{format(x)}</div>
        <div><span style={labelStyle}>{yLabel}:</span>{format(y)}</div>
      </div>
    )
  }
}

/**
 * Waterfall-specific default tooltip.
 *
 * The waterfall scene builder enriches each rect's datum with
 * `baseline` (cumulative at the start of the bar), `cumEnd`
 * (cumulative at the top of the bar), and `delta` (signed per-tick
 * change). The default `x:`/`y:` shape is misleading for waterfall
 * because the bar's vertical projection encodes the *cumulative*
 * total — hovering a bar high on the chart and seeing the per-tick
 * delta felt disconnected from what the bar visually showed.
 *
 * This tooltip surfaces all three relevant quantities:
 *   x:  <time>        (the configured timeAccessor)
 *   Δ:  +5.2 / -3.1   (the per-tick delta, sign-prefixed)
 *   total: 87.4       (the cumulative running sum at the bar top)
 *
 * Falls back to the canonical x/y shape if the enriched fields are
 * absent (e.g. a static-data render that bypassed the waterfall
 * scene builder).
 */
export function buildWaterfallTooltip<TDatum extends Datum = Datum>(
  options: DefaultRealtimeTooltipOptions<TDatum> = {},
): (d: HoverData) => ReactNode {
  const { timeAccessor, valueAccessor } = options
  return (d: HoverData) => {
    const datum = (d?.data ?? null) as (TDatum & { delta?: number; cumEnd?: number; baseline?: number }) | null
    const x = readField(datum, timeAccessor, "time")
    const delta = datum?.delta ?? readField(datum, valueAccessor, "value")
    const cumEnd = datum?.cumEnd
    const deltaStr =
      typeof delta === "number"
        ? (delta >= 0 ? `+${format(delta)}` : format(delta))
        : format(delta)
    return (
      <div className="semiotic-tooltip" style={tooltipStyle}>
        <div><span style={labelStyle}>x:</span>{format(x)}</div>
        <div><span style={labelStyle}>Δ:</span>{deltaStr}</div>
        {cumEnd != null && (
          <div><span style={labelStyle}>total:</span>{format(cumEnd)}</div>
        )}
      </div>
    )
  }
}

/**
 * Histogram-specific default tooltip.
 *
 * The barScene's histogram path enriches each rect's datum with
 * `{ binStart, binEnd, total, category?, categoryValue? }`. The generic
 * `x: <time>, y: <value>` shape produces empty strings on those bins
 * because neither `time` nor `value` exists on the aggregated payload.
 * This builder surfaces the fields that actually carry meaning for a
 * histogram bin:
 *
 *   range:    <binStart>–<binEnd>
 *   count:    <total>
 *   category: <category>        (only when categoryAccessor is set)
 *
 * Falls back to the canonical x/y shape if a bin's enriched fields are
 * absent — guards against a non-streaming render path or a static frame
 * that bypasses the bin scene.
 */
export function buildHistogramTooltip<TDatum extends Datum = Datum>(
  options: DefaultRealtimeTooltipOptions<TDatum> = {},
): (d: HoverData) => ReactNode {
  const { timeAccessor, valueAccessor } = options
  return (d: HoverData) => {
    const datum = (d?.data ?? null) as (TDatum & {
      binStart?: number; binEnd?: number; total?: number;
      category?: string; categoryValue?: number;
    }) | null
    const hasBin = datum?.binStart != null && datum?.binEnd != null
    if (!hasBin) {
      // Static-data / non-streaming fallback — use the canonical x/y shape.
      const x = readField(datum, timeAccessor, "time")
      const y = readField(datum, valueAccessor, "value")
      return (
        <div className="semiotic-tooltip" style={tooltipStyle}>
          <div><span style={labelStyle}>x:</span>{format(x)}</div>
          <div><span style={labelStyle}>y:</span>{format(y)}</div>
        </div>
      )
    }
    return (
      <div className="semiotic-tooltip" style={tooltipStyle}>
        <div><span style={labelStyle}>range:</span>{format(datum!.binStart)}–{format(datum!.binEnd)}</div>
        {datum!.total != null && (
          <div><span style={labelStyle}>count:</span>{format(datum!.total)}</div>
        )}
        {datum!.category != null && (
          <div><span style={labelStyle}>category:</span>{format(datum!.category)}</div>
        )}
      </div>
    )
  }
}

/**
 * Heatmap-specific default tooltip.
 *
 * The streaming heatmap aggregates raw points into 2D bins; each cell's
 * datum is `{ xi, yi, value, count, sum, xCenter, yCenter, agg }`. The
 * generic `x: <time>, y: <value>` shape is meaningless because the cell
 * doesn't carry the user's original fields — it carries bin indices and
 * aggregated counts.
 *
 * This tooltip surfaces the user-relevant info:
 *   x:     <data-space x-center of the bin>
 *   y:     <data-space y-center of the bin>
 *   count: 12               (when datum.count is present — streaming path)
 *   sum:   142              (when agg === "sum")
 *   mean:  11.83            (when agg === "mean")
 *
 * For `agg === "sum"` we always surface the sum (it's the metric the
 * heatmap is colored by, even when sum happens to equal count).
 *
 * Falls back to the canonical x/y shape if the enriched fields are
 * absent (e.g. a non-streaming render path); the count/sum/mean rows
 * only appear when the matching field is present on the datum.
 */
export function buildHeatmapTooltip<TDatum extends Datum = Datum>(
  options: DefaultRealtimeTooltipOptions<TDatum> = {},
): (d: HoverData) => ReactNode {
  const { timeAccessor, valueAccessor, xLabel = "x", yLabel = "y" } = options
  return (d: HoverData) => {
    const datum = (d?.data ?? null) as (TDatum & {
      xi?: number; yi?: number;
      value?: number; count?: number; sum?: number;
      xCenter?: number; yCenter?: number;
      agg?: "count" | "sum" | "mean";
    }) | null
    // Prefer the bin's data-space center; fall back to user accessors
    // for non-streaming or custom-emitted heatcells.
    const x = datum?.xCenter ?? readField(datum, timeAccessor, "time")
    const y = datum?.yCenter ?? readField(datum, valueAccessor, "value")
    const count = datum?.count
    // Read the dedicated `sum` and `value` fields directly off the datum
    // contract instead of treating `value` as the sum (it's
    // aggregation-dependent — equals count for "count", mean for "mean").
    // Decoupling the display from `value` semantics keeps the tooltip
    // honest if the scene ever changes how `value` is computed.
    const sum = datum?.sum
    const mean = datum?.value
    const agg = datum?.agg ?? "count"
    return (
      <div className="semiotic-tooltip" style={tooltipStyle}>
        <div><span style={labelStyle}>{xLabel}:</span>{format(x)}</div>
        <div><span style={labelStyle}>{yLabel}:</span>{format(y)}</div>
        {count != null && (
          <div><span style={labelStyle}>count:</span>{format(count)}</div>
        )}
        {agg === "sum" && sum != null && (
          <div><span style={labelStyle}>sum:</span>{format(sum)}</div>
        )}
        {agg === "mean" && mean != null && (
          <div><span style={labelStyle}>mean:</span>{format(mean)}</div>
        )}
      </div>
    )
  }
}
