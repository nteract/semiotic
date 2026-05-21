import * as React from "react"
import { useRef, useImperativeHandle, forwardRef, useCallback, useMemo } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type {
  ArrowOfTime,
  WindowMode,
  BarStyle,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  StreamXYFrameHandle,
  DecayConfig,
  PulseConfig,
  StalenessConfig,
  TransitionConfig
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"
import { useChartSelection, useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { ChartMode, ChartAccessor, SelectionConfig } from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { buildHistogramTooltip } from "./defaultRealtimeTooltip"
import { renderLoadingState, renderEmptyState } from "../shared/withChartWrapper"
import { normalizeLinkedBrush } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"

export type RealtimeHistogramDirection = "up" | "down"

function readNumericValue<TDatum extends Datum>(
  datum: TDatum,
  accessor: ChartAccessor<TDatum, number> | undefined,
  fallback: string,
): number | null {
  const raw: unknown = typeof accessor === "function"
    ? accessor(datum)
    : datum[(accessor ?? fallback) as keyof TDatum]
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  if (typeof raw === "string" && raw.trim() === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function resolveDownwardHistogramExtent<TDatum extends Datum>({
  data,
  valueAccessor,
  timeAccessor,
  categoryAccessor,
  binSize,
  valueExtent,
  extentPadding,
}: {
  data: readonly TDatum[] | undefined
  valueAccessor: ChartAccessor<TDatum, number> | undefined
  timeAccessor: ChartAccessor<TDatum, number> | undefined
  categoryAccessor: ChartAccessor<TDatum, string> | undefined
  binSize: number
  valueExtent: [number, number] | undefined
  extentPadding: number | undefined
}): [number, number] {
  if (valueExtent) return [valueExtent[1], valueExtent[0]]

  let maxValue = 0
  if (data && data.length > 0) {
    if (categoryAccessor) {
      const binSums = new Map<number, number>()
      for (const datum of data) {
        const time = readNumericValue(datum, timeAccessor, "time")
        const value = readNumericValue(datum, valueAccessor, "value")
        if (time == null || value == null) continue
        const binStart = Math.floor(time / binSize) * binSize
        binSums.set(binStart, (binSums.get(binStart) ?? 0) + value)
      }
      for (const sum of binSums.values()) {
        if (sum > maxValue) maxValue = sum
      }
    } else {
      for (const datum of data) {
        const value = readNumericValue(datum, valueAccessor, "value")
        if (value != null && value > maxValue) maxValue = value
      }
    }
  }

  const padFactor = extentPadding ?? 0.1
  const upper = maxValue > 0 ? maxValue + maxValue * padFactor : 1
  return [upper, 0]
}

export interface RealtimeHistogramProps<TDatum extends Datum = Datum> {
  /** Display mode: "primary" (full chrome), "context" (compact), "sparkline" (inline) */
  mode?: ChartMode
  /** Time interval for binning */
  binSize: number
  /** Chart dimensions as [width, height] */
  size?: [number, number]
  /** Chart width (alternative to size) */
  width?: number
  /** Chart height (alternative to size) */
  height?: number
  /** Chart margins */
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
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
  /** Controlled data array */
  data?: Datum[]
  /** Time value accessor */
  timeAccessor?: ChartAccessor<TDatum, number>
  /** Value accessor */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /**
   * Direction bars grow from the baseline.
   * "up" uses the normal y-domain. "down" flips the resolved value
   * domain so bars grow downward from the top, useful for mirrored
   * histogram layouts. Explicit valueExtent is reversed.
   * @default "up"
   */
  direction?: RealtimeHistogramDirection
  /** Extent padding factor */
  extentPadding?: number
  /**
   * Category accessor for stacked bars.
   * When provided, bars are stacked by category within each bin.
   */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /**
   * Category-to-color map for stacked bars.
   * Keys also determine stack order (listed keys first, then alphabetical).
   */
  colors?: Record<string, string>
  /** Bar fill color (non-stacked mode) */
  fill?: string
  /** Bar stroke color */
  stroke?: string
  /** Bar stroke width */
  strokeWidth?: number
  /** Uniform bar opacity (0–1). Pairs with `color` / `stroke` / `strokeWidth` for the designer-facing primitive vocabulary. */
  opacity?: number
  /** Gap between bars in pixels */
  gap?: number
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
  /** SVG annotation render function */
  svgAnnotationRules?: (annotation: Datum, index: number, context: AnnotationContext) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
  /** Custom tooltip renderer (alias for tooltipContent) */
  tooltip?: (d: HoverData) => ReactNode
  /** Enable linked hover selection events for cross-chart highlighting */
  linkedHover?: boolean | string | { name?: string; fields: string[] }
  /** Consume a named selection — dims unselected elements */
  selection?: SelectionConfig
  /** Configurable opacity decay for older data */
  decay?: DecayConfig
  /** Flash effect on newly inserted data */
  pulse?: PulseConfig
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig
  /** Smooth position interpolation on data change */
  transition?: TransitionConfig
  /** Show a loading skeleton placeholder */
  loading?: boolean
  /** Custom content rendered in place of the default skeleton while `loading` is true. */
  loadingContent?: React.ReactNode | false
  /** Custom content to render when data is empty. Set to `false` to disable empty state. */
  emptyContent?: ReactNode | false
  /** Brush configuration. `true` defaults to `{ dimension: "x", snap: "bin" }`. */
  brush?: boolean | "x" | {
    dimension?: "x" | "y" | "xy"
    snap?: "continuous" | "bin"
    /** Actual bin boundary values for data-driven snapping (auto-populated from histogram bins when omitted) */
    binBoundaries?: number[]
    /** When true, snap during drag (not just on release). Default false. */
    snapDuring?: boolean
  }
  /** Callback when brush selection changes. Called with data-space extent, or null when cleared. */
  onBrush?: (extent: { x: [number, number]; y: [number, number] } | null) => void
  /** Linked brush for cross-chart coordination via LinkedCharts */
  linkedBrush?: string | { name: string; xField?: string; yField?: string }
  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"
  /** Show a legend */
  showLegend?: boolean
  /** Legend position */
  legendPosition?: LegendPosition
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** ID accessor for remove()/update() on the push API */
  pointIdAccessor?: string | ((d: Datum) => string)
}

/**
 * RealtimeHistogram - Streaming temporal histogram.
 *
 * Wraps StreamXYFrame with `chartType="bar"` and `runtimeMode="streaming"`,
 * binning pushed data points into time-windowed bars. Supports both simple
 * and stacked (categorical) modes.
 *
 * Edge bins that only partially fall within the visible time window are
 * rendered at proportionally narrower widths (Datadog-style).
 *
 * @example
 * ```tsx
 * // Simple temporal histogram — push each event, the chart bins by time
 * <RealtimeHistogram
 *   ref={ref}
 *   binSize={20}
 *   fill="#007bff"
 *   enableHover
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Stacked by category — same push API, color by status field
 * <RealtimeHistogram
 *   ref={ref}
 *   binSize={25}
 *   categoryAccessor="category"
 *   colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
 *   enableHover
 * />
 * ```
 */
export const RealtimeHistogram = forwardRef(
  function RealtimeHistogram<TDatum extends Datum = Datum>(props: RealtimeHistogramProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
    // Thread mode-aware dimensions + axes through so `sparkline` / `context`
    // actually strip the axis chrome they're meant to. Previously only
    // dimensions were mode-driven, so `mode="sparkline"` rendered a 120×24
    // histogram with full axes eating most of the canvas. `showLegend` isn't
    // wired here because RealtimeHistogram doesn't construct a `legend` prop
    // for StreamXYFrame — there's no legend surface to suppress.
    const resolved = useChartMode(props.mode, {
      width: props.size?.[0] ?? props.width,
      height: props.size?.[1] ?? props.height,
      showAxes: props.showAxes,
      enableHover: props.enableHover != null ? !!props.enableHover : undefined,
      linkedHover: props.linkedHover,
    })

    const {
      binSize,
      size,
      margin: userMargin,
      className,
      arrowOfTime = "right",
      windowMode = "sliding",
      windowSize: windowSizeProp,
      data,
      timeAccessor,
      valueAccessor,
      direction = "up",
      timeExtent,
      valueExtent,
      extentPadding,
      categoryAccessor,
      colors,
      fill,
      stroke,
      strokeWidth,
      opacity,
      gap,
      background,
      tooltipContent,
      tooltip,
      onHover,
      annotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
      linkedHover,
      selection,
      decay,
      pulse,
      staleness,
      transition,
      onObservation,
      chartId,
      loading,
      loadingContent,
      emptyContent,
      emphasis,
      legendPosition: legendPositionProp,
      brush: brushProp,
      onBrush: userOnBrush,
      linkedBrush,
    } = props

    const showAxes = resolved.showAxes
    const enableHover = resolved.enableHover
    const margin = userMargin ?? resolved.marginDefaults
    const resolvedSize: [number, number] = size ?? [resolved.width, resolved.height]
    // See RealtimeLineChart for the data-space-vs-pixel-space tooltip rationale.
    const resolvedTooltip =
      tooltipContent ?? tooltip ?? buildHistogramTooltip({ timeAccessor, valueAccessor })

    const frameRef = useRef<StreamXYFrameHandle>(null)

    // ── Linked hover via shared hook ──
    const { customHoverBehavior: linkedHoverBehavior } = useChartSelection({
      selection, linkedHover, unwrapData: true,
      onObservation, chartType: "RealtimeHistogram", chartId
    })

    const combinedHoverBehavior = useCallback(
      (d: HoverData | null) => {
        if (onHover) onHover(d)
        linkedHoverBehavior(d)
      },
      [onHover, linkedHoverBehavior]
    )

    // ── Brush wiring ──
    // Normalize brush prop: true defaults to x-dimension with bin snapping
    const normalizedBrush = brushProp === true
      ? { dimension: "x" as const, snap: "bin" as const }
      : brushProp === "x"
        ? { dimension: "x" as const }
        : typeof brushProp === "object"
          ? brushProp
          : undefined

    // LinkedBrush integration via selection store
    const brushConfig = normalizeLinkedBrush(linkedBrush)
    const timeField = typeof timeAccessor === "string" ? timeAccessor : "time"
    const _valueField = typeof valueAccessor === "string" ? valueAccessor : "value"

    const brushHook = useBrushSelection({
      name: brushConfig?.name || "__unused_hist_brush__",
      xField: brushConfig?.xField || timeField,
      ...(brushConfig?.yField ? { yField: brushConfig.yField } : {})
    })

    // Stabilize with ref to avoid BrushOverlay re-creation
    const brushInteractionRef = useRef(brushHook.brushInteraction)
    brushInteractionRef.current = brushHook.brushInteraction

    const combinedOnBrush = useCallback(
      (extent: { x: [number, number]; y: [number, number] } | null) => {
        // Fire user callback
        if (userOnBrush) userOnBrush(extent)

        // Fire observation event
        if (onObservation) {
          if (extent) {
            onObservation({
              type: "brush",
              extent,
              timestamp: Date.now(),
              chartType: "RealtimeHistogram",
              chartId
            })
          } else {
            onObservation({
              type: "brush-end",
              timestamp: Date.now(),
              chartType: "RealtimeHistogram",
              chartId
            })
          }
        }

        // Update selection store for linkedBrush
        if (brushConfig) {
          const bi = brushInteractionRef.current
          if (!extent) {
            bi.end(null)
          } else if (bi.brush === "xBrush") {
            bi.end(extent.x)
          } else if (bi.brush === "yBrush") {
            bi.end(extent.y)
          } else {
            bi.end([[extent.x[0], extent.y[0]], [extent.x[1], extent.y[1]]])
          }
        }
      },
      [userOnBrush, onObservation, chartId, brushConfig]
    )

    // `[]` deps so the handle stays referentially stable across renders —
    // see `useFrameImperativeHandle` for the regression class this
    // prevents (callback refs that pre-seed data re-firing their seed
    // on every parent re-render).
    useImperativeHandle(ref, () => ({
      push: (point) => frameRef.current?.push(point),
      pushMany: (points) => frameRef.current?.pushMany(points),
      remove: (id) => frameRef.current?.remove(id) ?? [],
      update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
      clear: () => frameRef.current?.clear(),
      getData: () => frameRef.current?.getData() ?? [],
      getScales: () => frameRef.current?.getScales() ?? null
    }), [])

    // ── Loading / empty states (computed early, returned after all hooks) ───
    const loadingEl = renderLoadingState(loading, resolvedSize[0], resolvedSize[1], loadingContent)
    const emptyEl = !loadingEl ? renderEmptyState(data, resolvedSize[0], resolvedSize[1], emptyContent) : null

    const barStyle: BarStyle = {}
    if (fill != null) barStyle.fill = fill
    if (stroke != null) barStyle.stroke = stroke
    if (strokeWidth != null) barStyle.strokeWidth = strokeWidth
    if (opacity != null) barStyle.opacity = opacity
    if (gap != null) barStyle.gap = gap

    const resolvedClassName = emphasis
      ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
      : className

    const windowSize = resolveRealtimeWindowSize(windowSizeProp, data)
    const resolvedValueExtent = useMemo(() => {
      if (direction !== "down") return valueExtent
      return resolveDownwardHistogramExtent({
        data: data as TDatum[] | undefined,
        valueAccessor,
        timeAccessor,
        categoryAccessor,
        binSize,
        valueExtent,
        extentPadding,
      })
    }, [direction, data, valueAccessor, timeAccessor, categoryAccessor, binSize, valueExtent, extentPadding])

    // ── Loading / empty guards (deferred to after all hooks) ───────────────
    if (loadingEl) return loadingEl
    if (emptyEl) return emptyEl

    return (
      <StreamXYFrame
        ref={frameRef}
        chartType="bar"
        runtimeMode="streaming"
        size={resolvedSize}
        margin={margin}
        className={resolvedClassName}
        arrowOfTime={arrowOfTime}
        windowMode={windowMode}
        windowSize={windowSize}
        data={data}
        timeAccessor={timeAccessor}
        valueAccessor={valueAccessor}
        xExtent={timeExtent}
        yExtent={resolvedValueExtent}
        extentPadding={extentPadding}
        binSize={binSize}
        categoryAccessor={categoryAccessor}
        barColors={colors}
        barStyle={barStyle}
        showAxes={showAxes}
        background={background}
        hoverAnnotation={enableHover}
        tooltipContent={resolvedTooltip}
        customHoverBehavior={combinedHoverBehavior}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
        decay={decay}
        pulse={pulse}
        staleness={staleness}
        transition={transition}
        pointIdAccessor={props.pointIdAccessor}
        legendPosition={legendPositionProp}
        brush={normalizedBrush || (linkedBrush ? { dimension: "x" as const } : undefined)}
        onBrush={(normalizedBrush || linkedBrush) ? combinedOnBrush : undefined}
      />
    )
  }
) as unknown as {
  <TDatum extends Datum = Datum>(props: RealtimeHistogramProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RealtimeHistogram.displayName = "RealtimeHistogram"

export interface TemporalHistogramProps<TDatum extends Datum = Datum>
  extends Omit<RealtimeHistogramProps<TDatum>, "data" | "windowSize" | "windowMode"> {
  /** Static data array for a bounded temporal histogram. */
  data: TDatum[]
}

/**
 * Static-data sibling for temporal histograms. Use this when the data is a
 * bounded array rather than a ref-driven stream; the realtime push API is not
 * part of this public surface.
 */
export function TemporalHistogram<TDatum extends Datum = Datum>(props: TemporalHistogramProps<TDatum>) {
  return <RealtimeHistogram {...(props as RealtimeHistogramProps<TDatum>)} windowMode="growing" />
}
TemporalHistogram.displayName = "TemporalHistogram"

/** @deprecated Use `RealtimeHistogram` (the canonical public name) instead. The
 *  `RealtimeTemporalHistogram` alias is preserved for back-compat with code
 *  written before the rename and will be removed in a future major version. */
export const RealtimeTemporalHistogram = RealtimeHistogram
/** @deprecated Use `RealtimeHistogramProps` instead. Same component, just the
 *  pre-rename type alias. */
export type RealtimeTemporalHistogramProps<TDatum extends Datum = Datum> = RealtimeHistogramProps<TDatum>
