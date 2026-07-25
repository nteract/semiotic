import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type {
  GeoCustomLayout,
  GeoLayoutContext,
} from "../stream/geoCustomLayout"
import type {
  GeoAreaSceneNode,
  GeoSceneNode,
} from "../stream/geoTypes"
import type { PointSceneNode, Style } from "../stream/types"
import { useCustomLayoutSelection } from "../stream/customLayoutSelection"

export type GeographicGridShape = "circle" | "square" | "hexagon"
export type GeographicGridSource = "auto" | "areas" | "points"

export interface GeographicGridInput<T = Datum> {
  datum: T
  /** Source-space x coordinate. Longitude or projected x both work. */
  x: number
  /** Source-space y coordinate. Latitude or projected y both work. */
  y: number
}

export interface GridifiedGeographicPoint<T = Datum>
  extends GeographicGridInput<T> {
  row: number
  column: number
}

export interface GridifyGeographicPointsOptions {
  /** Number of grid columns. Inferred from count and aspect ratio by default. */
  columns?: number
  /** Number of grid rows. Inferred from count and occupancy by default. */
  rows?: number
  /**
   * Target fraction of grid cells occupied when rows are inferred.
   * Extra cells preserve coastline/continental whitespace. @default 0.72
   */
  occupancy?: number
  /** Width / height of the intended display. @default 1.8 */
  aspectRatio?: number
}

type GridAccessor<T> = string | ((datum: T) => unknown)

export interface GeographicGridConfig {
  /** Prefer area features, point rows, or whichever source is populated. @default "auto" */
  source?: GeographicGridSource
  /**
   * Explicit grid placement. When both accessors return finite values, the
   * authored table is used instead of automatic geographic gridification.
   */
  rowAccessor?: GridAccessor<Datum>
  columnAccessor?: GridAccessor<Datum>
  /** Geographic point accessors used by automatic point gridification. */
  longitudeAccessor?: GridAccessor<Datum>
  latitudeAccessor?: GridAccessor<Datum>
  idAccessor?: GridAccessor<Datum>
  labelAccessor?: GridAccessor<Datum>
  categoryAccessor?: GridAccessor<Datum>
  /**
   * Optional quantitative size encoding. Mark area is proportional to this
   * value; omit it for equal-area geographic units.
   */
  sizeAccessor?: GridAccessor<Datum>
  /** Explicit size domain. Inferred from finite values by default. */
  sizeDomain?: [number, number]
  /**
   * Minimum/maximum mark radius as fractions of the available cell radius.
   * @default [0.36, 1]
   */
  sizeRange?: [number, number]
  /** Direct fill field/function. categoryAccessor + the chart palette is used otherwise. */
  fillAccessor?: GridAccessor<Datum>
  /** Additional per-mark style. */
  markStyle?: Style | ((datum: Datum, index: number) => Style)
  /** Mark geometry. @default "circle" */
  shape?: GeographicGridShape
  /** Grid columns for automatic placement. */
  columns?: number
  /** Grid rows for automatic placement. */
  rows?: number
  /** Target automatic-grid occupancy. @default 0.72 */
  occupancy?: number
  /** Fraction of each cell reserved between marks. @default 0.12 */
  cellPadding?: number
  /** Pixel inset around the complete grid. @default 8 */
  layoutPadding?: number
  /** Render labels over marks. @default true */
  showLabels?: boolean
  labelColor?: string
  labelFontSize?: number
  labelFontFamily?: string
  labelFontWeight?: number | string
  /** Maximum visible label length. @default 4 */
  maxLabelLength?: number
  /** Exclude records before placement. */
  filter?: (datum: Datum, index: number) => boolean
}

interface PositionedGridDatum {
  datum: Datum
  id: string
  label: string
  category?: string
  row: number
  column: number
  x: number
  y: number
  radius: number
  style: Style
}

const DEFAULT_OCCUPANCY = 0.72
const DEFAULT_ASPECT_RATIO = 1.8

function finitePositiveInteger(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) return undefined
  return Math.max(1, Math.round(value as number))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function finiteExtent(values: number[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    if (value < min) min = value
    if (value > max) max = value
  }
  return min === Infinity ? [0, 0] : [min, max]
}

function normalize(value: number, extent: [number, number]): number {
  const span = extent[1] - extent[0]
  return span === 0 ? 0.5 : (value - extent[0]) / span
}

/**
 * Snap geographic/projected points to unique cells while preserving their
 * coarse relative position. Edge points claim cells first, leaving central
 * clusters to absorb most of the unavoidable displacement.
 */
