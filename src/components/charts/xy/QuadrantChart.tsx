"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, CanvasRendererFn, SVGPreRendererFn, StreamScales, StreamLayout, SceneNode } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, getSize } from "../shared/colorUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

/**
 * Quadrant label and color configuration
 */
export interface QuadrantConfig {
  /** Label text for the quadrant */
  label: string
  /** Background fill color for the quadrant */
  color: string
  /** Fill opacity (default: 0.08) */
  opacity?: number
}

/**
 * Configuration for the four quadrants.
 * Quadrants are defined relative to the center lines:
 * - topRight: high X, high Y
 * - topLeft: low X, high Y
 * - bottomRight: high X, low Y
 * - bottomLeft: low X, low Y
 */
export interface QuadrantsConfig {
  topRight: QuadrantConfig
  topLeft: QuadrantConfig
  bottomRight: QuadrantConfig
  bottomLeft: QuadrantConfig
}

/**
 * Centerline style configuration
 */
export interface CenterlineStyle {
  /** Line color @default "#999" */
  stroke?: string
  /** Line width @default 1 */
  strokeWidth?: number
  /** Dash pattern (e.g. [4, 3]) @default [] (solid) */
  strokeDasharray?: number[]
}

/**
 * QuadrantChart component props
 */
export interface QuadrantChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /** Array of data points */
  data?: TDatum[]
  /** Field name or function to access x values @default "x" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Field name or function to access y values @default "y" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** X-coordinate of the vertical center line. Defaults to midpoint of x domain. */
  xCenter?: number
  /** Y-coordinate of the horizontal center line. Defaults to midpoint of y domain. */
  yCenter?: number
  /** Quadrant configuration: labels and colors for each of the four quadrants */
  quadrants: QuadrantsConfig
  /** Style for the center lines */
  centerlineStyle?: CenterlineStyle
  /** Show quadrant labels @default true */
  showQuadrantLabels?: boolean
  /** Font size for quadrant labels @default 12 */
  quadrantLabelSize?: number
  /** Field name or function to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme for categorical data @default "category10" */
  colorScheme?: string | string[]
  /** Field name or function to determine point size */
  sizeBy?: ChartAccessor<TDatum, number>
  /** Min and max radius for points @default [3, 15] */
  sizeRange?: [number, number]
  /** Default point radius @default 5 */
  pointRadius?: number
  /** Point opacity @default 0.8 */
  pointOpacity?: number
  /** Enable hover annotations @default true */
  enableHover?: boolean
  /** Show grid lines @default false */
  showGrid?: boolean
  /** Show legend @default true (when colorBy is specified) */
  showLegend?: boolean
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Accessor for unique point IDs */
  pointIdAccessor?: ChartAccessor<TDatum, string>
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Legend position */
  legendPosition?: LegendPosition
  /** Annotation objects */
  annotations?: Record<string, any>[]
  /** Additional StreamXYFrame props */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * QuadrantChart — A scatterplot divided into four labeled, colored quadrants
 * by center lines at user-specified x/y positions.
 *
 * Each quadrant gets a background color and label. Points are rendered as a
 * standard scatter plot on top. Supports push API for streaming data.
 *
 * @example
 * ```tsx
 * <QuadrantChart
 *   data={[{x: 1, y: 10}, {x: 5, y: 3}]}
 *   xCenter={3} yCenter={5}
 *   quadrants={{
 *     topRight: { label: "Stars", color: "#4CAF50" },
 *     topLeft: { label: "Question Marks", color: "#FF9800" },
 *     bottomRight: { label: "Cash Cows", color: "#2196F3" },
 *     bottomLeft: { label: "Dogs", color: "#F44336" },
 *   }}
 * />
 * ```
 */
