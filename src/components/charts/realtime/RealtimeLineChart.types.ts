import type { CoercibleNumber } from "../../stream/accessorUtils"
import type { CSSProperties, ReactNode } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type {
  AnnotationContext,
  ArrowOfTime,
  DecayConfig,
  HoverAnnotationConfig,
  HoverData,
  PulseConfig,
  StalenessConfig,
  TransitionConfig,
  WindowMode
} from "../../stream/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import type { MobileVisualizationContract } from "../shared/auditMobileVisualization"
import type { ResponsiveRule } from "../shared/responsiveRules"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type {
  ChartAccessor,
  ChartMode,
  LinkedHoverProp,
  MobileInteractionProp,
  SelectionConfig
} from "../shared/types"
import type { Datum } from "../shared/datumTypes"
import type { StyleRule } from "../shared/styleRules"
import type { PartialMargin } from "../../types/marginType"
import type { AggregateConfig } from "./aggregate"
import type { EventTimeConfig } from "./eventTime"
import type {
  RealtimeAccessibilityProps,
  RealtimeData,
  RealtimePointIdAccessor,
  RealtimeTooltipProp
} from "./realtimeChartTypes"

/**
 * Imperative handle for RealtimeLineChart. It extends the shared realtime
 * handle without changing that cross-chart contract: only this chart exposes
 * event-time tail flushing.
 */
export interface RealtimeLineChartHandle<
  TDatum extends Datum = Datum,
  TReadDatum extends Datum = TDatum
> extends RealtimeFrameHandle<TDatum, TReadDatum> {
  /**
   * Release every event still held by `eventTime`, in event-time order.
   * Call this when an input source reaches an asserted end-of-stream or batch
   * boundary. Later newer events remain supported; events older than the
   * flushed frontier follow `latePolicy`.
   */
  flush(): void
}

export interface RealtimeLineChartProps<
  TDatum extends Datum = Datum
> extends RealtimeAccessibilityProps {
  /** Fit the container width. */
  responsiveWidth?: boolean
  /** Fit a container with a definite height. */
  responsiveHeight?: boolean
  /** Display mode: "primary" (full chrome), "context" (compact), "sparkline" (inline) */
  mode?: ChartMode
  /** Semantic responsive transformations applied before chart-mode defaults. */
  responsiveRules?: ResponsiveRule[]
  /** Phone/mobile contract consumed by audits, recipes, adapters, and agents. */
  mobileSemantics?: MobileVisualizationContract
  /** Touch-first interaction policy for phone-sized chart slots. */
  mobileInteraction?: MobileInteractionProp
  /** Chart dimensions as [width, height] */
  size?: [number, number]
  /** Chart width (alternative to size) */
  width?: number
  /** Chart height (alternative to size) */
  height?: number
  /** Maximum canvas backing-store DPR; large canvases also use the shared backing-store budget. */
  maxDevicePixelRatio?: number
  /** Chart margins */
  margin?: PartialMargin
  /** CSS class name */
  className?: string
  onObservation?: OnObservationCallback
  chartId?: string
  /** Direction time flows */
  arrowOfTime?: ArrowOfTime
  /** Data retention strategy */
  windowMode?: WindowMode
  /** Ring buffer capacity */
  windowSize?: number
  /**
   * Ring-buffer capacity. Alias for `windowSize` — prefer this name when
   * "window" means the aggregation window (`aggregate.window`).
   */
  capacity?: number
  /** Alias for `windowMode`. */
  capacityMode?: WindowMode
  /** Split the line into series. Passed to the frame as `groupAccessor`. */
  seriesAccessor?: ChartAccessor<TDatum, string>
  /** Controlled data array */
  data?: RealtimeData<TDatum>
  /** Time accessor returning a number, Date, or numeric/date string. */
  timeAccessor?: ChartAccessor<TDatum, CoercibleNumber>
  /** Value accessor */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Extent padding factor */
  extentPadding?: number
  /** Line color */
  stroke?: string
  /** Line width */
  strokeWidth?: number
  /** Dash pattern (e.g. "4,2") */
  strokeDasharray?: string
  /** Uniform line opacity (0–1). Pairs with `stroke` / `strokeWidth` for the designer-facing primitive vocabulary. */
  opacity?: number
  /** Presentation-only CSS cursor for retained marks; does not add click, keyboard, or observation behavior. */
  cursor?: CSSProperties["cursor"]
  /** Ordered data-aware line styling, resolved against the displayed series sample. */
  styleRules?: StyleRule[]
  /** Show canvas-drawn axes */
  showAxes?: boolean
  /** Background fill color */
  background?: string
  /** Enable hover interaction */
  enableHover?: boolean | HoverAnnotationConfig
  /** Custom tooltip renderer */
  tooltipContent?: (d: HoverData) => ReactNode
  /** Callback on hover */
  onHover?: (d: HoverData | null) => void
  /** Annotation objects */
  annotations?: Datum[]
  /** Opt into automatic placement for note-like annotations without manual offsets. */
  autoPlaceAnnotations?: AutoPlaceAnnotations
  /** SVG annotation render function */
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
  /** Declarative tooltip config or the legacy full-HoverData callback. Pass `"multi"` for hover-anywhere line values. */
  tooltip?: RealtimeTooltipProp
  /** Configurable opacity decay for older data */
  decay?: DecayConfig
  /** Flash effect on newly inserted data */
  pulse?: PulseConfig
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig
  /** Smooth position interpolation on data change */
  transition?: TransitionConfig
  /** Enable linked hover selection events for cross-chart highlighting */
  linkedHover?: LinkedHoverProp
  /** Consume a named selection — dims unselected elements */
  selection?: SelectionConfig
  /** Show a loading skeleton placeholder */
  loading?: boolean
  /** Custom content rendered in place of the default skeleton while `loading` is true. */
  loadingContent?: ReactNode | false
  /** Custom content to render when data is empty. Set to `false` to disable empty state. */
  emptyContent?: ReactNode | false
  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"
  /** Show a legend */
  showLegend?: boolean
  /** Legend position */
  legendPosition?: LegendPosition
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /**
   * Stable per-point ID for push-mode `remove()`/`update()`, point annotations,
   * and identity-keyed path transitions. With `transition` on a sliding
   * window, retained vertices slide by this ID instead of interpolating by
   * array index.
   */
  pointIdAccessor?: RealtimePointIdAccessor<TDatum>
  /**
   * Opt-in windowed aggregation over event-time. When set, pushed
   * events are reduced into tumbling/hopping/session windows and the
   * chart draws one mark per window (mean/sum/min/max/count) plus an
   * optional ±σ or min–max band — render cost scales with the number of
   * visible windows, not the arrival rate. This is the **aggregation
   * window**, distinct from `windowMode`'s RingBuffer eviction. Changing a
   * structural window field or either accessor rebuilds the accumulator:
   * controlled `data` is reseeded, while push-only input begins a new epoch
   * because raw events are deliberately not retained.
   */
  aggregate?: AggregateConfig
  /**
   * Opt-in event-time ingestion. Buffers pushed events for a bounded
   * lateness/grace window and releases them to the chart in event-time
   * order, so out-of-order or merged multi-source streams render
   * monotonically instead of zigzagging. Late events (older than
   * `watermark − lateness`) are dropped or kept per policy and surfaced
   * via `onObservation` as `"late-data"`. Default-off; when unset the
   * push path is byte-for-byte unchanged. Call `ref.current.flush()` at an
   * asserted end-of-stream boundary so the final grace-window events are
   * released in order.
   */
  eventTime?: EventTimeConfig
}