export function gridifyGeographicPoints<T>(
  input: GeographicGridInput<T>[],
  options: GridifyGeographicPointsOptions = {}
): GridifiedGeographicPoint<T>[] {
  const points = input
    .map((point, index) => ({ ...point, index }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  if (points.length === 0) return []

  const occupancy = clamp(
    Number.isFinite(options.occupancy)
      ? Number(options.occupancy)
      : DEFAULT_OCCUPANCY,
    0.2,
    1
  )
  const aspectRatio =
    Number.isFinite(options.aspectRatio) && Number(options.aspectRatio) > 0
      ? Number(options.aspectRatio)
      : DEFAULT_ASPECT_RATIO
  let columns = finitePositiveInteger(options.columns)
    ?? Math.max(1, Math.ceil(Math.sqrt((points.length * aspectRatio) / occupancy)))
  let rows = finitePositiveInteger(options.rows)
    ?? Math.max(1, Math.ceil(points.length / (columns * occupancy)))

  // Explicit dimensions should never silently drop data.
  if (columns * rows < points.length) {
    if (options.columns != null && options.rows == null) {
      rows = Math.ceil(points.length / columns)
    } else if (options.rows != null && options.columns == null) {
      columns = Math.ceil(points.length / rows)
    } else {
      rows = Math.ceil(points.length / columns)
    }
  }

  const xExtent = finiteExtent(points.map((point) => point.x))
  const yExtent = finiteExtent(points.map((point) => point.y))
  const desired = points.map((point) => ({
    ...point,
    desiredColumn: normalize(point.x, xExtent) * Math.max(0, columns - 1),
    desiredRow: normalize(point.y, yExtent) * Math.max(0, rows - 1),
  }))
  const centerColumn = (columns - 1) / 2
  const centerRow = (rows - 1) / 2

  desired.sort((a, b) => {
    const aEdge =
      (a.desiredColumn - centerColumn) ** 2
      + (a.desiredRow - centerRow) ** 2
    const bEdge =
      (b.desiredColumn - centerColumn) ** 2
      + (b.desiredRow - centerRow) ** 2
    return (
      bEdge - aEdge
      || a.desiredRow - b.desiredRow
      || a.desiredColumn - b.desiredColumn
      || a.index - b.index
    )
  })

  const available = new Set<number>()
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      available.add(row * columns + column)
    }
  }

  const assigned: Array<GridifiedGeographicPoint<T> & { index: number }> = []
  for (const point of desired) {
    let bestCell = -1
    let bestDistance = Infinity
    for (const cell of available) {
      const row = Math.floor(cell / columns)
      const column = cell % columns
      const distance =
        (column - point.desiredColumn) ** 2
        + (row - point.desiredRow) ** 2
      if (
        distance < bestDistance
        || (distance === bestDistance && cell < bestCell)
      ) {
        bestCell = cell
        bestDistance = distance
      }
    }
    if (bestCell < 0) continue
    available.delete(bestCell)
    assigned.push({
      datum: point.datum,
      x: point.x,
      y: point.y,
      row: Math.floor(bestCell / columns),
      column: bestCell % columns,
      index: point.index,
    })
  }

  assigned.sort((a, b) => a.index - b.index)
  return assigned.map(({ index: _index, ...point }) => point)
}

function readAccessor(
  datum: Datum,
  accessor: GridAccessor<Datum> | undefined,
  fallbacks: string[] = []
): unknown {
  if (typeof accessor === "function") return accessor(datum)
  if (typeof accessor === "string") return datum[accessor]
  for (const key of fallbacks) {
    if (datum[key] != null) return datum[key]
  }
  return undefined
}

function areaDatum(feature: GeoJSON.Feature, index: number): Datum {
  const properties =
    feature.properties && typeof feature.properties === "object"
      ? feature.properties
      : {}
  const id = feature.id ?? properties.id ?? properties.name ?? `area-${index}`
  return { ...properties, id: String(id) }
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
  const points: Array<[number, number]> = []
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + index * (Math.PI / 3)
    points.push([
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
    ])
  }
  return polygonPath(points)
}

function featureGridPoints(
  ctx: GeoLayoutContext<GeographicGridConfig>
): GeographicGridInput<Datum>[] {
  return ctx.areas
    .map((feature, index) => {
      const datum = areaDatum(feature, index)
      const centroid = ctx.scales.geoPath.centroid(feature)
      const inverted = Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])
        ? ctx.scales.invertedPoint(centroid[0], centroid[1])
        : null
      return {
        datum: {
          ...datum,
          gridLongitude: inverted?.[0],
          gridLatitude: inverted?.[1],
        },
        x: centroid[0],
        y: centroid[1],
      }
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
}

