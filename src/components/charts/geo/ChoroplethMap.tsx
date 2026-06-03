"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, ProjectionProp } from "../../stream/geoTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizePartialMargin } from "../../types/marginType"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartSelection, useChartMode, useThemeSequential } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { useResolvedSelection } from "../shared/useResolvedSelection"
import { scaleSequential } from "d3-scale"
import {
  interpolateBlues,
  interpolateReds,
  interpolateGreens,
  interpolateViridis,
  interpolateOranges,
  interpolatePurples,
  interpolateGreys,
  interpolatePlasma,
  interpolateInferno,
  interpolateMagma,
  interpolateCividis,
  interpolateTurbo,
} from "../shared/colorPalettes"
import { extent } from "d3-array"
import type { Style } from "../../stream/types"
import { useReferenceAreas, type AreasProp } from "../../geo/useReferenceAreas"

// Sequential d3-scale-chromatic schemes. Covers every scheme name that a
// built-in SemioticTheme preset emits via `colors.sequential` (tufte →
// "oranges", pastels → "purples", playful → "viridis", etc.) so the theme
// fallback actually produces a different palette instead of silently
// reverting to `interpolateBlues`.
const SCHEME_MAP: Record<string, (t: number) => string> = {
  blues: interpolateBlues,
  reds: interpolateReds,
  greens: interpolateGreens,
  viridis: interpolateViridis,
  oranges: interpolateOranges,
  purples: interpolatePurples,
  greys: interpolateGreys,
  plasma: interpolatePlasma,
  inferno: interpolateInferno,
  magma: interpolateMagma,
  cividis: interpolateCividis,
  turbo: interpolateTurbo,
}

/**
 * ChoroplethMap component props
 */
export interface ChoroplethMapProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /**
   * Either a `GeoJSON.Feature[]` array (one feature per region) or a
   * reference string the library resolves into bundled topology:
   * `"world-110m"`, `"world-50m"`, `"land-110m"`, `"land-50m"`. To pass a
   * custom geography stored as a `FeatureCollection`, hand its `.features`
   * array in. Each feature's `properties` should carry the value
   * `valueAccessor` reads.
   * @example
   * ```ts
   * areas="world-110m"                  // bundled world borders
   * areas={features}                     // GeoJSON.Feature[]
   * areas={featureCollection.features}   // FeatureCollection → unwrap to .features
   * areas={mergeData(world, rows, { featureKey: "iso", dataKey: "iso" })}
   * ```
   */
  areas: AreasProp
  /**
   * Field name or function returning the numeric value for each feature.
   * Read from `feature.properties` after merging or directly off the
   * feature when values are baked in.
   */
  valueAccessor: ChartAccessor<TDatum, number>
  /** Sequential color scheme @default "blues" */
  colorScheme?: string
  /** Geographic projection @default "equalEarth" */
  projection?: ProjectionProp
  /** Show graticule grid lines */
  graticule?: boolean | import("../../stream/geoTypes").GraticuleConfig
  /** Tooltip config */
  tooltip?: TooltipProp
  /** Show legend @default true */
  showLegend?: boolean
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Padding fraction for auto-fit projection. 0.1 = 10% inset from edges. @default 0 */
  fitPadding?: number
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
  /** Fill opacity for area polygons. Useful for layering over tile basemaps. @default 1 */
  areaOpacity?: number
  /** Annotations */
  annotations?: Datum[]
  /** Passthrough to StreamGeoFrame */
  frameProps?: Partial<Omit<StreamGeoFrameProps, "areas" | "projection">>
}

