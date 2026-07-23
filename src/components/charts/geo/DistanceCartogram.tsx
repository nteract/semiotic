"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, useRef, useState, useEffect, useCallback, forwardRef } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, StreamGeoFrameHandle, ProjectionProp, DistanceCartogramConfig } from "../../stream/geoTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { getColor } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import { resolveAxisFreeMarginDefaults } from "../shared/chartMode"
import type { LegendPosition } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { composeStyleRules, makeNodeRuleContext, type StyleRule } from "../shared/styleRules"

import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { Style } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"

export interface DistanceCartogramProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /** Point data with geographic coordinates */
  points?: TDatum[]
  /** Route/edge data with source/target fields */
  lines?: Array<{ source: string; target: string; coordinates?: Datum[] } & Record<string, unknown>>
  /** Longitude accessor @default "lon" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Latitude accessor @default "lat" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Node ID accessor @default "id" */
  nodeIdAccessor?: string
  /** ID of the center point */
  center: string
  /** Cost/distance accessor — numeric field or function */
  costAccessor: string | ((d: Datum) => number)
  /** Interpolation between geographic (0) and cartogram (1), clamped to [0, 1]. @default 1 */
  strength?: number
  /** Line rendering mode @default "straight" */
  lineMode?: "straight" | "fractional"
  /** Base geographic projection @default "mercator" */
  projection?: ProjectionProp
  /** Show graticule grid lines */
  graticule?: boolean | import("../../stream/geoTypes").GraticuleConfig
  /** Transition duration in ms when center/strength changes */
  transition?: number
  /** Field to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Declarative, threshold-aware point styling. Ordered `{ when, style }`
   * rules; last applicable rule wins. `ctx` = `{ value, category }`
   * (category = `colorBy`). A rule `fill` may be a color or a HatchFill.
   */
  styleRules?: StyleRule[]
  /** Color scheme @default "category10" */
  colorScheme?: string | string[] | Record<string, string>
  /** Point radius. Defaults to 5, or 1.5 in sparkline mode. */
  pointRadius?: number
  /** Tooltip */
  tooltip?: TooltipProp
  /** Enable hover interaction. Defaults by chart mode. */
  enableHover?: boolean
  /** Show legend */
  showLegend?: boolean
  /** Legend position */
  legendPosition?: LegendPosition
  /**
   * Finite projection-fit fraction in `[0, 0.5)`. `0.1` = 10% inset;
   * nullish values use 0 and invalid values throw. An explicit
   * `frameProps.projectionExtent` remains authoritative.
   * @default 0
   */
  fitPadding?: number | null
  /** Enable zoom/pan. Defaults to true when tileURL is set, false otherwise. */
  zoomable?: boolean
  /** [minZoom, maxZoom] @default [1, 8] */
  zoomExtent?: [number, number]
  /** Zoom change callback */
  onZoom?: StreamGeoFrameProps["onZoom"]
  /**
   * When true, drag gestures rotate the projection (globe spinning)
   * instead of panning. Defaults to true for orthographic projection.
   */
  dragRotate?: boolean
  /** Raster tile URL template or function. Enables tile basemap (Mercator only). */
  tileURL?: string | ((z: number, x: number, y: number, dpr: number) => string)
  /** Attribution text for tile provider */
  tileAttribution?: string
  /** Max cached tiles @default 256 */
  tileCacheSize?: number
  /**
   * Cost reference marks.
   * - Radial layout: concentric rings around center.
   * - Strip (sparkline) layout: baseline tick marks on the cost axis.
   * @default true (radial); true as axis ticks in sparkline
   */
  showRings?: boolean | number | number[]
  /** Show numeric labels on distance rings. Defaults to false in context and sparkline modes. */
  showRingLabels?: boolean
  /** Ring / strip-tick style overrides */
  ringStyle?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string; labelColor?: string; labelSize?: number }
  /** Show north indicator arrow. Defaults to true, or false in sparkline mode. */
  showNorth?: boolean
  /** Label for cost units shown on rings (e.g. "hrs", "km") */
  costLabel?: string
  /**
   * Cartogram layout encoding. Defaults to `"strip"` (1D Langren cost axis)
   * in sparkline mode and `"radial"` otherwise.
   */
  cartogramLayout?: "radial" | "strip"
  /** Annotations */
  annotations?: Datum[]
  /** Passthrough */
  frameProps?: Partial<Omit<StreamGeoFrameProps, "projection">>
}

