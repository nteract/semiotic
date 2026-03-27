"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, SceneNode, StreamScales, StreamLayout } from "../../stream/types"
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

/** Compute a viridis color for index i out of n total items */
function viridisColor(i: number, n: number): string {
  return interpolateViridis(n === 1 ? 0.5 : i / (n - 1))
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
export const ConnectedScatterplot = forwardRef(function ConnectedScatterplot<TDatum extends Record<string, any> = Record<string, any>>(props: ConnectedScatterplotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  const rawData = (data || []) as Record<string, any>[]

  // Sort by orderAccessor if provided, and build a WeakMap of ordering
  // metadata so pointStyle can read the index directly without mutating user data.
  const { safeData, orderMap } = useMemo(() => {
    const xAcc = typeof xAccessor === "function" ? xAccessor : (d: any) => d[xAccessor]
    const yAcc = typeof yAccessor === "function" ? yAccessor : (d: any) => d[yAccessor]
    let sorted = rawData
    if (orderAccessor && rawData.length > 0) {
      const getOrder = typeof orderAccessor === "function"
        ? orderAccessor as (d: any) => number | Date
        : (d: any) => d[orderAccessor]
      sorted = [...rawData].sort((a, b) => {
        const va = getOrder(a)
        const vb = getOrder(b)
        const na = va instanceof Date ? va.getTime() : +va
        const nb = vb instanceof Date ? vb.getTime() : +vb
        return na - nb
      })
    }
    // Count renderable points and store ordering metadata in a WeakMap
    const map = new WeakMap<Record<string, any>, { idx: number; total: number }>()
    let total = 0
    for (const d of sorted) {
      const x = xAcc(d); const y = yAcc(d)
      if (x != null && y != null && isFinite(x) && isFinite(y)) total++
    }
    let idx = 0
    for (const d of sorted) {
      const x = xAcc(d); const y = yAcc(d)
      if (x != null && y != null && isFinite(x) && isFinite(y)) {
        map.set(d, { idx: idx++, total })
      }
    }
    return { safeData: sorted, orderMap: map }
  }, [rawData, orderAccessor, xAccessor, yAccessor])

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

  // ── Canvas pre-renderer for connecting lines (drawn under points) ─────
  //
  // Reads PointSceneNodes directly from the scene graph, which is the
  // single source of truth for visible data (respects windowing, eviction,
  // etc.). Computes viridis colors on the fly from scene node order.

  const connectingLineRenderer = useMemo(() => {
    return (ctx: CanvasRenderingContext2D, nodes: any[]) => {
      const pts = nodes.filter((n: any) => n.type === "point")
      if (pts.length < 2) return

      const selActive = effectiveSelectionHook?.isActive
      const selPredicate = effectiveSelectionHook?.predicate
      const halo = pts.length < 100
      const count = pts.length

      ctx.lineCap = "round"

      for (let i = 0; i < count - 1; i++) {
        const p0 = pts[i]
        const p1 = pts[i + 1]
        const color = viridisColor(i, count)

        const segmentSelected = selActive && selPredicate
          ? selPredicate(p0.datum ?? p0) || selPredicate(p1.datum ?? p1)
          : true
        const segmentOpacity = selActive ? (segmentSelected ? 1 : 0.2) : 1

        if (halo) {
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = "white"
          ctx.lineWidth = pointRadius + 2
          ctx.globalAlpha = 0.5 * segmentOpacity
          ctx.stroke()
        }

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

  // ── SVG pre-renderer for SSR (same logic as canvas, produces SVG elements) ──
  // Reads point node style.opacity to respect selection dimming in SSR output.
  const connectingLineSVGRenderer = useMemo(() => {
    return (nodes: SceneNode[], _scales: StreamScales, _layout: StreamLayout): React.ReactNode => {
      const pts = nodes.filter((n) => n.type === "point") as Array<{ x: number; y: number; style?: { opacity?: number }; datum?: any }>
      if (pts.length < 2) return null
      const count = pts.length
      const halo = count < 100
      const elements: React.ReactElement[] = []

      for (let i = 0; i < count - 1; i++) {
        const p0 = pts[i]
        const p1 = pts[i + 1]
        const color = viridisColor(i, count)
        const o0 = typeof p0.style?.opacity === "number" ? p0.style.opacity : 1
        const o1 = typeof p1.style?.opacity === "number" ? p1.style.opacity : 1
        const segmentOpacity = Math.min(o0, o1)
        if (halo) {
          elements.push(
            <line key={`halo-${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
              stroke="white" strokeWidth={pointRadius + 2} strokeLinecap="round" opacity={0.5 * segmentOpacity} />
          )
        }
        elements.push(
          <line key={`seg-${i}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
            stroke={color} strokeWidth={pointRadius} strokeLinecap="round" opacity={segmentOpacity} />
        )
      }
      return <>{elements}</>
    }
  }, [pointRadius])

  const svgPreRenderers = useMemo(
    () => [connectingLineSVGRenderer],
    [connectingLineSVGRenderer]
  )

  // ── Point style — viridis colored, fixed radius ───────────────────────
  //
  // Reads ordering from the WeakMap (no user data mutation).

  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const order = orderMap.get(d)
      const i = order?.idx ?? 0
      const n = order?.total ?? 1
      return {
        fill: n > 0 ? viridisColor(i, n) : "#6366f1",
        stroke: "white",
        strokeWidth: 1,
        r: pointRadius,
        fillOpacity: 1,
      }
    }
  }, [pointRadius, orderMap])

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

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

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
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(pointIdAccessor && { pointIdAccessor }),
    canvasPreRenderers,
    svgPreRenderers,
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl
  if (error) return <ChartError componentName="ConnectedScatterplot" message={error} width={width} height={height} />

  return <SafeRender componentName="ConnectedScatterplot" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: ConnectedScatterplotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
ConnectedScatterplot.displayName = "ConnectedScatterplot"