/**
 * ChoroplethMap - Encode a numeric value per region with a sequential color scale.
 *
 * Each feature in `areas` is filled with a color derived from its
 * `valueAccessor` value, scaled across the data extent. For point-based
 * geographic data use {@link ProportionalSymbolMap}; for flow data use
 * {@link FlowMap}.
 *
 * @example
 * ```tsx
 * // World choropleth from a bundled topology, values merged in.
 * // `resolveReferenceGeography` is async, so resolve it in an effect
 * // before merging — or pass the reference string directly to `areas`
 * // if your topology already carries the values you need.
 * import * as React from "react"
 * import { ChoroplethMap, mergeData, resolveReferenceGeography } from "semiotic/geo"
 *
 * function WorldGDPMap({ gdpRows }) {
 *   const [areas, setAreas] = React.useState([])
 *   React.useEffect(() => {
 *     let cancelled = false
 *     resolveReferenceGeography("world-110m").then(world => {
 *       if (cancelled) return
 *       setAreas(mergeData(world, gdpRows, { featureKey: "iso_a3", dataKey: "iso" }))
 *     })
 *     return () => { cancelled = true }
 *   }, [gdpRows])
 *
 *   return (
 *     <ChoroplethMap
 *       areas={areas}
 *       valueAccessor={(f) => f.properties.gdp}
 *       colorScheme="viridis"
 *       projection="equalEarth"
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Custom GeoJSON + graticule + zoom/pan
 * <ChoroplethMap
 *   areas={statesGeoJson}
 *   valueAccessor="population_density"
 *   colorScheme="oranges"
 *   projection="albersUsa"
 *   graticule
 *   zoomable
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Tile basemap underlay (Mercator only) with semi-transparent areas
 * <ChoroplethMap
 *   areas={countiesGeoJson}
 *   valueAccessor="rate"
 *   projection="mercator"
 *   tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
 *   tileAttribution="© OpenStreetMap contributors"
 *   areaOpacity={0.7}
 * />
 * ```
 *
 * @remarks
 * The legend defaults to a sequential gradient legend matching the chosen
 * `colorScheme`. For diverging data (positive/negative around zero), use
 * a diverging scheme name and pass `frameProps={{ colorDomain: [-max, max] }}`.
 */
