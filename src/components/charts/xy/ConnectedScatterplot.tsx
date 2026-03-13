"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps } from "../../stream/types"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import { useChartSelection, useChartMode, useLegendInteraction } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { interpolateViridis } from "d3-scale-chromatic"

/**
 * ConnectedScatterplot component props
 */
export interface ConnectedScatterplotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /** Array of data points. Each point needs x and y properties. */
  data: TDatum[]
  /** Field name or function to access x values @default "x" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Field name or function to access y values @default "y" */
  yAccessor?: ChartAccessor<TDatum, number>
  /**
   * Field name or function that determines point ordering.
   * Data is sorted by this value (ascending) before connecting.
   * Supports numbers and Dates. Shown in tooltip. @default undefined (use data array order)
   */
  orderAccessor?: string | ((d: TDatum) => number | Date)
  /** Label for the ordering metric in tooltips @default "Order" or the accessor field name */
  orderLabel?: string
  /** Point radius @default 4 */
  pointRadius?: number
  /** Enable hover annotations @default true */
  enableHover?: boolean
  /** Show grid lines @default false */
  showGrid?: boolean
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Accessor for unique point IDs, used by point-anchored annotations */
  pointIdAccessor?: ChartAccessor<TDatum, string>
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Annotation objects to render on the chart */
  annotations?: Record<string, any>[]
  /** Additional StreamXYFrame props for advanced customization */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * ConnectedScatterplot — points connected in sequence by lines.
 *
 * Points are colored using viridis from start (purple) to end (yellow).
 * Lines match the color of their source point and have the same width
 * as the point radius, so the 2×radius circle remains distinctive.
 * When fewer than 100 points, a 50% transparent white halo is drawn
 * under each connecting line for legibility.
 *
 * @example
 * ```tsx
 * <ConnectedScatterplot
 *   data={trajectory}
 *   xAccessor="gdp"
 *   yAccessor="lifeExpectancy"
 *   pointRadius={4}
 * />
 * ```
 */
