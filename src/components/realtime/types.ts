import type { ReactNode } from "react"
import type { ScaleBand, ScaleLinear } from "d3-scale"
import type { Datum } from "../charts/shared/datumTypes"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"

export type ArrowOfTime = "up" | "down" | "left" | "right"
export type WindowMode = "sliding" | "growing"
export type ThresholdType = "greater" | "lesser"

export interface LineStyle {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

/**
 * How an annotation's anchor is resolved across renders. Shared between
 * the streaming runtime (which implements the resolution) and the
 * `semiotic/ai` annotation lifecycle surface (which exposes the choice
 * to authors via `lifecycle.anchor`).
 *
 * - `"fixed"` (default): anchored to specific datum coordinates;
 *   disappears when out of view.
 * - `"latest"`: annotation re-pins to the most recent datum each frame.
 * - `"sticky"`: annotation stays at its last known pixel position
 *   after the target datum scrolls off; uses `stickyPositionCache`
 *   on `AnnotationContext`.
 * - `"semantic"`: re-resolves via `provenance.stableId` when new data
 *   arrives, falling back to the recorded coordinate if the anchor
 *   can no longer be located.
 */
export type AnnotationAnchor = "fixed" | "latest" | "sticky" | "semantic"

/**
 * @deprecated Use {@link AnnotationAnchor}. Kept as a back-compat alias
 * because earlier 3.x releases shipped this name from the streaming
 * surface; the `Mode` suffix added nothing semantically.
 */
export type AnnotationAnchorMode = AnnotationAnchor

export interface AnnotationContext {
  scales?: {
    x?: ScaleLinear<number, number>
    y?: ScaleLinear<number, number>
    time?: ScaleLinear<number, number>
    value?: ScaleLinear<number, number>
    /** The raw ordinal band scale (only in ordinal frames). Has .bandwidth(). */
    o?: ScaleBand<string>
  } | null
  /** @deprecated Use scales.x / scales.y instead */
  timeAxis?: "x" | "y"
  xAccessor?: string
  yAccessor?: string
  width?: number
  height?: number
  data?: Datum[]
  frameType?: "xy" | "ordinal" | "network"
  /** Ordinal projection direction (only in ordinal frames) */
  projection?: "vertical" | "horizontal"
  /** Point scene nodes for point-anchored annotations */
  pointNodes?: { pointId?: string; x: number; y: number; r: number }[]
  /** Curve interpolation type from the parent chart */
  curve?: string
  /** Cache of last known pixel positions for sticky annotations, keyed by annotation index */
  stickyPositionCache?: Map<number, { x: number; y: number }>
}

export interface CrosshairStyle {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
}

export interface HoverAnnotationConfig {
  crosshair?: boolean | CrosshairStyle
  snapToPoint?: boolean
  /** Color of the hover indicator dot. Defaults to the hovered element's color (stroke for lines, fill for points). Set a CSS color string to override. */
  pointColor?: string
}

export interface HoverData {
  /** The raw datum from the user's data array (may be an object, array, or null for exit nodes) */
  data: Datum | null
  /** Pixel X coordinate of the hovered element */
  x: number
  /** Pixel Y coordinate of the hovered element */
  y: number
  /** @internal Explicit marker used to distinguish Semiotic hover wrappers from raw user data. */
  __semioticHoverData?: true

  // ── XY-specific ──────────────────────────────────────────────────────
  /** All series values at hovered X (multi-point tooltip mode) */
  allSeries?: Array<{ group: string; value: number; valuePx?: number; color: string; datum: Datum }>
  /** Pixel X of hover position (may differ from x for multi-point snap) */
  xPx?: number
  /** Raw X domain value at hover position */
  xValue?: unknown

  // ── Ordinal-specific ─────────────────────────────────────────────────
  /** Distribution statistics for boxplot/violin/ridgeline */
  stats?: { n: number; min: number; q1: number; median: number; q3: number; max: number; mean: number }
  /** Category label of hovered element */
  category?: string
  /** @internal Category accessor name for tooltip rendering */
  __oAccessor?: string
  /** @internal Value accessor name for tooltip rendering */
  __rAccessor?: string
  /** @internal Chart type hint for tooltip rendering */
  __chartType?: string

