"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { brushX, brushY } from "d3-brush"
import { select } from "d3-selection"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamScales } from "../../stream/types"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import { useXYLineStyle } from "../shared/useXYLineStyle"
import type { LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"

// ── Types ──────────────────────────────────────────────────────────────

export interface MinimapConfig {
  /** Height of the minimap overview (default: 60) */
  height?: number
  /** Margin for the minimap chart */
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  /** Line style override for the minimap */
  lineStyle?: (d: Datum) => Datum
  /** Show axes in minimap (default: false) */
  showAxes?: boolean
  /** Background color for minimap */
  background?: string
  /** Brush direction: "x" (default) or "y" */
  brushDirection?: "x" | "y"
}

export interface MinimapChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "onClick" | "onObservation" | "selection" | "linkedHover">,
    AxisConfig {
  /** Array of data points or line objects with coordinates */
  data: TDatum[]

  /** X accessor (default: "x") */
  xAccessor?: ChartAccessor<TDatum, number>

  /** Y accessor (default: "y") */
  yAccessor?: ChartAccessor<TDatum, number>

  /** Group data into multiple lines */
  lineBy?: ChartAccessor<TDatum, string>

  /** Field containing coordinate arrays in line objects (default: "coordinates") */
  lineDataAccessor?: string

  /** Color-by field or function */
  colorBy?: ChartAccessor<TDatum, string>

  /** Color scheme (default: "category10") */
  colorScheme?: string | string[]

  /** Curve type (default: "linear") */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"

  /** Line stroke width (default: 2) */
  lineWidth?: number

  /** Fill area under lines */
  fillArea?: boolean

  /** Area opacity when fillArea is true (default: 0.3) */
  areaOpacity?: number

  /** Show points on lines */
  showPoints?: boolean

  /** Point radius (default: 3) */
  pointRadius?: number

  /** Enable hover (default: true) */
  enableHover?: boolean

  /** Show grid (default: false) */
  showGrid?: boolean

  /** Show legend */
  showLegend?: boolean

  /** Legend position */
  legendPosition?: LegendPosition

  /** Tooltip config */
  tooltip?: TooltipProp

  /** Minimap configuration */
  minimap?: MinimapConfig

  /** Show minimap above the main chart (default: false — below) */
  renderBefore?: boolean

  /** Callback when brush extent changes */
  onBrush?: (extent: [number, number] | null) => void

  /** Controlled brush extent */
  brushExtent?: [number, number]

  /**
   * Fixed y domain `[min, max]` (either bound may be undefined to leave
   * that side data-derived). xExtent is reserved for brush selection on
   * MinimapChart — pass `frameProps.xExtent` if you need to override the
   * brushed x range from advanced consumers.
   */
  yExtent?: [number | undefined, number | undefined] | [number]

  /** Additional StreamXYFrame props */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

// ── Brush overlay ──────────────────────────────────────────────────────

interface BrushOverlayProps {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: StreamScales | null
  brushDirection: "x" | "y"
  extent: [number, number] | null
  onBrush: (extent: [number, number] | null) => void
}

function BrushOverlay({
  width,
  height,
  margin,
  scales,
  brushDirection,
  extent,
  onBrush
}: BrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<any>(null)
  const isUpdatingRef = useRef(false)

  const totalWidth = width + margin.left + margin.right
  const totalHeight = height + margin.top + margin.bottom

  useEffect(() => {
    if (!svgRef.current || !scales) return

    const g = select(svgRef.current).select<SVGGElement>(".brush-group")

    const brush = brushDirection === "x"
      ? brushX().extent([[0, 0], [width, height]])
      : brushY().extent([[0, 0], [width, height]])

    brush.on("brush end", (event: any) => {
      if (isUpdatingRef.current) return
      if (!event.sourceEvent) return // programmatic — skip

      const sel = event.selection
      if (!sel) {
        onBrush(null)
        return
      }

      const scale = brushDirection === "x" ? scales.x : scales.y
      const inv = scale.invert
      if (!inv) return

      const domain: [number, number] = brushDirection === "x"
        ? [inv(sel[0]), inv(sel[1])]
        : [inv(sel[0]), inv(sel[1])]

      onBrush(domain)
    })

    g.call(brush)
    brushRef.current = brush

    // Style the brush selection
    g.select(".selection")
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.2)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)

    return () => {
      brush.on("brush end", null)
    }
  }, [scales, width, height, brushDirection, onBrush])

  // Sync controlled extent to brush position
  useEffect(() => {
    if (!brushRef.current || !scales || !svgRef.current) return

    const g = select(svgRef.current).select(".brush-group")
    const scale = brushDirection === "x" ? scales.x : scales.y

    isUpdatingRef.current = true
    if (extent) {
      const pixelExtent: [number, number] = [scale(extent[0]), scale(extent[1])]
      g.call(brushRef.current.move, pixelExtent)
    } else {
      g.call(brushRef.current.move, null)
    }
    isUpdatingRef.current = false
  }, [extent, scales, brushDirection])

  return (
    <svg
      ref={svgRef}
      width={totalWidth}
      height={totalHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "all"
      }}
    >
      <g className="brush-group" transform={`translate(${margin.left},${margin.top})`} />
    </svg>
  )
}