export function ConnectedScatterplot<TDatum extends Record<string, any> = Record<string, any>>(
  props: ConnectedScatterplotProps<TDatum>
) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
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
    orderAccessor,
    orderLabel,
    pointRadius = 4,
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
    legendInteraction
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const title = resolved.title
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  // ── Loading / empty states ──────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(data, width, height, emptyContent)
  if (emptyEl) return emptyEl

  const rawData = (data || []) as Record<string, any>[]

  // Sort by orderAccessor if provided
  const safeData = useMemo(() => {
    if (!orderAccessor || rawData.length === 0) return rawData
    const getOrder = typeof orderAccessor === "function"
      ? orderAccessor as (d: any) => number | Date
      : (d: any) => d[orderAccessor]
    return [...rawData].sort((a, b) => {
      const va = getOrder(a)
      const vb = getOrder(b)
      // Handle Date objects
      const na = va instanceof Date ? va.getTime() : +va
      const nb = vb instanceof Date ? vb.getTime() : +vb
      return na - nb
    })
  }, [rawData, orderAccessor])

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("ConnectedScatterplot", safeData, "xAccessor", xAccessor)
  warnMissingField("ConnectedScatterplot", safeData, "yAccessor", yAccessor)

  // ── Selection hooks ───────────────────────────────────────────────────

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: [],
    onObservation, chartType: "ConnectedScatterplot", chartId
  })

  // Legend interaction (no-op for ConnectedScatterplot since no colorBy)
  const legendState = useLegendInteraction(legendInteraction, undefined, [])

  // Merge legend selection with cross-chart selection
  const effectiveSelectionHook = useMemo(() => {
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [legendState.legendSelectionHook, activeSelectionHook])

  // ── Viridis color assignment ──────────────────────────────────────────

  const n = safeData.length
  const showHalo = n > 0 && n < 100

  // Pre-compute color for each data point (viridis: 0=purple → 1=yellow)
  const pointColors = useMemo(() => {
    if (n === 0) return []
    return safeData.map((_, i) => interpolateViridis(n === 1 ? 0.5 : i / (n - 1)))
  }, [safeData, n])

  // ── Build foreground SVG for connecting lines ─────────────────────────
  // We draw lines as SVG foreground graphics so they sit between the
  // canvas points and the SVG overlay (axes, tooltips). Each line
  // connects consecutive points.

  const connectingLines = useMemo(() => {
    if (n < 2) return null

    // We need the scales to map data → pixels. Since we don't have direct
    // access to the pipeline store's scales in the HOC, we render the lines
    // as annotations instead — they get access to scales via the annotation
    // context. But annotations are SVG elements in the overlay.
    //
    // Actually, the cleanest approach: pass the data as BOTH scatter points
    // AND a line, then style the line segments individually.
    // StreamXYFrame doesn't support per-segment line coloring natively for
    // connected scatterplots. Instead, we'll use svgAnnotationRules to draw
    // the connecting lines in the SVG overlay with full control.

    return null // handled via svgAnnotationRules below
  }, [n])

  // ── Custom annotation rules for connecting lines ──────────────────────

  const svgAnnotationRules = useMemo(() => {
    if (n < 2) return undefined

    return (annotation: Record<string, any>, index: number, context: any) => {
      // Only handle our custom "connected-lines" annotation
      if (annotation.type !== "connected-lines") return null

      const scales = context.scales
      if (!scales) return null
      const scaleX = scales.x ?? scales.time
      const scaleY = scales.y ?? scales.value
      if (!scaleX || !scaleY) return null

      const xAcc = typeof xAccessor === "string" ? (d: any) => d[xAccessor] : xAccessor
      const yAcc = typeof yAccessor === "string" ? (d: any) => d[yAccessor] : yAccessor

      const elements: React.ReactNode[] = []

      for (let i = 0; i < safeData.length - 1; i++) {
        const d0 = safeData[i]
        const d1 = safeData[i + 1]
        const x0 = scaleX(xAcc(d0))
        const y0 = scaleY(yAcc(d0))
        const x1 = scaleX(xAcc(d1))
        const y1 = scaleY(yAcc(d1))
        const color = pointColors[i]

        // Halo line (white, wider, semi-transparent) for < 100 points
        if (showHalo) {
          elements.push(
            <line
              key={`halo-${i}`}
              x1={x0} y1={y0} x2={x1} y2={y1}
              stroke="white"
              strokeWidth={pointRadius + 2}
              strokeOpacity={0.5}
              strokeLinecap="round"
            />
          )
        }

        // Connecting line — same width as point radius, source point color
        elements.push(
          <line
            key={`conn-${i}`}
            x1={x0} y1={y0} x2={x1} y2={y1}
            stroke={color}
            strokeWidth={pointRadius}
            strokeLinecap="round"
          />
        )
      }

      return <g key={`ann-${index}`}>{elements}</g>
    }
  }, [safeData, pointColors, pointRadius, showHalo, xAccessor, yAccessor, n])

  // ── Point style — viridis colored, fixed radius ───────────────────────

  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const idx = safeData.indexOf(d)
      const color = idx >= 0 && idx < pointColors.length ? pointColors[idx] : "#6366f1"
      return {
        fill: color,
        stroke: "white",
        strokeWidth: 1,
        r: pointRadius,
        fillOpacity: 1,
      }
    }
  }, [safeData, pointColors, pointRadius])

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyle, effectiveSelectionHook, selection),
    [basePointStyle, effectiveSelectionHook, selection]
  )

  // ── Margin ────────────────────────────────────────────────────────────

  const margin = { top: 50, right: 40, bottom: 60, left: 70, ...props.margin }

  // ── Tooltip ───────────────────────────────────────────────────────────

  const resolvedOrderLabel = orderLabel || (typeof orderAccessor === "string" ? orderAccessor : "Order")

  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    ...(orderAccessor ? [{ label: resolvedOrderLabel, accessor: orderAccessor as any, role: "group" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, orderAccessor, resolvedOrderLabel])

  // ── Validate ──────────────────────────────────────────────────────────

  const error = validateArrayData({
    componentName: "ConnectedScatterplot",
    data: safeData,
    accessors: { xAccessor, yAccessor },
  })
  if (error) return <ChartError componentName="ConnectedScatterplot" message={error} width={width} height={height} />

  // ── Annotations: inject the connected-lines annotation ────────────────

  const allAnnotations = useMemo(() => {
    const base = annotations || []
    return [{ type: "connected-lines" }, ...base]
  }, [annotations])

  // ── Render ────────────────────────────────────────────────────────────

  const streamProps: StreamXYFrameProps = {
    chartType: "scatter",
    data: safeData,
    xAccessor,
    yAccessor,
    pointStyle,
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
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(pointIdAccessor && { pointIdAccessor }),
    annotations: allAnnotations,
    svgAnnotationRules,
    ...frameProps
  }

  return <SafeRender componentName="ConnectedScatterplot" width={width} height={height}><StreamXYFrame {...streamProps} /></SafeRender>
}
ConnectedScatterplot.displayName = "ConnectedScatterplot"
