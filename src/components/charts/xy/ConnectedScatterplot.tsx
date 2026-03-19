"use client"
import * as React from "react"
import { useMemo, useState, forwardRef, useRef, useImperativeHandle } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
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
  /** Array of data points. Each point needs x and y properties. Omit when using push API. */
  data?: TDatum[]
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
export const ConnectedScatterplot = forwardRef<RealtimeFrameHandle, ConnectedScatterplotProps>(function ConnectedScatterplot(props, ref) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  // Track pushed data locally so we can compute viridis colors + connecting lines
  const pushedDataRef = useRef<Record<string, any>[]>([])
  const [pushVersion, setPushVersion] = useState(0)

  useImperativeHandle(ref, () => ({
    push: (point) => {
      frameRef.current?.push(point)
      // Sync local copy from Frame's windowed data so colors stay correct
      pushedDataRef.current = frameRef.current?.getData() ?? []
      setPushVersion(v => v + 1)
    },
    pushMany: (points) => {
      frameRef.current?.pushMany(points)
      pushedDataRef.current = frameRef.current?.getData() ?? []
      setPushVersion(v => v + 1)
    },
    clear: () => {
      frameRef.current?.clear()
      pushedDataRef.current = []
      setPushVersion(v => v + 1)
    },
    getData: () => frameRef.current?.getData() ?? []
  }))

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

  // In push API mode (data is undefined), use locally tracked pushed data
  const rawData = (data != null ? data : pushedDataRef.current) as Record<string, any>[]

  // Sort by orderAccessor if provided
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [rawData, orderAccessor, pushVersion])

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

  // ── Canvas pre-renderer for connecting lines (drawn under points) ────
  // Reads live data from PointSceneNodes so it stays in sync with the
  // Frame's window (old points that leave the window are gone from the
  // scene, so their connecting lines disappear too).

  const connectingLineRenderer = useMemo(() => {
    return (ctx: CanvasRenderingContext2D, nodes: any[], scales: any) => {
      // Extract point nodes in their current scene order
      const pts = nodes.filter((n: any) => n.type === "point")
      if (pts.length < 2) return

      const selActive = effectiveSelectionHook?.isActive
      const selPredicate = effectiveSelectionHook?.predicate
      const halo = pts.length < 100

      // Compute viridis colors for current visible points
      const count = pts.length
      const colors = pts.map((_: any, i: number) =>
        interpolateViridis(count === 1 ? 0.5 : i / (count - 1))
      )

      ctx.lineCap = "round"

      for (let i = 0; i < count - 1; i++) {
        const p0 = pts[i]
        const p1 = pts[i + 1]
        const color = colors[i]

        // When selection active, dim lines where neither endpoint matches
        const segmentSelected = selActive && selPredicate
          ? selPredicate(p0.data ?? p0) || selPredicate(p1.data ?? p1)
          : true
        const segmentOpacity = selActive ? (segmentSelected ? 1 : 0.2) : 1

        // Halo line (white, wider, semi-transparent) for < 100 points
        if (halo) {
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = "white"
          ctx.lineWidth = pointRadius + 2
          ctx.globalAlpha = 0.5 * segmentOpacity
          ctx.stroke()
        }

        // Connecting line — same width as point radius, source point color
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.strokeStyle = color
        ctx.lineWidth = pointRadius
        ctx.globalAlpha = segmentOpacity
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    }
  }, [pointRadius, effectiveSelectionHook])

  const canvasPreRenderers = useMemo(
    () => [connectingLineRenderer],
    [connectingLineRenderer]
  )

  // ── Point style — viridis colored, fixed radius ───────────────────────

  // Build identity map for O(1) color lookup. In push mode the renderer
  // passes the original datum object so identity comparison works.
  const colorByIdentity = useMemo(() => {
    const map = new Map<any, string>()
    safeData.forEach((d, i) => {
      map.set(d, pointColors[i] ?? "#6366f1")
    })
    return map
  }, [safeData, pointColors])

  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      // Try identity lookup first, then check .data (RealtimeNode wrapper)
      const color = colorByIdentity.get(d)
        ?? colorByIdentity.get((d as any).data)
        ?? "#6366f1"
      return {
        fill: color,
        stroke: "white",
        strokeWidth: 1,
        r: pointRadius,
        fillOpacity: 1,
      }
    }
  }, [colorByIdentity, pointRadius])

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
    ...(orderAccessor ? [{ label: resolvedOrderLabel, accessor: orderAccessor, role: "group" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, orderAccessor, resolvedOrderLabel])

  // ── Validate ──────────────────────────────────────────────────────────

  const error = validateArrayData({
    componentName: "ConnectedScatterplot",
    data,
    accessors: { xAccessor, yAccessor },
  })

  // ── Annotations ──────────────────────────────────────────────────────

  // ── Loading / empty / error states (after all hooks) ──────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(data, width, height, emptyContent)
  if (emptyEl) return emptyEl
  if (error) return <ChartError componentName="ConnectedScatterplot" message={error} width={width} height={height} />

  // ── Render ────────────────────────────────────────────────────────────

  const streamProps: StreamXYFrameProps = {
    chartType: "scatter",
    ...(data != null && { data: safeData }),
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
    tooltipContent: normalizeTooltip(tooltip) || defaultTooltipContent,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(canvasPreRenderers && { canvasPreRenderers }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <SafeRender componentName="ConnectedScatterplot" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
})
ConnectedScatterplot.displayName = "ConnectedScatterplot"