/**
 * DistanceCartogram - Distort a map so distances reflect cost/time, not geography.
 *
 * Points are repositioned so their pixel distance from `center` is
 * proportional to `costAccessor` (commute time, fare, hops, etc.) rather
 * than great-circle distance. `strength` interpolates between the
 * geographic positions (0) and the fully-distorted cartogram (1).
 * Concentric rings show iso-cost contours by default. In `mode="sparkline"`
 * the chart collapses to a Langren-style 1D cost strip (origin at left,
 * cost growing right) so dense estimates of the same distance stay legible
 * without map chrome.
 *
 * @example
 * ```tsx
 * // Cities by travel-time from NYC
 * <DistanceCartogram
 *   points={cities}
 *   xAccessor="lon"
 *   yAccessor="lat"
 *   nodeIdAccessor="iata"
 *   center="JFK"
 *   costAccessor="hours_from_jfk"
 *   costLabel="hrs"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Half-distorted view + colored points + custom ring intervals
 * <DistanceCartogram
 *   points={cities}
 *   center="JFK"
 *   costAccessor="hours_from_jfk"
 *   strength={0.5}
 *   colorBy="region"
 *   showRings={[1, 3, 6, 12]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With route lines connecting source→target by cost
 * <DistanceCartogram
 *   points={airports}
 *   lines={routes}
 *   center="JFK"
 *   costAccessor="cost"
 *   lineMode="fractional"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Sparkline: Langren-style 1D cost strip (origin left, cost right)
 * <DistanceCartogram
 *   points={estimates}
 *   center="Toledo"
 *   costAccessor="degrees"
 *   mode="sparkline"
 *   width={160}
 *   height={28}
 * />
 * ```
 */