// ── MinimapChart ────────────────────────────────────────────────────────

/**
 * MinimapChart - Line chart paired with a brushable overview minimap.
 *
 * Renders the same line data twice: a compressed overview (the minimap)
 * and a zoomed detail view of the brushed range. Drag in the minimap to
 * update the detail's domain. The minimap configuration (height, axes,
 * brush direction) is nested under the `minimap` prop; brush state is
 * exposed via `onBrush` (callback) and `brushExtent` (controlled value).
 *
 * Useful for long time series where the user needs both context and
 * detail without losing their place in the full range.
 *
 * @example
 * ```tsx
 * // Time series with default minimap below the detail view
 * <MinimapChart
 *   data={timeSeries}
 *   xAccessor="date"
 *   yAccessor="value"
 *   xScaleType="time"
 *   minimap={{ height: 80, brushDirection: "x" }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Multi-series with a starting brush selection and an onBrush callback
 * <MinimapChart
 *   data={timeSeries}
 *   xAccessor="t"
 *   yAccessor="v"
 *   lineBy="series"
 *   colorBy="series"
 *   minimap={{ height: 60, showAxes: true }}
 *   brushExtent={[100, 500]}
 *   onBrush={(extent) => console.log("brushed:", extent)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Render the minimap above the detail rather than below
 * <MinimapChart
 *   data={timeSeries}
 *   xAccessor="date"
 *   yAccessor="value"
 *   renderBefore
 *   minimap={{ height: 50, background: "#f8fafc" }}
 * />
 * ```
 */