export function ChoroplethMap<TDatum extends Datum = Datum>(props: ChoroplethMapProps<TDatum>) {

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
  })

  // Color scheme resolution priority:
  //   explicit `colorScheme` prop > ambient theme's `colors.sequential` > "blues"
  // The destructure default is deliberately undefined so the theme hook's value
  // can still win over the fallback string below.
  const themeSequential = useThemeSequential()
  const {
    areas,
    valueAccessor,
    colorScheme: colorSchemeProp,
    projection = "equalEarth",
    graticule,
    fitPadding,
    zoomable: zoomableProp,
    zoomExtent,
    onZoom: onZoomProp,
    dragRotate,
    tileURL,
    tileAttribution,
    tileCacheSize,
    tooltip,
    areaOpacity = 1,
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
    frameProps = {},
    stroke,
    strokeWidth,
    opacity,
  } = props

  // Tile maps default to zoomable; non-tile maps default to not zoomable
  const zoomable = zoomableProp ?? (tileURL ? true : false)

  // Resolve string reference ("world-110m") or use features directly,
  // then drop `null`/non-object entries before validation and color
  // extraction. Loaders that emit a sparse `areas` array would
  // otherwise short-circuit the geometry sentinel check on a null
  // sample and crash the value-accessor map below.
  const resolvedAreasRaw = useReferenceAreas(areas)
  const resolvedAreas = useMemo(
    () => (resolvedAreasRaw ? filterSparseArray(resolvedAreasRaw) : resolvedAreasRaw),
    [resolvedAreasRaw],
  )

  // ── All hooks must be called unconditionally (before any early returns) ──

  const valAcc = useMemo(() =>
    typeof valueAccessor === "function"
      ? valueAccessor
      : (d: Datum) => d?.properties?.[valueAccessor] ?? d?.[valueAccessor],
    [valueAccessor]
  )

  const colorScheme = colorSchemeProp ?? themeSequential ?? "blues"

  // Build sequential color scale
  const colorScale = useMemo(() => {
    if (!resolvedAreas) return scaleSequential(interpolateBlues).domain([0, 1])
    const values = resolvedAreas.map(f => valAcc(f)).filter(v => v != null && isFinite(v))
    const [min, max] = extent(values) as [number, number]
    const interpolator = SCHEME_MAP[colorScheme] || interpolateBlues
    return scaleSequential(interpolator).domain([min ?? 0, max ?? 1])
  }, [resolvedAreas, valAcc, colorScheme])

  // Selection
  const { activeSelectionHook, customHoverBehavior, customClickBehavior } = useChartSelection({
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartType: "ChoroplethMap",
    chartId
  })

  const resolvedSelection = useResolvedSelection(selection)

  // Area style
  const areaStyleFn = useMemo(() => {
    const base = (d: Datum): Style => {
      const val = valAcc(d)
      return {
        fill: val != null && isFinite(val) ? colorScale(val) : "#ccc",
        stroke: "#999",
        strokeWidth: 0.5,
        fillOpacity: areaOpacity
      }
    }
    // Overlay top-level primitive props before selection wrap so they apply
    // to every region regardless of selection state.
    const withPrimitives = mergeShapeStyle(base, { stroke, strokeWidth, opacity }) as (d: Datum) => Style
    if (activeSelectionHook) {
      return wrapStyleWithSelection(withPrimitives, activeSelectionHook, resolvedSelection) as (d: Datum) => Style
    }
    return withPrimitives
  }, [valAcc, colorScale, activeSelectionHook, resolvedSelection, areaOpacity, stroke, strokeWidth, opacity])

  // Default tooltip — check both nested properties and flattened fields
  // (StreamGeoFrame flattens feature.properties onto the hover object)
  const defaultTooltip = useMemo(() => (d: Datum) => {
    const name = d?.properties?.name || d?.properties?.NAME || d?.name || d?.NAME || "Feature"
    const val = valAcc(d)

    const formatValue = (v: any): string => {
      if (typeof v !== "number" || !isFinite(v)) return String(v ?? "")
      if (Number.isInteger(v)) return v.toLocaleString()
      return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }

    return (
      <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {val != null && <div style={{ opacity: 0.7 }}>{formatValue(val)}</div>}
      </div>
    )
  }, [valAcc])

  const margin = useMemo(() => ({
    top: 10, right: 10, bottom: 10, left: 10,
    ...normalizePartialMargin(userMargin)
  }), [userMargin])

  // ── Loading / empty states (computed early, returned after all hooks) ───
  // The secondary fallback fires while `areas` is still resolving (e.g.
  // a "world-110m" reference geography being fetched). Thread
  // `loadingContent` through both calls so a `false` suppression OR
  // a custom node applies during the geo-resolution wait too.
  const loadingEl = renderLoadingState(loading, resolved.width, resolved.height, loadingContent)
    || (!resolvedAreas ? renderLoadingState(true, resolved.width, resolved.height, loadingContent) : null)
  const emptyEl = !loadingEl ? renderEmptyState(resolvedAreas, resolved.width, resolved.height, emptyContent) : null

  // Validate areas is a valid GeoJSON feature array.
  // We skip accessor validation here because valueAccessor resolves through
  // properties (d.properties[field]) which validateArrayData doesn't understand.
  if (Array.isArray(resolvedAreas) && resolvedAreas.length > 0) {
    const sample = resolvedAreas[0]
    if (!sample || typeof sample !== "object" || !sample.geometry) {
      return <ChartError componentName="ChoroplethMap" message="ChoroplethMap: areas must be an array of GeoJSON Features with a geometry property." width={resolved.width} height={resolved.height} />
    }
  }

  const streamProps: StreamGeoFrameProps = {
    projection,
    areas: resolvedAreas!,
    areaStyle: areaStyleFn,
    size: [resolved.width, resolved.height],
    margin,
    enableHover: true,
    tooltipContent: tooltip === false ? () => null : tooltip === true ? defaultTooltip : (normalizeTooltip(tooltip) || defaultTooltip),
    ...(graticule != null && { graticule }),
    ...(fitPadding != null && { fitPadding }),
    ...(zoomable && { zoomable: true }),
    ...(zoomExtent && { zoomExtent }),
    ...(onZoomProp && { onZoom: onZoomProp }),
    ...(dragRotate != null && { dragRotate }),
    ...(tileURL && { tileURL }),
    ...(tileAttribution && { tileAttribution }),
    ...(tileCacheSize && { tileCacheSize }),
    ...((linkedHover || onObservation || onClick) && { customHoverBehavior }),
    ...((onObservation || onClick) && { customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(props.autoPlaceAnnotations !== undefined && { autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(resolved.description && { description: resolved.description }),
    ...(resolved.summary && { summary: resolved.summary }),
    ...(resolved.accessibleTable !== undefined && { accessibleTable: resolved.accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="ChoroplethMap" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame {...streamProps} />
    </SafeRender>
  )
}
ChoroplethMap.displayName = "ChoroplethMap"
