"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { registerLineFamilyXYPlugins } from "../../stream/xyPlugins/lineFamily"
import type { StreamXYFrameProps, StreamXYFrameHandle, StreamScales } from "../../stream/types"
import { MinimapBrushLazy } from "./minimapBrushLazy"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import { useXYLineStyle } from "../shared/useXYLineStyle"
import { composeStyleRules, makeXYRuleContext } from "../shared/styleRules"
import type { ChartAccessor } from "../shared/types"
import { resolveMultiCapableTooltip } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { resolveXYFramePropsAxisChrome } from "../../legendLayout"
import type { MinimapChartProps } from "./minimapChartTypes"
import { minimapChromeMargins, minimapOverviewHeight, MINIMAP_DEFAULT_HEIGHT } from "./minimapLayout"
import { resolveChartMode } from "../shared/chartMode"
import { withDisplayName } from "../shared/withDisplayName"

export type {
  MinimapBrushEndMeta,
  MinimapBrushStyle,
  MinimapChartProps,
  MinimapConfig,
  MinimapHandleOptions,
} from "./minimapChartTypes"

// Registered at render (not import) so unused charts stay tree-shakeable.
function ensureMinimapChartRegistrations(): void {
  registerLineFamilyXYPlugins()
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
export const MinimapChart = /* @__PURE__ */ withDisplayName(function MinimapChart<TDatum extends Datum = Datum>(
  props: MinimapChartProps<TDatum>
) {
  ensureMinimapChartRegistrations()
  const defaultSize = resolveChartMode(undefined, {})
  const {
    data,
    width = defaultSize.width,
    height = defaultSize.height,
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
    styleRules,
    fillArea = false,
    areaOpacity = 0.3,
    showPoints = false,
    pointRadius = 3,
    enableHover = true,
    showAxes = true,
    showGrid = false,
    showLegend,
    legendPosition: legendPositionProp,
    tooltip,
    minimap: minimapConfig = {},
    renderBefore = false,
    onBrush,
    onBrushEnd,
    onObservation,
    chartId,
    brushExtent: controlledExtent,
    yExtent,
    frameProps = {},
    loading,
    loadingContent,
    emptyContent,
  } = props

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const totalHeight = height + minimapOverviewHeight(minimapConfig)
  const loadingEl = renderLoadingState(loading, width, totalHeight, loadingContent, props)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, totalHeight, emptyContent, props) : null

  const safeData = useMemo(() => filterSparseArray(data), [data])

  // ── Brush state ─────────────────────────────────────────────────────
  const [internalExtent, setInternalExtent] = useState<[number, number] | null>(null)
  const brushExtent = controlledExtent ?? internalExtent

  // ── Overview ref to get scales ──────────────────────────────────────
  const overviewRef = useRef<StreamXYFrameHandle>(null)
  const [overviewScales, setOverviewScales] = useState<StreamScales | null>(null)

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
  const ruleContext = useMemo(
    () => makeXYRuleContext(
      xAccessor as string | ((d: Datum) => unknown),
      yAccessor as string | ((d: Datum) => unknown),
    ),
    [xAccessor, yAccessor],
  )

  const mainLineStyle = useXYLineStyle({
    lineWidth,
    colorBy: colorBy as ChartAccessor<Datum, string> | undefined,
    colorScale,
    fillArea,
    areaOpacity,
    styleRules,
    ruleContext,
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
    styleRules,
    ruleContext,
  })

  const resolvedOverviewLineStyle = overviewLineStyle ?? defaultOverviewLineStyle

  const pointStyle = useMemo(() => {
    if (!showPoints) return undefined
    const base = (d: Datum) => {
      const style: Datum = { r: pointRadius, fillOpacity: 1 }
      style.fill = colorBy ? getColor(d.parentLine || d, colorBy, colorScale) : DEFAULT_COLOR
      return style
    }
    return composeStyleRules(base, styleRules, ruleContext, (d) => d.parentLine || d)
  }, [showPoints, pointRadius, colorBy, colorScale, styleRules, ruleContext])

  // ── Legend + Margins ──────────────────────────────────────────────────

  const {
    legend,
    margin: mainMargin,
    legendPosition,
    legendMarginReserved
  } = useChartLegendAndMargin({
    data: lineData,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    chartWidth: width,
    chartHeight: height,
    frameLegend: frameProps,
    hasTitle: !!title,
    // Top-level `showAxes` governs the detail chart; `minimap.showAxes`
    // governs the overview strip.
    axisChrome: resolveXYFramePropsAxisChrome(frameProps, { showAxes, xLabel, yLabel }),
  })

  const minimapHeight = minimapConfig.height || MINIMAP_DEFAULT_HEIGHT
  const chromeMargins = minimapChromeMargins(minimapConfig)
  const minimapMargin = useMemo(() => {
    return {
      top: minimapConfig.margin?.top ?? chromeMargins.top,
      bottom: minimapConfig.margin?.bottom ?? chromeMargins.bottom,
      left: minimapConfig.margin?.left ?? mainMargin.left,
      right: minimapConfig.margin?.right ?? mainMargin.right
    }
  }, [minimapConfig.margin, chromeMargins.top, chromeMargins.bottom, mainMargin])

  const brushDirection = minimapConfig.brushDirection || "x"
  const overviewPlotWidth = Math.max(0, width - minimapMargin.left - minimapMargin.right)
  const yExtentLow = yExtent?.[0]
  const yExtentHigh = yExtent?.[1]

  // Poll for the overview's scales after mount and after anything that
  // relays it out (the store replaces them via rAF). Wait until they span
  // the current plot, so the brush never maps through a stale layout, and
  // stop after about a second either way. The rAF handle is cancelled on
  // unmount and on re-poll.
  useEffect(() => {
    let rafId = 0
    let cancelled = false
    let frames = 0
    const check = () => {
      if (cancelled) return
      const s = overviewRef.current?.getScales?.()
      const spans = (range: number[], size: number) => Math.abs(Math.max(...range) - Math.min(...range) - size) < 0.5
      if (s && (frames >= 60 || (spans(s.x.range(), overviewPlotWidth) && spans(s.y.range(), minimapHeight)))) {
        setOverviewScales(s)
        return
      }
      frames++
      rafId = requestAnimationFrame(check)
    }
    rafId = requestAnimationFrame(check)
    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [data, overviewPlotWidth, minimapHeight, minimapMargin.top, minimapMargin.bottom, yExtentLow, yExtentHigh])

  const handleBrush = useCallback(
    (ext: [number, number] | null) => {
      if (!controlledExtent) {
        setInternalExtent(ext)
      }
      onBrush?.(ext)
      if (!onObservation) return
      if (!ext) {
        onObservation({ type: "brush-end", timestamp: Date.now(), chartType: "MinimapChart", chartId })
        return
      }
      // The unbrushed axis spans the overview's domain.
      const other = overviewScales?.[brushDirection === "x" ? "y" : "x"].domain().map(Number) as [number, number] | undefined
      const full: [number, number] = other ?? [ext[0], ext[1]]
      onObservation({
        type: "brush",
        extent: brushDirection === "x" ? { x: ext, y: full } : { x: full, y: ext },
        timestamp: Date.now(),
        chartType: "MinimapChart",
        chartId,
      })
    },
    [controlledExtent, onBrush, onObservation, chartId, overviewScales, brushDirection]
  )

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
    ...(props.maxDevicePixelRatio !== undefined && { maxDevicePixelRatio: props.maxDevicePixelRatio }),
    margin: mainMargin,
    showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(legend && { legend, legendPosition }),
    ...(legendMarginReserved && { __legendMarginReservedFor: legend }),
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(props.accessibleTable !== undefined && { accessibleTable: props.accessibleTable }),
    ...(props.animate !== undefined && { animate: props.animate }),
    ...(props.hoverRadius !== undefined && { hoverRadius: props.hoverRadius }),
    ...resolveMultiCapableTooltip({ tooltip, defaultTooltipContent }),
    // The brushed range sets the detail's domain on the brushed axis.
    ...(brushExtent && brushDirection === "x" && { xExtent: brushExtent }),
    ...(yExtent && { yExtent }),
    ...(brushExtent && brushDirection === "y" && { yExtent: brushExtent }),
    ...(props.axisExtent !== undefined && { axisExtent: props.axisExtent }),
    ...(props.autoPlaceAnnotations !== undefined && { autoPlaceAnnotations: props.autoPlaceAnnotations }),
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
    ...(props.maxDevicePixelRatio !== undefined && { maxDevicePixelRatio: props.maxDevicePixelRatio }),
    size: [width, minimapHeight + minimapMargin.top + minimapMargin.bottom],
    margin: minimapMargin,
    showAxes: minimapConfig.showAxes ?? false,
    background: minimapConfig.background,
    enableHover: false,
    accessibleTable: false,
    description: `${description || title || "Chart"} overview minimap`,
    animate: false,
    // Mirror the main chart's y domain on the overview so a click-to-jump
    // brushed region maps back to the same vertical scale the user sees.
    ...(yExtent && { yExtent }),
  }

  // ── Render ──────────────────────────────────────────────────────────

  const brushChrome = !!minimapConfig.handles || !!minimapConfig.showExtentLabels || !!minimapConfig.renderHandle
  const overviewChart = (
    <div
      key="minimap"
      // Handles and labels may reach past the overview's plot.
      style={{ position: "relative", width, overflow: brushChrome ? "visible" : "hidden" }}
    >
      <StreamXYFrame ref={overviewRef} {...overviewProps} />
      <MinimapBrushLazy
        config={minimapConfig}
        scales={overviewScales}
        margin={minimapMargin}
        plotWidth={overviewPlotWidth}
        plotHeight={minimapHeight}
        brushDirection={brushDirection}
        extent={brushExtent}
        axisFormat={(brushDirection === "x" ? xFormat : yFormat) as ((value: number) => unknown) | undefined}
        onBrush={handleBrush}
        onBrushEnd={onBrushEnd}
        onObservation={onObservation}
        chartId={chartId}
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
  if (error) return <ChartError componentName="MinimapChart" message={error} width={width} height={totalHeight} />

  return (
    <SafeRender componentName="MinimapChart" width={width} height={height}>
      <div
        className={`minimap-chart${className ? ` ${className}` : ""}`}
        role="group"
        aria-label={description || title || "Chart with overview minimap"}
      >
        {renderBefore ? overviewChart : mainChart}
        {renderBefore ? mainChart : overviewChart}
      </div>
    </SafeRender>
  )
}, "MinimapChart")
