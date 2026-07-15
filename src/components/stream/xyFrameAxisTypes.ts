import type { ReactNode } from "react"

export type AxisTickFormat =
  | ((d: number, index?: number, allTicks?: number[]) => string)
  | ((d: string, index?: number, allTicks?: number[]) => string)
  | ((d: Date, index?: number, allTicks?: number[]) => string)

export type AxisTickFormatter = {
  bivarianceHack(
    d: string | number | Date,
    index?: number,
    allTicks?: number[]
  ): string | ReactNode
}["bivarianceHack"]

/**
 * Per-axis configuration object for an XY frame's `axes: []` array.
 * Distinct from `AxisConfig` exported from the HOC layer (which is the
 * chart-level `xLabel` / `yLabel` / `xFormat` / `yFormat` bundle) —
 * this type describes one axis at a time and is what
 * `frameProps.axes[i]` consumes.
 *
 * Re-exported under the legacy name `AxisConfig` from `SVGOverlay.tsx`
 * for backwards-compatibility with internal callers; new code should
 * import this name directly.
 */
export interface XYFrameAxisConfig {
  orient: "left" | "right" | "top" | "bottom"
  label?: string
  ticks?: number
  /** Per-axis tick label formatter. ReactNode return is supported and
   *  renders inside a `<foreignObject>`. */
  tickFormat?: AxisTickFormatter
  baseline?: boolean | "under"
  jaggedBase?: boolean
  /** Explicit tick values. When provided, bypasses both d3's "nice"
   *  generator and `axisExtent: "exact"` — the caller has hand-picked
   *  the positions. Pixel-distance filtering downstream still drops
   *  overlapping labels. Mirrors the ordinal frame's `rTickValues`. */
  tickValues?: Array<number | Date>
  /** Grid line stroke style: `"dashed"` (6,4), `"dotted"` (2,4), or a
   *  custom strokeDasharray string. Applied to grid lines extending
   *  from ticks across the chart area. */
  gridStyle?: "dashed" | "dotted" | string
  /** Always include the domain max as a tick, even if d3 omits it. */
  includeMax?: boolean
  /** Auto-rotate labels 45° when horizontal spacing is too tight. */
  autoRotate?: boolean
  /** Highlight ticks at time boundaries (new month, year, etc.) with
   *  semibold text. `true` auto-detects Date boundaries. A function
   *  receives (value, index) and returns true for landmark ticks. */
  landmarkTicks?: boolean | ((value: string | number | Date, index: number) => boolean)
  /** Tick label anchoring strategy:
   *  - `"middle"` (default): all tick labels centered on the tick mark
   *  - `"edges"`: first tick label anchors to start, last to end,
   *    middles stay centered. Pairs naturally with `axisExtent: "exact"`
   *    — pins the domain to the data min/max AND keeps the extreme
   *    labels from overflowing the plot. */
  tickAnchor?: "middle" | "edges"
}
