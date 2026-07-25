import * as React from "react"
import { geoBounds, geoContains } from "d3-geo"
import type { Datum } from "../charts/shared/datumTypes"
import type {
  GeoCustomLayout,
  GeoLayoutContext,
} from "../stream/geoCustomLayout"
import type {
  GeoAreaSceneNode,
  GeoScales,
  GeoSceneNode,
} from "../stream/geoTypes"
import type { PointSceneNode, Style } from "../stream/types"

export type GeographicDotGridShape = "circle" | "square" | "hexagon"
export type GeographicDotGridAccessor =
  | string
  | ((datum: GeographicDotGridDatum, index: number) => unknown)

export interface GeographicDotGridDatum extends Datum {
  /** Stable source feature identity. */
  featureId: string
  /** Source feature position in the filtered areas array. */
  featureIndex: number
  /** Grid position in the chart-wide lattice. */
  gridRow: number
  gridColumn: number
  /** Geographic location obtained by inverting the sampled cell center. */
  longitude: number
  latitude: number
  /** Stable index among the retained, in-mask dots. */
  dotIndex: number
}

export interface GeographicDotGridSampleOptions {
  /** Approximate pixel width/height of one lattice cell. @default 10 */
  cellSize?: number
  /**
   * Alternative density control: number of lattice columns across the
   * projected geographic bounds. Takes precedence over cellSize.
   */
  columns?: number
  /** Pixel inset applied to the geographic sampling bounds. @default 0 */
  layoutPadding?: number
  /** Chart-space lattice origin. Stable origins make resize transitions predictable. */
  gridOrigin?: [number, number]
  /**
   * Maximum candidate cells tested. Coarser spacing is chosen automatically
   * when the requested lattice would exceed this guard. @default 25000
   */
  maxSamples?: number
  /** Exclude source features before their projected bounds are sampled. */
  featureFilter?: (feature: GeoJSON.Feature, index: number) => boolean
  /** Exclude retained dots after feature attribution. */
  dotFilter?: (datum: GeographicDotGridDatum, index: number) => boolean
}

export interface GeographicDotGridConfig
  extends GeographicDotGridSampleOptions {
  /** Geometry emitted for each occupied lattice cell. @default "circle" */
  shape?: GeographicDotGridShape
  /** Radius in pixels. Overrides radiusRatio. */
  dotRadius?: number
  /** Radius as a fraction of cellSize. @default 0.24 */
  radiusRatio?: number
  /** Direct fill field/function. categoryAccessor + the chart palette is used otherwise. */
  fillAccessor?: GeographicDotGridAccessor
  categoryAccessor?: GeographicDotGridAccessor
  /** Additional per-dot style. */
  markStyle?:
    | Style
    | ((datum: GeographicDotGridDatum, index: number) => Style)
  /** Draw faint source boundaries over the dot field. @default false */
  showOutline?: boolean
  outlineStyle?: Style
}

interface GeographicDotGridSampleResult {
  dots: GeographicDotGridDatum[]
  cellSize: number
  features: GeoJSON.Feature[]
}

interface GeographicFeatureMask {
  feature: GeoJSON.Feature
  index: number
  bounds: [[number, number], [number, number]] | null
}

const DEFAULT_CELL_SIZE = 10
const DEFAULT_MAX_SAMPLES = 25_000
const MAX_LAYOUT_CACHE_ENTRIES = 12
const layoutSampleCache = new WeakMap<
  GeoJSON.Feature[],
  Map<string, GeographicDotGridSampleResult>
>()
const featureBoundsCache = new WeakMap<
  GeoJSON.Feature,
  [[number, number], [number, number]] | null
>()
const callbackIds = new WeakMap<object, number>()
let nextCallbackId = 1

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function finitePositive(value: number | undefined): number | undefined {
  if (!Number.isFinite(value) || Number(value) <= 0) return undefined
  return Number(value)
}

function readAccessor(
  datum: GeographicDotGridDatum,
  accessor: GeographicDotGridAccessor | undefined
): unknown {
  if (typeof accessor === "function") return accessor(datum, datum.dotIndex)
  if (typeof accessor === "string") return datum[accessor]
  return undefined
}

function featureProperties(feature: GeoJSON.Feature): Datum {
  return feature.properties && typeof feature.properties === "object"
    ? { ...feature.properties }
    : {}
}