export const DistanceCartogram = forwardRef(function DistanceCartogram<TDatum extends Datum = Datum>(props: DistanceCartogramProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    enableHover: props.enableHover,
    linkedHover: props.linkedHover,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
})

  const {
    points,
    lines,
    xAccessor = "lon",
    yAccessor = "lat",
    nodeIdAccessor = "id",
    center,
    costAccessor,
    strength = 1,
    lineMode = "straight",
    projection = "mercator",
    graticule,
    fitPadding,
    zoomable: zoomableProp,
    zoomExtent,
    onZoom: onZoomProp,
    dragRotate,
    tileURL,
    tileAttribution,
    tileCacheSize,
    transition: transitionDuration,
    colorBy,
    styleRules,
    colorScheme,
    pointRadius: pointRadiusProp,
    tooltip,
    showRings: showRingsProp,
    showRingLabels: showRingLabelsProp,
    ringStyle,
    showNorth: showNorthProp,
    costLabel,
    cartogramLayout: cartogramLayoutProp,
    annotations,
    margin: userMargin,
    className,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    legendPosition: legendPositionProp,
    frameProps = {},
    stroke,
    strokeWidth,
    opacity,
  } = props

  const isSparkline = resolved.mode === "sparkline"
  // Sparkline → Langren 1D strip; primary/context stay radial unless overridden.
  const cartogramLayoutMode: "radial" | "strip" =
    cartogramLayoutProp ?? (isSparkline ? "strip" : "radial")
  const pointRadius = pointRadiusProp ?? (isSparkline ? 1.5 : 5)
  const showRings = showRingsProp ?? true
  // Strip labels are rarely useful at sparkline height; keep ring labels off
  // for compact modes and always off for strip unless the author opts in.
  const showRingLabels =
    showRingLabelsProp ?? (cartogramLayoutMode === "strip" ? false : !resolved.compactMode)
  const showNorth = showNorthProp ?? (cartogramLayoutMode === "strip" ? false : !isSparkline)

  // Tile maps default to zoomable; non-tile maps default to not zoomable
  const zoomable = zoomableProp ?? (tileURL ? true : false)

  const safeData = useMemo(() => filterSparseArray(points), [points])

  // ── All hooks must be called unconditionally (before any early returns) ──

  const setup = useChartSetup({
    data: safeData,
    rawData: points,
    colorBy,
    colorScheme,
    legendInteraction: undefined,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: false,
    onObservation,
    onClick,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "DistanceCartogram",
    chartId,
    showLegend: resolved.showLegend,
    userMargin,
    marginDefaults: resolveAxisFreeMarginDefaults(resolved),
    loading,
    loadingContent,
    emptyContent,
    width: resolved.width,
    height: resolved.height,
    hasTitle: !!resolved.title,
  })

  const pointStyleFn = useMemo(() => {
    const base = (d: Datum): Style & { r?: number } => {
      const id = d?.[nodeIdAccessor]
      const isCenter = id != null && String(id) === String(center)
      // Origin (center) reads first on the strip / radial layout — slightly
      // larger and full-weight so it anchors the cost scale.
      return {
        fill: colorBy ? getColor(d, colorBy, setup.colorScale) : DEFAULT_COLOR,
        fillOpacity: isCenter ? 1 : 0.8,
        stroke: isCenter ? "var(--semiotic-text, #222)" : "#fff",
        strokeWidth: isCenter ? 1.25 : 1,
        r: isCenter ? pointRadius * 1.35 : pointRadius,
      }
    }
    const ruled = composeStyleRules(
      base,
      styleRules,
      makeNodeRuleContext(colorBy as string | ((d: Datum) => unknown) | undefined),
    ) as (d: Datum) => Style & { r?: number }
    const withPrimitives = mergeShapeStyle(ruled, { stroke, strokeWidth, opacity }) as (d: Datum) => Style & { r?: number }
    if (setup.effectiveSelectionHook) {
      return wrapStyleWithSelection(withPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection) as (d: Datum) => Style & { r?: number }
    }
    return withPrimitives
  }, [colorBy, setup.colorScale, setup.effectiveSelectionHook, setup.resolvedSelection, pointRadius, stroke, strokeWidth, opacity, styleRules, center, nodeIdAccessor])

  // Build cartogram config
  const cartogramConfig: DistanceCartogramConfig = useMemo(() => ({
    center,
    centerAccessor: nodeIdAccessor,
    costAccessor,
    strength,
    lineMode,
    layout: cartogramLayoutMode,
  }), [center, nodeIdAccessor, costAccessor, strength, lineMode, cartogramLayoutMode])

  // Convert lines to format StreamGeoFrame expects
  const lineData = useMemo(() => {
    if (!lines) return undefined
    const xAcc = typeof xAccessor === "function" ? xAccessor : (d: Datum) => d[xAccessor as string]
    const yAcc = typeof yAccessor === "function" ? yAccessor : (d: Datum) => d[yAccessor as string]

    // Build node lookup for edge coordinates
    const nodeLookup = new Map<string, Datum>()
    for (const node of safeData) {
      nodeLookup.set(String(node[nodeIdAccessor]), node)
    }

    return lines.map(line => {
      if (line.coordinates) return line
      const src = nodeLookup.get(String(line.source))
      const tgt = nodeLookup.get(String(line.target))
      if (!src || !tgt) return null
      return {
        ...line,
        coordinates: [
          { [xAccessor as string]: xAcc(src), [yAccessor as string]: yAcc(src) },
          { [xAccessor as string]: xAcc(tgt), [yAccessor as string]: yAcc(tgt) }
        ]
      }
    }).filter(Boolean) as Datum[]
  }, [lines, safeData, xAccessor, yAccessor, nodeIdAccessor])

  const defaultTooltip = useMemo(() => (d: Datum) => {
    const costAcc = typeof costAccessor === "function" ? costAccessor : (datum: Datum) => datum[costAccessor as string]
    const cost = costAcc(d)
    const name = d[nodeIdAccessor] || d.name || d.id || "Point"
    return (
      <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {cost != null && <div style={{ opacity: 0.7 }}>Cost: {typeof cost === "number" ? cost.toFixed(1) : cost}</div>}
      </div>
    )
  }, [costAccessor, nodeIdAccessor])

  // ── Ref + layout state for overlay rendering ─────────────────────
  const geoRef = useRef<StreamGeoFrameHandle>(null)
  useFrameImperativeHandle(ref, { variant: "geo-points", frameRef: geoRef })

  const [cartogramLayout, setCartogramLayout] = useState<{
    cx: number
    cy: number
    maxCost: number
    availableRadius: number
    layout: "radial" | "strip"
  } | null>(null)

  // Read layout after each render cycle (store computes it synchronously in computeScene)
  const readLayout = useCallback(() => {
    const layout = geoRef.current?.getCartogramLayout?.()
    if (layout) {
      setCartogramLayout(prev => {
        if (
          prev &&
          prev.cx === layout.cx &&
          prev.cy === layout.cy &&
          prev.maxCost === layout.maxCost &&
          prev.availableRadius === layout.availableRadius &&
          prev.layout === (layout.layout ?? "radial")
        ) {
          return prev
        }
        return {
          cx: layout.cx,
          cy: layout.cy,
          maxCost: layout.maxCost,
          availableRadius: layout.availableRadius,
          layout: layout.layout ?? "radial",
        }
      })
    }
  }, [])

  // Re-read when inputs that affect layout change
  useEffect(() => {
    // Use rAF to read after the frame renders
    const id = requestAnimationFrame(readLayout)
    return () => cancelAnimationFrame(id)
  }, [readLayout, strength, center, resolved.width, resolved.height, safeData, cartogramLayoutMode])

  // ── Compute ring / tick values ──────────────────────────────────
  const ringValues = useMemo(() => {
    if (!showRings || !cartogramLayout) return []
    const { maxCost } = cartogramLayout
    if (maxCost <= 0) return []

    if (Array.isArray(showRings)) return showRings.filter(v => v > 0 && v <= maxCost)

    // Auto or explicit count — fewer ticks on the strip so sparkline stays quiet.
    const defaultCount = cartogramLayout.layout === "strip" ? 3 : 5
    const count =
      typeof showRings === "number"
        ? showRings
        : Math.min(defaultCount, Math.max(2, Math.ceil(maxCost / 5)))
    const step = maxCost / count
    const values: number[] = []
    for (let i = 1; i <= count; i++) {
      values.push(Math.round(step * i * 10) / 10)
    }
    return values
  }, [showRings, cartogramLayout])

  // ── Foreground SVG overlay ──────────────────────────────────────
  const overlayGraphics = useMemo(() => {
    if (!cartogramLayout) return frameProps.foregroundGraphics || null
    const { cx, cy, maxCost, availableRadius, layout: layoutKind } = cartogramLayout
    const isStrip = layoutKind === "strip"
    const rs = {
      stroke: isStrip ? "var(--semiotic-border, #999)" : "#999",
      strokeWidth: isStrip ? 1 : 0.8,
      strokeDasharray: isStrip ? "none" : "4,3",
      labelColor: "var(--semiotic-text-secondary, #777)",
      labelSize: isStrip ? 8 : 10,
      ...ringStyle
    }

    // Adjust positions for margin
    const mx = setup.margin.left ?? 10
    const my = setup.margin.top ?? 10
    const ox = cx + mx
    const oy = cy + my

    return (
      <g>
        {isStrip ? (
          <>
            {/* Langren baseline: cost axis from origin → max */}
            <line
              x1={ox}
              y1={oy}
              x2={ox + availableRadius}
              y2={oy}
              stroke={rs.stroke}
              strokeWidth={rs.strokeWidth}
              strokeLinecap="round"
              opacity={0.85}
            />
            {/* Origin tick (slightly taller) */}
            <line
              x1={ox}
              y1={oy - 3.5}
              x2={ox}
              y2={oy + 3.5}
              stroke={rs.stroke}
              strokeWidth={rs.strokeWidth}
              opacity={0.9}
            />
            {/* Cost ticks along the strip */}
            {showRings &&
              ringValues.map((cost) => {
                const x = ox + (maxCost > 0 ? (cost / maxCost) * availableRadius : 0)
                return (
                  <g key={cost}>
                    <line
                      x1={x}
                      y1={oy - 2.5}
                      x2={x}
                      y2={oy + 2.5}
                      stroke={rs.stroke}
                      strokeWidth={0.9}
                      opacity={0.65}
                    />
                    {showRingLabels && (
                      <text
                        x={x}
                        y={oy + Math.min(10, (setup.margin.bottom ?? 2) + 8)}
                        textAnchor="middle"
                        fontSize={rs.labelSize}
                        fill={rs.labelColor}
                        fontFamily="var(--semiotic-font-family, system-ui, sans-serif)"
                      >
                        {cost}
                        {costLabel ? ` ${costLabel}` : ""}
                      </text>
                    )}
                  </g>
                )
              })}
          </>
        ) : (
          <>
            {/* Concentric distance rings */}
            {ringValues.map((cost) => {
              const r = (cost / maxCost) * availableRadius
              return (
                <g key={cost}>
                  <circle
                    cx={ox}
                    cy={oy}
                    r={r}
                    fill="none"
                    stroke={rs.stroke}
                    strokeWidth={rs.strokeWidth}
                    strokeDasharray={rs.strokeDasharray}
                    opacity={0.5}
                  />
                  {showRingLabels && (
                    <text
                      x={ox + r + 3}
                      y={oy - 2}
                      fontSize={rs.labelSize}
                      fill={rs.labelColor}
                      fontFamily="system-ui, sans-serif"
                    >
                      {cost}
                      {costLabel ? ` ${costLabel}` : ""}
                    </text>
                  )}
                </g>
              )
            })}

            {/* North indicator */}
            {showNorth && (
              <g transform={`translate(${mx + 24}, ${my + 24})`}>
                <circle r={16} fill="white" fillOpacity={0.85} stroke="#bbb" strokeWidth={0.8} />
                <path
                  d="M0,-11 L3,-3 L1,-4 L1,7 L-1,7 L-1,-4 L-3,-3 Z"
                  fill="#555"
                  stroke="none"
                />
                <text
                  y={-12}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight={700}
                  fill="#555"
                  fontFamily="system-ui, sans-serif"
                >
                  N
                </text>
                <line x1={11} y1={0} x2={13} y2={0} stroke="#bbb" strokeWidth={0.8} />
                <line x1={-11} y1={0} x2={-13} y2={0} stroke="#bbb" strokeWidth={0.8} />
                <line x1={0} y1={11} x2={0} y2={13} stroke="#bbb" strokeWidth={0.8} />
              </g>
            )}
          </>
        )}

        {/* Pass through any user foregroundGraphics */}
        {frameProps.foregroundGraphics}
      </g>
    )
  }, [cartogramLayout, ringValues, showRings, showRingLabels, showNorth, costLabel, ringStyle, setup.margin, frameProps.foregroundGraphics])

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, no points) and then streaming in data must not change
  // the number of hooks between renders, or React throws "Rendered more hooks
  // than during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  warnMissingField("DistanceCartogram", safeData, "xAccessor", xAccessor)
  warnMissingField("DistanceCartogram", safeData, "yAccessor", yAccessor)

  const streamProps: StreamGeoFrameProps = {
    projection,
    ...(points != null && { points: safeData }),
    ...(lineData && { lines: lineData, lineDataAccessor: "coordinates" }),
    xAccessor,
    yAccessor,
    pointIdAccessor: nodeIdAccessor,
    pointStyle: pointStyleFn,
    projectionTransform: cartogramConfig,
    ...(transitionDuration && { transition: { duration: transitionDuration } }),
    ...(graticule != null && { graticule }),
    ...(fitPadding != null && { fitPadding }),
    ...(zoomable && { zoomable: true }),
    ...(zoomExtent && { zoomExtent }),
    ...(onZoomProp && { onZoom: onZoomProp }),
    ...(dragRotate != null && { dragRotate }),
    ...(tileURL && { tileURL }),
    ...(tileAttribution && { tileAttribution }),
    ...(tileCacheSize && { tileCacheSize }),
    size: [resolved.width, resolved.height],
    margin: setup.margin,
    enableHover: resolved.enableHover,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltip),
    ...setup.legendBehaviorProps,
    ...buildCustomBehaviorProps({
      linkedHover,
      selection,
      onObservation,
      onClick,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
      linkedHoverInClickPredicate: false,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(props.autoPlaceAnnotations !== undefined && { autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(resolved.description && { description: resolved.description }),
    ...(resolved.summary && { summary: resolved.summary }),
    ...(resolved.accessibleTable !== undefined && { accessibleTable: resolved.accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    ...frameProps,
    // Preserve the prop contract before layout and replace it with the composed overlay afterward.
    foregroundGraphics: overlayGraphics
  }

  return (
    <SafeRender componentName="DistanceCartogram" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame ref={geoRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(props: DistanceCartogramProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
DistanceCartogram.displayName = "DistanceCartogram"