export const QuadrantChart = forwardRef(function QuadrantChart<TDatum extends Record<string, any> = Record<string, any>>(props: QuadrantChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point),
    pushMany: (points) => frameRef.current?.pushMany(points),
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
  })

  const {
    data,
    margin: userMargin,
    className,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    xCenter,
    yCenter,
    quadrants,
    centerlineStyle = {},
    showQuadrantLabels = true,
    quadrantLabelSize = 12,
    colorBy,
    colorScheme = "category10",
    sizeBy,
    sizeRange = [3, 15],
    pointRadius = 5,
    pointOpacity = 0.8,
    tooltip,
    pointIdAccessor,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  // ── Loading / empty states ────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(data, width, height, emptyContent)
  if (emptyEl) return emptyEl

  const safeData = data || []

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("QuadrantChart", safeData, "xAccessor", xAccessor)
  warnMissingField("QuadrantChart", safeData, "yAccessor", yAccessor)

  // ── Selection hooks ───────────────────────────────────────────────────
  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: typeof colorBy === "string" ? [colorBy] : [],
    onObservation, chartType: "QuadrantChart", chartId
  })

  // ── Core chart logic ──────────────────────────────────────────────────
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of safeData as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeData, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  const effectiveSelectionHook = useMemo(() => {
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [legendState.legendSelectionHook, activeSelectionHook])

  // ── Compute explicit extents from data + center point ────────────────
  // This ensures PipelineStore builds correct scales immediately. Without this,
  // PipelineStore falls back to [0, 1] domain when the buffer is empty, which
  // causes xCenter/yCenter values outside [0,1] to map to degenerate pixel
  // positions (e.g., xCenter=6.0 on a [0,1] scale maps off-chart).
  // We include the center point and add 10% padding.
  const dataExtents = useMemo(() => {
    if (!safeData.length) return undefined
    const getX = typeof xAccessor === "function" ? xAccessor : (d: Record<string, any>) => +d[xAccessor as string]
    const getY = typeof yAccessor === "function" ? yAccessor : (d: Record<string, any>) => +d[yAccessor as string]
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity
    for (const d of safeData) {
      const xv = getX(d as Record<string, any>)
      const yv = getY(d as Record<string, any>)
      if (isFinite(xv)) { if (xv < xMin) xMin = xv; if (xv > xMax) xMax = xv }
      if (isFinite(yv)) { if (yv < yMin) yMin = yv; if (yv > yMax) yMax = yv }
    }
    // Include center point in extents so it's always visible
    if (xCenter != null && isFinite(xCenter)) { if (xCenter < xMin) xMin = xCenter; if (xCenter > xMax) xMax = xCenter }
    if (yCenter != null && isFinite(yCenter)) { if (yCenter < yMin) yMin = yCenter; if (yCenter > yMax) yMax = yCenter }
    if (xMin === Infinity) return undefined
    // Add standard 10% padding so points aren't at the chart edge
    const xPad = (xMax - xMin) * 0.1 || 1
    const yPad = (yMax - yMin) * 0.1 || 1
    return {
      xExtent: [xMin - xPad, xMax + xPad] as [number, number],
      yExtent: [yMin - yPad, yMax + yPad] as [number, number]
    }
  }, [safeData, xAccessor, yAccessor, xCenter, yCenter])

  const sizeDomain = useMemo(() => {
    if (!sizeBy || safeData.length === 0) return undefined
    const sizes = safeData
      .map((d) => typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    if (sizes.length === 0) return undefined
    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  // Resolve x/y accessors for quadrant coloring
  const getXValue = useMemo(() =>
    typeof xAccessor === "function" ? xAccessor : (d: Record<string, any>) => +d[xAccessor as string],
    [xAccessor]
  )
  const getYValue = useMemo(() =>
    typeof yAccessor === "function" ? yAccessor : (d: Record<string, any>) => +d[yAccessor as string],
    [yAccessor]
  )

  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { fillOpacity: pointOpacity }
      if (colorBy) {
        if (colorScale) baseStyle.fill = getColor(d, colorBy, colorScale)
        // else: let frame use its own color scheme (push API)
      } else {
        // Color by quadrant: determine which quadrant the point falls in
        // based on xCenter/yCenter thresholds and use the quadrant's color
        const xVal = getXValue(d)
        const yVal = getYValue(d)
        const isRight = xCenter != null ? xVal >= xCenter : undefined
        const isTop = yCenter != null ? yVal >= yCenter : undefined
        if (isTop === undefined || isRight === undefined) {
          baseStyle.fill = DEFAULT_COLOR
        } else if (isTop && isRight) baseStyle.fill = quadrants.topRight.color
        else if (isTop && !isRight) baseStyle.fill = quadrants.topLeft.color
        else if (!isTop && isRight) baseStyle.fill = quadrants.bottomRight.color
        else baseStyle.fill = quadrants.bottomLeft.color
      }
      baseStyle.r = sizeBy
        ? getSize(d, sizeBy, sizeRange, sizeDomain)
        : pointRadius
      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity, getXValue, getYValue, xCenter, yCenter, quadrants])

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyle, effectiveSelectionHook, selection),
    [basePointStyle, effectiveSelectionHook, selection]
  )

  // Legend + margin
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeData,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: resolved.marginDefaults,
  })

  // Default tooltip
  // Auto-detect a title field: first string-valued field not used as an accessor
  const titleField = useMemo(() => {
    if (!safeData.length) return undefined
    const usedFields = new Set<string>()
    if (typeof xAccessor === "string") usedFields.add(xAccessor)
    if (typeof yAccessor === "string") usedFields.add(yAccessor)
    if (typeof colorBy === "string") usedFields.add(colorBy)
    if (typeof sizeBy === "string") usedFields.add(sizeBy)
    const sample = safeData[0] as Record<string, any>
    for (const key of Object.keys(sample)) {
      if (key.startsWith("_")) continue
      if (usedFields.has(key)) continue
      if (typeof sample[key] === "string") return key
    }
    return undefined
  }, [safeData, xAccessor, yAccessor, colorBy, sizeBy])

  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    ...(titleField ? [{ label: titleField, accessor: titleField, role: "title" as const }] : []),
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
    ...(sizeBy ? [{ label: accessorName(sizeBy), accessor: sizeBy, role: "size" as const }] : []),
  ]), [titleField, xAccessor, yAccessor, xLabel, yLabel, colorBy, sizeBy])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "QuadrantChart",
    data: data,
    accessors: { xAccessor, yAccessor },
  })
  if (error) return <ChartError componentName="QuadrantChart" message={error} width={width} height={height} />

  // ── Quadrant canvas pre-renderer ──────────────────────────────────────
  // Draws quadrant background fills on the canvas layer UNDER the points.
  const quadrantPreRenderers = useMemo((): CanvasRendererFn[] => {
    const clStyle = {
      stroke: centerlineStyle.stroke || "#999",
      strokeWidth: centerlineStyle.strokeWidth ?? 1,
      dashArray: centerlineStyle.strokeDasharray || [],
    }

    return [(ctx: CanvasRenderingContext2D, _nodes: any[], scales: StreamScales, layout: StreamLayout) => {
      if (!scales?.x || !scales?.y) return

      const w = layout.width
      const h = layout.height
      const xC = xCenter != null ? scales.x(xCenter) : w / 2
      const yC = yCenter != null ? scales.y(yCenter) : h / 2

      // Skip drawing only if scales produce non-finite values (broken/uninitialized).
      // When the center maps outside the chart area, we still draw — the clamp below
      // pushes center lines to the edges so quadrant fills cover the full chart.
      // This is important for streaming/push API where the domain evolves as data
      // arrives and may not include the center point initially.
      if (xCenter != null && !isFinite(xC)) return
      if (yCenter != null && !isFinite(yC)) return

      // Clamp center lines to chart area
      const cx = Math.max(0, Math.min(w, xC))
      const cy = Math.max(0, Math.min(h, yC))

      // Draw quadrant fills
      const quads: Array<{ config: QuadrantConfig; x: number; y: number; w: number; h: number }> = [
        { config: quadrants.topLeft, x: 0, y: 0, w: cx, h: cy },
        { config: quadrants.topRight, x: cx, y: 0, w: w - cx, h: cy },
        { config: quadrants.bottomLeft, x: 0, y: cy, w: cx, h: h - cy },
        { config: quadrants.bottomRight, x: cx, y: cy, w: w - cx, h: h - cy },
      ]

      for (const q of quads) {
        if (q.w <= 0 || q.h <= 0) continue
        ctx.fillStyle = q.config.color
        ctx.globalAlpha = q.config.opacity ?? 0.08
        ctx.fillRect(q.x, q.y, q.w, q.h)
      }
      ctx.globalAlpha = 1

      // Draw center lines
      ctx.strokeStyle = clStyle.stroke
      ctx.lineWidth = clStyle.strokeWidth
      if (clStyle.dashArray.length > 0) {
        ctx.setLineDash(clStyle.dashArray)
      }

      // Vertical center line
      ctx.beginPath()
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, h)
      ctx.stroke()

      // Horizontal center line
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.stroke()

      ctx.setLineDash([])
    }]
  }, [xCenter, yCenter, quadrants, centerlineStyle])

  // Add label rendering to the canvas pre-renderer
  const fullPreRenderers = useMemo((): CanvasRendererFn[] => {
    if (!showQuadrantLabels) return quadrantPreRenderers

    const labelRenderer: CanvasRendererFn = (ctx, _nodes, scales, layout) => {
      if (!scales?.x || !scales?.y) return

      const w = layout.width
      const h = layout.height
      const xC = xCenter != null ? scales.x(xCenter) : w / 2
      const yC = yCenter != null ? scales.y(yCenter) : h / 2

      // Skip only if scales produce non-finite values
      if (xCenter != null && !isFinite(xC)) return
      if (yCenter != null && !isFinite(yC)) return

      const cx = Math.max(0, Math.min(w, xC))
      const cy = Math.max(0, Math.min(h, yC))

      ctx.font = `600 ${quadrantLabelSize}px sans-serif`
      ctx.globalAlpha = 0.5

      const padding = 8

      // Top-left label
      ctx.fillStyle = quadrants.topLeft.color
      ctx.textAlign = "left"
      ctx.textBaseline = "top"
      ctx.fillText(quadrants.topLeft.label, padding, padding)

      // Top-right label
      ctx.fillStyle = quadrants.topRight.color
      ctx.textAlign = "right"
      ctx.textBaseline = "top"
      ctx.fillText(quadrants.topRight.label, w - padding, padding)

      // Bottom-left label
      ctx.fillStyle = quadrants.bottomLeft.color
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"
      ctx.fillText(quadrants.bottomLeft.label, padding, h - padding)

      // Bottom-right label
      ctx.fillStyle = quadrants.bottomRight.color
      ctx.textAlign = "right"
      ctx.textBaseline = "bottom"
      ctx.fillText(quadrants.bottomRight.label, w - padding, h - padding)

      ctx.globalAlpha = 1
    }

    return [...quadrantPreRenderers, labelRenderer]
  }, [quadrantPreRenderers, showQuadrantLabels, quadrantLabelSize, quadrants, xCenter, yCenter])

  // Merge user canvasPreRenderers with quadrant renderers
  const mergedPreRenderers = useMemo(() => {
    const userRenderers = frameProps.canvasPreRenderers || []
    return [...fullPreRenderers, ...userRenderers]
  }, [fullPreRenderers, frameProps.canvasPreRenderers])

  // ── SVG pre-renderer for SSR (quadrant fills + center lines + labels) ──
  const svgPreRenderers = useMemo((): SVGPreRendererFn[] => {
    const clStyle = {
      stroke: centerlineStyle.stroke || "#999",
      strokeWidth: centerlineStyle.strokeWidth ?? 1,
      dashArray: centerlineStyle.strokeDasharray
        ? Array.isArray(centerlineStyle.strokeDasharray)
          ? (centerlineStyle.strokeDasharray as number[]).join(",")
          : centerlineStyle.strokeDasharray
        : undefined,
    }

    return [(_nodes: SceneNode[], scales: StreamScales, layout: StreamLayout): React.ReactNode => {
      if (!scales?.x || !scales?.y) return null
      const w = layout.width
      const h = layout.height
      const xC = xCenter != null ? scales.x(xCenter) : w / 2
      const yC = yCenter != null ? scales.y(yCenter) : h / 2
      if (xCenter != null && !isFinite(xC)) return null
      if (yCenter != null && !isFinite(yC)) return null
      const cx = Math.max(0, Math.min(w, xC))
      const cy = Math.max(0, Math.min(h, yC))

      const quads = [
        { config: quadrants.topLeft, x: 0, y: 0, w: cx, h: cy },
        { config: quadrants.topRight, x: cx, y: 0, w: w - cx, h: cy },
        { config: quadrants.bottomLeft, x: 0, y: cy, w: cx, h: h - cy },
        { config: quadrants.bottomRight, x: cx, y: cy, w: w - cx, h: h - cy },
      ]
      const padding = 8
      return (
        <>
          {quads.map((q, i) => q.w > 0 && q.h > 0 ? (
            <rect key={`qf-${i}`} x={q.x} y={q.y} width={q.w} height={q.h}
              fill={q.config.color} opacity={q.config.opacity ?? 0.08} />
          ) : null)}
          <line x1={cx} y1={0} x2={cx} y2={h}
            stroke={clStyle.stroke} strokeWidth={clStyle.strokeWidth}
            strokeDasharray={clStyle.dashArray} />
          <line x1={0} y1={cy} x2={w} y2={cy}
            stroke={clStyle.stroke} strokeWidth={clStyle.strokeWidth}
            strokeDasharray={clStyle.dashArray} />
          {showQuadrantLabels && (
            <>
              <text x={padding} y={padding + quadrantLabelSize} fill={quadrants.topLeft.color}
                fontWeight={600} fontSize={quadrantLabelSize} opacity={0.5}>{quadrants.topLeft.label}</text>
              <text x={w - padding} y={padding + quadrantLabelSize} fill={quadrants.topRight.color}
                fontWeight={600} fontSize={quadrantLabelSize} opacity={0.5} textAnchor="end">{quadrants.topRight.label}</text>
              <text x={padding} y={h - padding} fill={quadrants.bottomLeft.color}
                fontWeight={600} fontSize={quadrantLabelSize} opacity={0.5}>{quadrants.bottomLeft.label}</text>
              <text x={w - padding} y={h - padding} fill={quadrants.bottomRight.color}
                fontWeight={600} fontSize={quadrantLabelSize} opacity={0.5} textAnchor="end">{quadrants.bottomRight.label}</text>
            </>
          )}
        </>
      )
    }]
  }, [xCenter, yCenter, quadrants, centerlineStyle, showQuadrantLabels, quadrantLabelSize])

  const streamProps: StreamXYFrameProps = {
    chartType: "scatter",
    ...(data != null && { data: safeData }),
    xAccessor,
    yAccessor,
    colorAccessor: colorBy || undefined,
    sizeAccessor: sizeBy || undefined,
    sizeRange,
    pointStyle,
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(dataExtents && { xExtent: dataExtents.xExtent, yExtent: dataExtents.yExtent }),
    ...(legend && { legend, legendPosition }),
    ...(legendInteraction && legendInteraction !== "none" && {
      legendHoverBehavior: legendState.onLegendHover,
      legendClickBehavior: legendState.onLegendClick,
      legendHighlightedCategory: legendState.highlightedCategory,
      legendIsolatedCategories: legendState.isolatedCategories,
    }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (tooltip === true || tooltip === undefined)
        ? defaultTooltipContent
        : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(annotations && annotations.length > 0 && { annotations }),
    canvasPreRenderers: mergedPreRenderers,
    ...frameProps,
    // Override pre-renderers after spread so user can't clobber quadrant renderers
    ...(mergedPreRenderers.length > 0 && { canvasPreRenderers: mergedPreRenderers }),
    svgPreRenderers,
  }

  return <SafeRender componentName="QuadrantChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: QuadrantChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
QuadrantChart.displayName = "QuadrantChart"