function featureIdentity(feature: GeoJSON.Feature, index: number): string {
  const properties = featureProperties(feature)
  return String(
    feature.id
    ?? properties.id
    ?? properties.name
    ?? `feature-${index}`
  )
}

function finiteBounds(
  features: GeoJSON.Feature[],
  geoPath: GeoScales["geoPath"]
): [[number, number], [number, number]] | null {
  if (features.length === 0) return null
  const collection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  }
  const bounds = geoPath.bounds(collection)
  if (
    !Number.isFinite(bounds[0][0])
    || !Number.isFinite(bounds[0][1])
    || !Number.isFinite(bounds[1][0])
    || !Number.isFinite(bounds[1][1])
  ) {
    return null
  }
  return bounds
}

function latticeRange(
  min: number,
  max: number,
  origin: number,
  cellSize: number
): [number, number] {
  return [
    Math.ceil((min - origin) / cellSize - 0.5),
    Math.floor((max - origin) / cellSize - 0.5),
  ]
}

function callbackIdentity(callback: object | undefined): number {
  if (!callback) return 0
  const cached = callbackIds.get(callback)
  if (cached) return cached
  const id = nextCallbackId
  nextCallbackId += 1
  callbackIds.set(callback, id)
  return id
}

function featureMasks(features: GeoJSON.Feature[]): GeographicFeatureMask[] {
  return features.map((feature, index) => {
    if (featureBoundsCache.has(feature)) {
      return {
        feature,
        index,
        bounds: featureBoundsCache.get(feature) ?? null,
      }
    }
    try {
      const bounds = geoBounds(feature)
      featureBoundsCache.set(feature, bounds)
      return {
        feature,
        index,
        bounds,
      }
    } catch {
      featureBoundsCache.set(feature, null)
      return { feature, index, bounds: null }
    }
  })
}

function longitudeWithinBounds(
  longitude: number,
  west: number,
  east: number
): boolean {
  return west <= east
    ? longitude >= west && longitude <= east
    : longitude >= west || longitude <= east
}

function locationWithinFeatureBounds(
  location: [number, number],
  bounds: [[number, number], [number, number]] | null
): boolean {
  if (!bounds) return true
  return (
    location[1] >= bounds[0][1]
    && location[1] <= bounds[1][1]
    && longitudeWithinBounds(location[0], bounds[0][0], bounds[1][0])
  )
}

function containingFeature(
  masks: GeographicFeatureMask[],
  location: [number, number]
): { feature: GeoJSON.Feature; index: number } | null {
  for (const mask of masks) {
    const { feature, index } = mask
    if (!feature.geometry) continue
    if (!locationWithinFeatureBounds(location, mask.bounds)) continue
    try {
      if (geoContains(feature, location)) return { feature, index }
    } catch {
      // Invalid source geometry should not prevent other features from sampling.
    }
  }
  return null
}

/**
 * Sample fitted geographic polygons onto a chart-space lattice.
 *
 * Each candidate cell center is inverted through the active projection and
 * retained only when it falls inside a source feature. The result is useful
 * independently of React for inspecting density or composing custom layouts.
 */