function pointGridPoints(
  ctx: GeoLayoutContext<GeographicGridConfig>
): GeographicGridInput<Datum>[] {
  return ctx.points
    .map((datum) => {
      const lon = Number(
        readAccessor(datum, ctx.config.longitudeAccessor, ["lon", "longitude"])
      )
      const lat = Number(
        readAccessor(datum, ctx.config.latitudeAccessor, ["lat", "latitude"])
      )
      const projected =
        Number.isFinite(lon) && Number.isFinite(lat)
          ? ctx.scales.projectedPoint(lon, lat)
          : null
      return {
        datum,
        x: projected?.[0] ?? NaN,
        y: projected?.[1] ?? NaN,
      }
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
}

function explicitGridPoints(
  data: Datum[],
  config: GeographicGridConfig
): GridifiedGeographicPoint<Datum>[] | null {
  if (!config.rowAccessor || !config.columnAccessor) return null
  const positioned = data
    .map((datum) => ({
      datum,
      x: Number(readAccessor(datum, config.columnAccessor)),
      y: Number(readAccessor(datum, config.rowAccessor)),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  if (positioned.length !== data.length) return null
  return positioned.map((point) => ({
    ...point,
    row: point.y,
    column: point.x,
  }))
}

/**
 * Geographic table/cartogram layout for `GeoCustomChart`.
 *
 * It accepts either authored row/column positions (state tile grids and other
 * known cartograms) or automatically gridifies projected point/area centroids.
 * Every result remains a native Geo scene node, retaining canvas rendering,
 * SSR, hit testing, keyboard navigation, tooltips, and shared selection.
 */
export const geographicGridLayout: GeoCustomLayout<GeographicGridConfig> = (
  ctx
) => {
  const config = ctx.config
  const source = config.source ?? "auto"
  const useAreas =
    source === "areas"
    || (source === "auto" && ctx.areas.length > 0)
  const rawData = useAreas
    ? featureGridPoints(ctx)
    : ctx.points.map((datum, index) => ({ datum, x: index, y: index }))
  const filtered = rawData.filter((point, index) =>
    config.filter ? config.filter(point.datum, index) : true
  )
  const explicit = explicitGridPoints(
    filtered.map((point) => point.datum),
    config
  )
  const sourcePoints = useAreas ? filtered : pointGridPoints({
    ...ctx,
    points: filtered.map((point) => point.datum),
  })
  const gridified = explicit ?? gridifyGeographicPoints(sourcePoints, {
    columns: config.columns,
    rows: config.rows,
    occupancy: config.occupancy,
    aspectRatio:
      ctx.dimensions.width / Math.max(1, ctx.dimensions.height),
  })
  if (gridified.length === 0) return { nodes: [] }

  const rowExtent = finiteExtent(gridified.map((point) => point.row))
  const columnExtent = finiteExtent(gridified.map((point) => point.column))
  const rowCount = Math.max(1, Math.round(rowExtent[1] - rowExtent[0]) + 1)
  const columnCount = Math.max(
    1,
    Math.round(columnExtent[1] - columnExtent[0]) + 1
  )
  const inset = Math.max(0, config.layoutPadding ?? 8)
  const availableWidth = Math.max(1, ctx.dimensions.width - inset * 2)
  const availableHeight = Math.max(1, ctx.dimensions.height - inset * 2)
  const cellWidth = availableWidth / columnCount
  const cellHeight = availableHeight / rowCount
  const gridWidth = cellWidth * columnCount
  const gridHeight = cellHeight * rowCount
  const originX = (ctx.dimensions.width - gridWidth) / 2
  const originY = (ctx.dimensions.height - gridHeight) / 2
  const padding = clamp(config.cellPadding ?? 0.12, 0, 0.8)
  const maxRadius = Math.max(
    1,
    Math.min(cellWidth, cellHeight) * 0.5 * (1 - padding)
  )
  const sizeValues = config.sizeAccessor
    ? gridified.map((point) =>
        Number(readAccessor(point.datum, config.sizeAccessor))
      )
    : []
  const sizeDomain = config.sizeDomain ?? finiteExtent(sizeValues)
  const sizeRange = config.sizeRange ?? [0.36, 1]
  const sizeMin = clamp(Math.min(sizeRange[0], sizeRange[1]), 0.05, 1)
  const sizeMax = clamp(Math.max(sizeRange[0], sizeRange[1]), sizeMin, 1)

  const positioned: PositionedGridDatum[] = gridified.map((point, index) => {
    const datum = {
      ...point.datum,
      gridRow: point.row,
      gridColumn: point.column,
    }
    const id = String(
      readAccessor(datum, config.idAccessor, ["id", "key", "name"])
      ?? `grid-${index}`
    )
    const rawLabel = String(
      readAccessor(datum, config.labelAccessor, [
        "abbr",
        "code",
        "label",
        "name",
        "id",
      ]) ?? id
    )
    const maxLabelLength = Math.max(1, config.maxLabelLength ?? 4)
    const label =
      rawLabel.length > maxLabelLength
        ? rawLabel.slice(0, maxLabelLength)
        : rawLabel
    const categoryValue = readAccessor(datum, config.categoryAccessor)
    const category =
      categoryValue == null ? undefined : String(categoryValue)
    const directFill = readAccessor(datum, config.fillAccessor)
    const baseFill =
      directFill != null
        ? String(directFill)
        : category
          ? ctx.resolveColor(category)
          : ctx.theme.categorical[0] ?? "#4f86c6"
    const sizeValue = config.sizeAccessor
      ? Number(readAccessor(datum, config.sizeAccessor))
      : NaN
    const t =
      config.sizeAccessor && Number.isFinite(sizeValue)
        ? Math.sqrt(clamp(normalize(sizeValue, sizeDomain), 0, 1))
        : 1
    const radius = maxRadius * (sizeMin + t * (sizeMax - sizeMin))
    const customStyle =
      typeof config.markStyle === "function"
        ? config.markStyle(datum, index)
        : config.markStyle
    return {
      datum,
      id,
      label,
      category,
      row: point.row,
      column: point.column,
      x:
        originX
        + (point.column - columnExtent[0] + 0.5) * cellWidth,
      y:
        originY
        + (point.row - rowExtent[0] + 0.5) * cellHeight,
      radius,
      style: {
        fill: baseFill,
        fillOpacity: 0.94,
        stroke: "rgba(255,255,255,0.9)",
        strokeWidth: 1,
        ...customStyle,
      },
    }
  })

  const shape = config.shape ?? "circle"
  const nodes: GeoSceneNode[] = positioned.map((mark) => {
    if (shape === "circle") {
      const node: PointSceneNode = {
        type: "point",
        x: mark.x,
        y: mark.y,
        r: mark.radius,
        style: mark.style,
        datum: mark.datum,
        accessibleDatum: mark.datum,
        accessibility: {
          label: mark.label,
          tableFields: {
            name: mark.datum.name ?? mark.label,
            label: mark.label,
            row: mark.row,
            column: mark.column,
            ...(mark.category ? { category: mark.category } : {}),
          },
        },
        pointId: mark.id,
        _transitionKey: mark.id,
      }
      return node
    }

    const pathData =
      shape === "hexagon"
        ? hexagonPath(mark.x, mark.y, mark.radius)
        : squarePath(mark.x, mark.y, mark.radius)
    const areaNode: GeoAreaSceneNode = {
      type: "geoarea",
      pathData,
      centroid: [mark.x, mark.y],
      bounds: [
        [mark.x - mark.radius, mark.y - mark.radius],
        [mark.x + mark.radius, mark.y + mark.radius],
      ],
      screenArea:
        shape === "hexagon"
          ? (3 * Math.sqrt(3) * mark.radius * mark.radius) / 2
          : (mark.radius * 2) ** 2,
      style: mark.style,
      datum: mark.datum,
      accessibleDatum: mark.datum,
      accessibility: {
        label: mark.label,
        tableFields: {
          name: mark.datum.name ?? mark.label,
          label: mark.label,
          row: mark.row,
          column: mark.column,
          ...(mark.category ? { category: mark.category } : {}),
        },
      },
      group: mark.category,
      interactive: true,
    }
    return areaNode
  })

  return {
    nodes,
    overlays:
      config.showLabels === false
        ? null
        : (
            <GeographicGridLabels
              marks={positioned}
              color={config.labelColor ?? "#ffffff"}
              fontSize={
                config.labelFontSize
                ?? clamp(Math.min(cellWidth, cellHeight) * 0.23, 7, 14)
              }
              fontFamily={config.labelFontFamily}
              fontWeight={config.labelFontWeight ?? 700}
            />
          ),
    restyle: (node, selection) => {
      if (!selection?.isActive || !node.datum) return { opacity: 1 }
      return {
        opacity: selection.predicate(node.datum) ? 1 : 0.18,
      }
    },
  }
}

function GeographicGridLabels({
  marks,
  color,
  fontSize,
  fontFamily,
  fontWeight,
}: {
  marks: PositionedGridDatum[]
  color: string
  fontSize: number
  fontFamily?: string
  fontWeight: number | string
}) {
  const selection = useCustomLayoutSelection()
  return (
    <g aria-hidden="true" pointerEvents="none">
      {marks.map((mark) => {
        const visible =
          !selection.isActive || selection.predicate(mark.datum)
        return (
          <text
            key={mark.id}
            x={mark.x}
            y={mark.y}
            fill={color}
            fontFamily={fontFamily}
            fontSize={fontSize}
            fontWeight={fontWeight}
            opacity={visible ? 1 : 0.18}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {mark.label}
          </text>
        )
      })}
    </g>
  )
}