export function MinimapChart<TDatum extends Datum = Datum>(
  props: MinimapChartProps<TDatum>
) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    description,
    summary,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    lineBy,
    lineDataAccessor = "coordinates",
    colorBy,
    colorScheme,
    curve = "linear",
    lineWidth = 2,
    fillArea = false,
    areaOpacity = 0.3,
    showPoints = false,
    pointRadius = 3,
    enableHover = true,
    showGrid = false,
    showLegend,
    legendPosition: legendPositionProp,
    tooltip,
    minimap: minimapConfig = {},
    renderBefore = false,
    onBrush,
    brushExtent: controlledExtent,
    yExtent,
    frameProps = {},
    loading,
    loadingContent,
    emptyContent,
  } = props

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height, loadingContent)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

  const safeData = useMemo(() => filterSparseArray(data), [data])

  // ── Brush state ─────────────────────────────────────────────────────
  const [internalExtent, setInternalExtent] = useState<[number, number] | null>(null)
  const brushExtent = controlledExtent ?? internalExtent

  const handleBrush = useCallback(
    (ext: [number, number] | null) => {
      if (!controlledExtent) {
        setInternalExtent(ext)
      }
      onBrush?.(ext)
    },
    [controlledExtent, onBrush]
  )

  // ── Overview ref to get scales ──────────────────────────────────────
  const overviewRef = useRef<any>(null)
  const [overviewScales, setOverviewScales] = useState<StreamScales | null>(null)

  // Poll for scales after mount (overview sets them async via rAF).
  // Track the rAF handle so we can cancel on unmount or data change — without
  // this the polling keeps running and calls setOverviewScales on an unmounted
  // component (React state-update-on-unmounted warning + leak).
  useEffect(() => {
    let rafId = 0
    let cancelled = false
    const check = () => {
      if (cancelled) return
      const s = overviewRef.current?.getScales?.()
      if (s) {
        setOverviewScales(s)
        return
      }
      rafId = requestAnimationFrame(check)
    }
    rafId = requestAnimationFrame(check)
    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [data])

  // ── Data normalization (same as LineChart) ──────────────────────────

  const isLineObjectFormat = safeData[0]?.[lineDataAccessor] !== undefined

  const lineData = useMemo(() => {
    if (isLineObjectFormat) return safeData

    if (lineBy) {
      const grouped = safeData.reduce((acc, d) => {
        const key = typeof lineBy === "function" ? lineBy(d) : d[lineBy as string]
        if (!acc[key]) {
          const lineObj: Datum = { [lineDataAccessor]: [] }
          if (typeof lineBy === "string") lineObj[lineBy] = key
          acc[key] = lineObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, Datum>)
      return Object.values(grouped)
    }

    return [{ [lineDataAccessor]: safeData }]
  }, [safeData, lineBy, lineDataAccessor, isLineObjectFormat])

  const flattenedData = useMemo(() => {
    if (isLineObjectFormat || lineBy) {
      return lineData.flatMap((line: Datum) => {
        const coords = line[lineDataAccessor] || []
        if (lineBy && typeof lineBy === "string") {
          return coords.map((c: Datum) => ({ ...c, [lineBy]: line[lineBy] }))
        }
        return coords
      })
    }
    return safeData
  }, [lineData, lineDataAccessor, isLineObjectFormat, lineBy, safeData])

  // ── Color / style ───────────────────────────────────────────────────

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Main + overview line styles go through the shared hook. Neither
  // wraps with primitives or selection (the minimap's overview is
  // intentionally static, and the main chart doesn't expose selection
  // here — selection wiring would round-trip through `setup` but the
  // minimap predates that integration). The overview drops `fillArea`
  // by design (a dimmer single-line context band, not a filled area).
  const mainLineStyle = useXYLineStyle({
    lineWidth,
    colorBy: colorBy as ChartAccessor<Datum, string> | undefined,
    colorScale,
    fillArea,
    areaOpacity,
  })

  const overviewLineStyle = useMemo(() => {
    // Caller-supplied override wins (minimapConfig.lineStyle is the
    // documented escape hatch for fully custom overview rendering).
    if (minimapConfig.lineStyle) return minimapConfig.lineStyle
    return undefined
  }, [minimapConfig.lineStyle])

  const defaultOverviewLineStyle = useXYLineStyle({
    lineWidth: 1,
    colorBy: colorBy as ChartAccessor<Datum, string> | undefined,
    colorScale,
  })

  const resolvedOverviewLineStyle = overviewLineStyle ?? defaultOverviewLineStyle

  const pointStyle = useMemo(() => {
    if (!showPoints) return undefined
    return (d: Datum) => {
      const style: Datum = { r: pointRadius, fillOpacity: 1 }
      style.fill = colorBy ? getColor(d.parentLine || d, colorBy, colorScale) : DEFAULT_COLOR
      return style
    }
  }, [showPoints, pointRadius, colorBy, colorScale])

  // ── Legend + Margins ──────────────────────────────────────────────────

  const { legend, margin: mainMargin, legendPosition } = useChartLegendAndMargin({
    data: lineData,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin
  })

  const minimapHeight = minimapConfig.height || 60
  const minimapMargin = useMemo(() => {
    return {
      top: minimapConfig.margin?.top ?? 0,
      bottom: minimapConfig.margin?.bottom ?? 20,
      left: minimapConfig.margin?.left ?? mainMargin.left,
      right: minimapConfig.margin?.right ?? mainMargin.right
    }
  }, [minimapConfig.margin, mainMargin])

  const brushDirection = minimapConfig.brushDirection || "x"

  // Default tooltip with accessor-aware labels. `tooltip={true}` should
  // show a useful tooltip even without a chart-specific default — the
  // built-in StreamXYFrame fallback only knows generic `x/time` /
  // `y/value` field names, so consumers with custom accessors (e.g.
  // `xAccessor="date"` / `yAccessor="sales"`) would otherwise see blank
  // content. Building one here keeps `normalizeTooltip(tooltip) ||
  // defaultTooltipContent` honest. Computed before the validation early
  // return below so the hook count stays stable across valid↔invalid data.
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
  ]), [xAccessor, yAccessor, xLabel, yLabel, xFormat, yFormat])

  // ── Validation ──────────────────────────────────────────────────────

  const error = validateArrayData({
    componentName: "MinimapChart",
    data: data,
    accessors: { xAccessor, yAccessor }
  })
  if (error) return <ChartError componentName="MinimapChart" message={error} width={width} height={height} />

  // ── Chart type ──────────────────────────────────────────────────────

  const chartType = fillArea ? "area" as const : "line" as const

  // ── Build StreamXYFrame props ───────────────────────────────────────

  const mainProps: StreamXYFrameProps = {
    chartType,
    data: flattenedData,
    xAccessor,
    yAccessor,
    groupAccessor: lineBy || undefined,
    curve,
    lineStyle: mainLineStyle,
    ...(showPoints && { pointStyle }),
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: mainMargin,
    showAxes: true,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(legend && { legend, legendPosition }),
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    // tooltip={false} → return-null function actually disables hover popups;
    // undefined would fall through to StreamXYFrame's built-in default tooltip.
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    // Apply brush extent to main chart
    ...(brushExtent && { xExtent: brushExtent }),
    ...(yExtent && { yExtent }),
    ...(props.axisExtent !== undefined && { axisExtent: props.axisExtent }),
    ...frameProps
  }

  const overviewProps: StreamXYFrameProps = {
    chartType,
    data: flattenedData,
    xAccessor,
    yAccessor,
    groupAccessor: lineBy || undefined,
    curve,
    lineStyle: resolvedOverviewLineStyle,
    size: [width, minimapHeight + minimapMargin.top + minimapMargin.bottom],
    margin: minimapMargin,
    showAxes: minimapConfig.showAxes ?? false,
    background: minimapConfig.background,
    enableHover: false,
    // Mirror the main chart's y domain on the overview so a click-to-jump
    // brushed region maps back to the same vertical scale the user sees.
    ...(yExtent && { yExtent }),
  }

  // ── Render ──────────────────────────────────────────────────────────

  const overviewChart = (
    <div
      key="minimap"
      style={{ position: "relative", width, overflow: "hidden" }}
    >
      <StreamXYFrame ref={overviewRef} {...overviewProps} />
      <BrushOverlay
        width={width - minimapMargin.left - minimapMargin.right}
        height={minimapHeight}
        margin={minimapMargin}
        scales={overviewScales}
        brushDirection={brushDirection}
        extent={brushExtent}
        onBrush={handleBrush}
      />
    </div>
  )

  const mainChart = (
    <div key="main" style={{ overflow: "hidden" }}>
      <StreamXYFrame {...mainProps} />
    </div>
  )

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="MinimapChart" width={width} height={height}>
      <div className={`minimap-chart${className ? ` ${className}` : ""}`}>
        {renderBefore ? overviewChart : mainChart}
        {renderBefore ? mainChart : overviewChart}
      </div>
    </SafeRender>
  )
}
MinimapChart.displayName = "MinimapChart"