export function sampleGeographicDotGrid(
  areas: GeoJSON.Feature[],
  scales: Pick<GeoScales, "geoPath" | "invertedPoint">,
  dimensions: { width: number; height: number },
  options: GeographicDotGridSampleOptions = {}
): GeographicDotGridSampleResult {
  const features = areas.filter((feature, index) =>
    feature.geometry
    && (options.featureFilter
      ? options.featureFilter(feature, index)
      : true)
  )
  const rawBounds = finiteBounds(features, scales.geoPath)
  if (!rawBounds) {
    return { dots: [], cellSize: DEFAULT_CELL_SIZE, features }
  }

  const padding = Math.max(0, options.layoutPadding ?? 0)
  const bounds: [[number, number], [number, number]] = [
    [
      clamp(rawBounds[0][0], padding, Math.max(padding, dimensions.width - padding)),
      clamp(rawBounds[0][1], padding, Math.max(padding, dimensions.height - padding)),
    ],
    [
      clamp(rawBounds[1][0], padding, Math.max(padding, dimensions.width - padding)),
      clamp(rawBounds[1][1], padding, Math.max(padding, dimensions.height - padding)),
    ],
  ]
  const boundsWidth = Math.max(0, bounds[1][0] - bounds[0][0])
  const boundsHeight = Math.max(0, bounds[1][1] - bounds[0][1])
  if (boundsWidth === 0 || boundsHeight === 0) {
    return { dots: [], cellSize: DEFAULT_CELL_SIZE, features }
  }

  const requestedColumns = finitePositive(options.columns)
  let cellSize = Math.max(
    2,
    requestedColumns
      ? boundsWidth / requestedColumns
      : finitePositive(options.cellSize) ?? DEFAULT_CELL_SIZE
  )
  const maxSamples = Math.max(
    100,
    Math.round(finitePositive(options.maxSamples) ?? DEFAULT_MAX_SAMPLES)
  )
  const estimatedSamples =
    Math.ceil(boundsWidth / cellSize)
    * Math.ceil(boundsHeight / cellSize)
  if (estimatedSamples > maxSamples) {
    cellSize *= Math.sqrt(estimatedSamples / maxSamples)
  }

  const originX = options.gridOrigin?.[0] ?? 0
  const originY = options.gridOrigin?.[1] ?? 0
  const [firstColumn, lastColumn] = latticeRange(
    bounds[0][0],
    bounds[1][0],
    originX,
    cellSize
  )
  const [firstRow, lastRow] = latticeRange(
    bounds[0][1],
    bounds[1][1],
    originY,
    cellSize
  )
  const dots: GeographicDotGridDatum[] = []
  const masks = featureMasks(features)

  for (let row = firstRow; row <= lastRow; row += 1) {
    const y = originY + (row + 0.5) * cellSize
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const x = originX + (column + 0.5) * cellSize
      const location = scales.invertedPoint(x, y)
      if (
        !location
        || !Number.isFinite(location[0])
        || !Number.isFinite(location[1])
      ) {
        continue
      }
      const containing = containingFeature(masks, location)
      if (!containing) continue
      const properties = featureProperties(containing.feature)
      const dot: GeographicDotGridDatum = {
        ...properties,
        featureId: featureIdentity(containing.feature, containing.index),
        featureIndex: containing.index,
        gridRow: row,
        gridColumn: column,
        longitude: location[0],
        latitude: location[1],
        dotIndex: dots.length,
      }
      if (options.dotFilter && !options.dotFilter(dot, dots.length)) continue
      dots.push(dot)
    }
  }

  return { dots, cellSize, features }
}

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

function coordinateFingerprint(
  value: [number, number] | null | undefined
): string {
  return value
    ? `${rounded(value[0])},${rounded(value[1])}`
    : "null"
}

function projectionFingerprint(ctx: GeoLayoutContext<GeographicDotGridConfig>): string {
  const projection = ctx.scales.projection
  const samples: Array<[number, number]> = [
    [0, 0],
    [-120, 35],
    [45, 45],
    [120, -30],
  ]
  return [
    rounded(projection.scale()),
    coordinateFingerprint(projection.translate() as [number, number]),
    coordinateFingerprint(projection.center() as [number, number]),
    (projection.rotate() as number[]).map(rounded).join(","),
    projection.clipAngle?.() ?? "clip",
    projection.precision?.() ?? "precision",
    ...samples.map(([longitude, latitude]) =>
      coordinateFingerprint(ctx.scales.projectedPoint(longitude, latitude))
    ),
  ].join("|")
}

function layoutSampleCacheKey(
  ctx: GeoLayoutContext<GeographicDotGridConfig>
): string {
  const config = ctx.config
  return [
    ctx.areas.length,
    ctx.dimensions.width,
    ctx.dimensions.height,
    config.cellSize ?? "",
    config.columns ?? "",
    config.layoutPadding ?? "",
    config.gridOrigin?.join(",") ?? "",
    config.maxSamples ?? "",
    callbackIdentity(config.featureFilter),
    callbackIdentity(config.dotFilter),
    projectionFingerprint(ctx),
  ].join("::")
}

function cachedLayoutSample(
  ctx: GeoLayoutContext<GeographicDotGridConfig>
): GeographicDotGridSampleResult {
  let cache = layoutSampleCache.get(ctx.areas)
  if (!cache) {
    cache = new Map()
    layoutSampleCache.set(ctx.areas, cache)
  }
  const key = layoutSampleCacheKey(ctx)
  const cached = cache.get(key)
  if (cached) return cached

  const sampled = sampleGeographicDotGrid(
    ctx.areas,
    ctx.scales,
    ctx.dimensions,
    ctx.config
  )
  if (cache.size >= MAX_LAYOUT_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, sampled)
  return sampled
}