  // ── Network-specific ─────────────────────────────────────────────────
  /** Whether the hovered element is a node or edge */
  nodeOrEdge?: "node" | "edge"

  // ── Geo-specific ─────────────────────────────────────────────────────
  /** GeoJSON feature properties (flattened for convenience) */
  properties?: Datum
}

export interface BarStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  gap?: number
}

export interface WaterfallStyle {
  positiveColor?: string
  negativeColor?: string
  connectorStroke?: string
  connectorWidth?: number
  gap?: number
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

export interface SwarmStyle {
  radius?: number
  fill?: string
  opacity?: number
  stroke?: string
  strokeWidth?: number
}

export interface RealtimeFrameProps {
  chartType?: "line" | "swarm" | "candlestick" | "waterfall" | "bar"
  arrowOfTime?: ArrowOfTime
  windowMode?: WindowMode
  windowSize?: number
  data?: Datum[]
  timeAccessor?: string | ((d: Datum) => number)
  valueAccessor?: string | ((d: Datum) => number)
  timeExtent?: [number, number]
  valueExtent?: [number, number]
  extentPadding?: number
  size?: [number, number]
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  className?: string
  lineStyle?: LineStyle
  annotations?: Datum[]
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (annotation: Datum, index: number, context: AnnotationContext) => ReactNode
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: (d: HoverData | null) => void
  showAxes?: boolean
  background?: string
  categoryAccessor?: string | ((d: Datum) => string)
  binSize?: number
  barColors?: Record<string, string>
  barStyle?: BarStyle
  waterfallStyle?: WaterfallStyle
  swarmStyle?: SwarmStyle
  tickFormatTime?: (value: number) => string
  tickFormatValue?: (value: number) => string
}

export interface RealtimeFrameHandle {
  push(point: Datum): void
  pushMany(points: Datum[]): void
  /** Remove data by ID. Requires an ID accessor (pointIdAccessor or dataIdAccessor). */
  remove(id: string | string[]): Datum[]
  /** Update data by ID in place. Requires an ID accessor. Returns previous values. */
  update(id: string | string[], updater: (d: Datum) => Datum): Datum[]
  /**
   * Ordinal-only bounded ingest: replace the buffer while preserving category
   * order and enter/move/exit transitions. XY/network/geo typically omit this.
   */
  replace?(data: Datum[]): void
  clear(): void
  getData(): Datum[]
  /** Returns the frame's resolved scales, or null if unavailable.
   *
   *  The concrete scales object differs by frame type — XY charts
   *  expose `{ x, y }`, ordinal charts expose `{ o, r, projection }`,
   *  network/geo don't have a meaningful scale concept and may not
   *  implement this method at all.
   *
   *  Typed as `unknown` so the shared handle stays compatible across
   *  chart families. HOCs that want a narrower return type should
   *  export a chart-specific handle (e.g. `LikertChartHandle`) that
   *  extends this interface and narrows `getScales()`. */
  getScales?(): unknown | null
  /** The most recent custom layout result (as returned by the chart's
   *  `layout(ctx)` function) — host readback so a page that needs the computed
   *  placement (stats, inspectors) doesn't re-run the layout function itself.
   *  Null before the first layout completes or when the chart has no custom
   *  layout. A failed retry can retain the prior result; use
   *  `getLayoutFailure()` to distinguish recovery. Typed as `unknown` at this shared boundary; the family frame
   *  handles narrow it to their `LayoutResult` shape. */
  getCustomLayout?(): unknown | null
  /** Latest structured custom-layout failure. Family frame handles narrow this
   * to `CustomLayoutFailureDiagnostic`; absent on frames without layouts. */
  getLayoutFailure?(): unknown | null
}

export interface RealtimeScales {
  time: ScaleLinear<number, number>
  value: ScaleLinear<number, number>
}

export interface RealtimeLayout {
  width: number
  height: number
  timeAxis: "x" | "y"
}

export interface RealtimeAccessors {
  time: (d: Datum) => number
  value: (d: Datum) => number
  category?: (d: Datum) => string
}