function polygonPath(points: Array<[number, number]>): string {
  return `${points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`)
    .join("")}Z`
}

function squarePath(x: number, y: number, radius: number): string {
  return polygonPath([
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x + radius, y + radius],
    [x - radius, y + radius],
  ])
}

function hexagonPath(x: number, y: number, radius: number): string {
  return polygonPath(
    Array.from({ length: 6 }, (_, index) => {
      const angle = -Math.PI / 2 + index * (Math.PI / 3)
      return [
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
      ] as [number, number]
    })
  )
}

/**
 * Polygon-to-lattice mask for `GeoCustomChart`.
 *
 * Unlike a tile cartogram, this retains the projected land silhouette: every
 * occupied screen-space grid cell becomes a small circle, square, or hexagon.
 */
export const geographicDotGridLayout: GeoCustomLayout<GeographicDotGridConfig> = (
  ctx
) => {
  const sampled = cachedLayoutSample(ctx)
  const config = ctx.config
  const shape = config.shape ?? "circle"
  const radius = Math.max(
    0.5,
    finitePositive(config.dotRadius)
    ?? sampled.cellSize * clamp(config.radiusRatio ?? 0.24, 0.05, 0.5)
  )
  const originX = config.gridOrigin?.[0] ?? 0
  const originY = config.gridOrigin?.[1] ?? 0

  const nodes: GeoSceneNode[] = sampled.dots.map((datum, index) => {
    const x = originX + (datum.gridColumn + 0.5) * sampled.cellSize
    const y = originY + (datum.gridRow + 0.5) * sampled.cellSize
    const categoryValue = readAccessor(datum, config.categoryAccessor)
    const directFill = readAccessor(datum, config.fillAccessor)
    const fill =
      directFill != null
        ? String(directFill)
        : categoryValue != null
          ? ctx.resolveColor(String(categoryValue))
          : ctx.theme.categorical[0] ?? "#4f86c6"
    const customStyle =
      typeof config.markStyle === "function"
        ? config.markStyle(datum, index)
        : config.markStyle
    const style: Style = {
      fill,
      fillOpacity: 0.92,
      strokeWidth: 0,
      ...customStyle,
    }
    const id = `dot-${datum.gridRow}-${datum.gridColumn}`

    if (shape === "circle") {
      const node: PointSceneNode = {
        type: "point",
        x,
        y,
        r: radius,
        style,
        datum,
        interactive: false,
        pointId: id,
        _transitionKey: id,
      }
      return node
    }

    const pathData =
      shape === "hexagon"
        ? hexagonPath(x, y, radius)
        : squarePath(x, y, radius)
    const node: GeoAreaSceneNode = {
      type: "geoarea",
      pathData,
      centroid: [x, y],
      bounds: [
        [x - radius, y - radius],
        [x + radius, y + radius],
      ],
      screenArea:
        shape === "hexagon"
          ? (3 * Math.sqrt(3) * radius * radius) / 2
          : (radius * 2) ** 2,
      style,
      datum,
      group: datum.featureId,
      interactive: false,
    }
    return node
  })

  return {
    nodes,
    overlays: config.showOutline ? (
      <g aria-hidden="true" pointerEvents="none">
        {sampled.features.map((feature, index) => {
          const pathData = ctx.scales.geoPath(feature)
          return pathData ? (
            <path
              key={featureIdentity(feature, index)}
              d={pathData}
              fill="none"
              stroke={config.outlineStyle?.stroke ?? "currentColor"}
              strokeOpacity={
                config.outlineStyle?.opacity
                ?? config.outlineStyle?.fillOpacity
                ?? 0.22
              }
              strokeWidth={config.outlineStyle?.strokeWidth ?? 0.7}
              strokeDasharray={config.outlineStyle?.strokeDasharray}
              strokeLinecap={config.outlineStyle?.strokeLinecap}
              vectorEffect="non-scaling-stroke"
            />
          ) : null
        })}
      </g>
    ) : null,
    restyle: (node, selection) => {
      if (!selection?.isActive || !node.datum) return { opacity: 1 }
      return {
        opacity: selection.predicate(node.datum) ? 1 : 0.14,
      }
    },
  }
}
