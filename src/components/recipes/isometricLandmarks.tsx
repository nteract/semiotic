import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type {
  GeoCustomLayout,
  GeoLayoutContext,
} from "../stream/geoCustomLayout"
import type { GeoAreaSceneNode } from "../stream/geoTypes"
import { useCustomLayoutSelection } from "../stream/customLayoutSelection"

export type LandmarkKind =
  | "city"
  | "culture"
  | "monument"
  | "faith"
  | "nature"
  | "knowledge"
  | "defense"
  | "arena"
  | "transport"

export type IsometricTerrainKind =
  | "land"
  | "ocean"
  | "forest"
  | "grassland"
  | "cropland"
  | "wetland"
  | "urban"
  | "scrub"
  | "bare"
  | "snow"

export interface IsometricTerrainCell {
  kind: IsometricTerrainKind
  /** Fraction of the geographic cell covered by this terrain, from 0 to 1. */
  coverage?: number
  /** Optional per-cell color override. */
  fill?: string
}

export interface IsometricLandmarkConfig {
  /** Geographic center represented by the middle grid cell. */
  center: { lon: number; lat: number }
  /** Datum id forced into the middle cell. */
  centerId?: string
  /** Odd number of rows/columns. @default 5 */
  gridSize?: number
  /** Half-width of the local square represented by the board. @default 75 */
  gridRadiusKm?: number
  /** Isometric tile dimensions in pixels. @default 80×40 */
  tileWidth?: number
  tileHeight?: number
  /** Source-data accessors. */
  idAccessor?: string | ((d: Datum) => string)
  nameAccessor?: string | ((d: Datum) => string)
  longitudeAccessor?: string | ((d: Datum) => number)
  latitudeAccessor?: string | ((d: Datum) => number)
  kindAccessor?: string | ((d: Datum) => LandmarkKind)
  /** Lower values win when live and fallback candidates share a cell. */
  candidatePriorityAccessor?: string | ((d: Datum) => number)
  /** Optional replacement sprite URLs. Transparent PNGs work best. */
  sprites?: Partial<Record<LandmarkKind, string>>
  /** Rendered resource sprite size. @default 32 */
  resourceSpriteSize?: number
  /** Rendered major-city sprite size. @default 64 */
  citySpriteSize?: number
  /** Civ-style terrain palette. */
  terrainColors?: string[]
  /** Geographic terrain classification keyed by `tile-{row}-{column}`. */
  terrainByCell?: Record<
    string,
    IsometricTerrainKind | IsometricTerrainCell
  >
  /** Civ-style colors used for classified terrain cells. */
  terrainPalette?: Partial<Record<IsometricTerrainKind, string>>
  tileStroke?: string
  showCityLabel?: boolean
}

export interface IsometricLandmarkTile {
  id: string
  row: number
  column: number
  centerXKm: number
  centerYKm: number
  terrainIndex: number
  landmark: (Datum & {
    id: string
    name: string
    kind: LandmarkKind
    lon: number
    lat: number
    distanceKm: number
  }) | null
  /** All candidates assigned to the cell, with the displayed landmark first. */
  landmarks: Array<Datum & {
    id: string
    name: string
    kind: LandmarkKind
    lon: number
    lat: number
    distanceKm: number
  }>
}

export const DEFAULT_ISOMETRIC_SPRITE_SIZES = {
  resource: 32,
  city: 64,
} as const

const DEFAULT_TERRAIN = ["#739b58", "#83a964", "#668d52", "#8baa68"]
const DEFAULT_CLASSIFIED_TERRAIN: Record<IsometricTerrainKind, string> = {
  land: "#78985c",
  ocean: "#4d8192",
  forest: "#4f7c4b",
  grassland: "#8eaa68",
  cropland: "#a6a568",
  wetland: "#668f79",
  urban: "#8d8a72",
  scrub: "#9b9665",
  bare: "#aa906a",
  snow: "#d8ddcf",
}
const TERRAIN_LABELS: Record<IsometricTerrainKind, string> = {
  land: "Open land",
  ocean: "Open ocean",
  forest: "Forest",
  grassland: "Grassland",
  cropland: "Cropland",
  wetland: "Wetland",
  urban: "Urban district",
  scrub: "Scrubland",
  bare: "Bare ground",
  snow: "Snow cover",
}
const VALID_KINDS = new Set<LandmarkKind>([
  "city",
  "culture",
  "monument",
  "faith",
  "nature",
  "knowledge",
  "defense",
  "arena",
  "transport",
])

function accessor<T>(
  value: string | ((d: Datum) => T) | undefined,
  fallback: string
): (d: Datum) => T {
  if (typeof value === "function") return value
  const key = value ?? fallback
  return (d: Datum) => d[key] as T
}

function localOffsetKm(
  lon: number,
  lat: number,
  center: { lon: number; lat: number }
): [number, number] {
  const meanLatitude = ((lat + center.lat) / 2) * (Math.PI / 180)
  const x = (lon - center.lon) * 111.32 * Math.cos(meanLatitude)
  const y = (lat - center.lat) * 110.574
  return [x, y]
}

function normalizeGridSize(value: number | undefined): number {
  const rounded = Math.max(3, Math.round(value ?? 5))
  return rounded % 2 === 0 ? rounded + 1 : rounded
}

function normalizeKind(value: unknown): LandmarkKind {
  return VALID_KINDS.has(value as LandmarkKind)
    ? value as LandmarkKind
    : "monument"
}

/**
 * Quantize geographic landmarks into an odd square grid and choose one
 * representative per cell. Selection balances proximity to the cell center
 * with category reuse so a dense class does not consume the whole board.
 */
export function selectIsometricLandmarks(
  points: Datum[],
  config: IsometricLandmarkConfig
): IsometricLandmarkTile[] {
  const gridSize = normalizeGridSize(config.gridSize)
  const radius = Math.max(1, config.gridRadiusKm ?? 75)
  const cellSpan = (radius * 2) / gridSize
  const middle = Math.floor(gridSize / 2)
  const getId = accessor<string>(config.idAccessor, "id")
  const getName = accessor<string>(config.nameAccessor, "name")
  const getLon = accessor<number>(config.longitudeAccessor, "lon")
  const getLat = accessor<number>(config.latitudeAccessor, "lat")
  const getKind = accessor<LandmarkKind>(config.kindAccessor, "kind")
  const getPriority = config.candidatePriorityAccessor
    ? accessor<number>(config.candidatePriorityAccessor, "priority")
    : () => 0

  type Candidate = NonNullable<IsometricLandmarkTile["landmark"]> & {
    row: number
    column: number
    cellDistanceSq: number
    candidatePriority: number
  }
  const candidatesByCell = new Map<string, Candidate[]>()
  let centerCandidate: Candidate | null = null

  for (const point of points) {
    const lon = Number(getLon(point))
    const lat = Number(getLat(point))
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    const id = String(getId(point) ?? `${lon},${lat}`)
    const name = String(getName(point) ?? id)
    const kind = normalizeKind(getKind(point))
    const [xKm, yKm] = localOffsetKm(lon, lat, config.center)
    if (Math.abs(xKm) > radius || Math.abs(yKm) > radius) continue

    const column = Math.min(
      gridSize - 1,
      Math.max(0, Math.floor((xKm + radius) / cellSpan))
    )
    const row = Math.min(
      gridSize - 1,
      Math.max(0, Math.floor((radius - yKm) / cellSpan))
    )
    const cellCenterX = -radius + (column + 0.5) * cellSpan
    const cellCenterY = radius - (row + 0.5) * cellSpan
    const candidate: Candidate = {
      ...point,
      id,
      name,
      kind,
      lon,
      lat,
      distanceKm: Math.sqrt(xKm * xKm + yKm * yKm),
      row,
      column,
      cellDistanceSq:
        (xKm - cellCenterX) ** 2 + (yKm - cellCenterY) ** 2,
      candidatePriority: Number(getPriority(point)) || 0,
    }

    const isConfiguredCenter = config.centerId != null && id === config.centerId
    if (
      isConfiguredCenter ||
      (!centerCandidate && kind === "city") ||
      (!centerCandidate && row === middle && column === middle)
    ) {
      centerCandidate = candidate
    }

    const key = `${row}:${column}`
    const candidates = candidatesByCell.get(key) ?? []
    candidates.push(candidate)
    candidatesByCell.set(key, candidates)
  }

  const kindUsage = new Map<LandmarkKind, number>()
  if (centerCandidate) kindUsage.set("city", 1)
  const tiles: IsometricLandmarkTile[] = []

  for (let row = 0; row < gridSize; row++) {
    for (let column = 0; column < gridSize; column++) {
      const id = `tile-${row}-${column}`
      const centerXKm = -radius + (column + 0.5) * cellSpan
      const centerYKm = radius - (row + 0.5) * cellSpan
      let landmark: IsometricLandmarkTile["landmark"] = null
      let landmarks: IsometricLandmarkTile["landmarks"] = []

      if (row === middle && column === middle && centerCandidate) {
        landmark = centerCandidate
        const otherCandidates = (candidatesByCell.get(`${row}:${column}`) ?? [])
          .filter((candidate) => candidate.id !== centerCandidate?.id)
          .sort((a, b) =>
            a.candidatePriority - b.candidatePriority
            || a.cellDistanceSq - b.cellDistanceSq
            || a.name.localeCompare(b.name)
          )
        landmarks = [centerCandidate, ...otherCandidates]
      } else {
        const options = candidatesByCell.get(`${row}:${column}`) ?? []
        const withoutCenter = options.filter((candidate) => candidate.id !== centerCandidate?.id)
        withoutCenter.sort((a, b) => {
          const priorityDifference =
            a.candidatePriority - b.candidatePriority
          if (priorityDifference !== 0) return priorityDifference

          const aReuse = kindUsage.get(a.kind) ?? 0
          const bReuse = kindUsage.get(b.kind) ?? 0
          const diversityWeight = cellSpan * cellSpan * 0.35
          const aScore =
            a.cellDistanceSq +
            aReuse * diversityWeight
          const bScore =
            b.cellDistanceSq +
            bReuse * diversityWeight
          return aScore - bScore || a.name.localeCompare(b.name)
        })
        landmark = withoutCenter[0] ?? null
        landmarks = withoutCenter
      }

      if (landmark) {
        kindUsage.set(landmark.kind, (kindUsage.get(landmark.kind) ?? 0) + 1)
      }
      tiles.push({
        id,
        row,
        column,
        centerXKm,
        centerYKm,
        terrainIndex: Math.abs((row * 17 + column * 31) % DEFAULT_TERRAIN.length),
        landmark,
        landmarks,
      })
    }
  }

  return tiles
}

function diamondPath(cx: number, cy: number, width: number, height: number): string {
  return [
    `M${cx},${cy - height / 2}`,
    `L${cx + width / 2},${cy}`,
    `L${cx},${cy + height / 2}`,
    `L${cx - width / 2},${cy}`,
    "Z",
  ].join("")
}

/**
 * Isometric landmark board for `GeoCustomChart`.
 */
export const isometricLandmarkLayout: GeoCustomLayout<IsometricLandmarkConfig> = (
  ctx: GeoLayoutContext<IsometricLandmarkConfig>
) => {
  const gridSize = normalizeGridSize(ctx.config.gridSize)
  const tileWidth = Math.max(20, ctx.config.tileWidth ?? 80)
  const tileHeight = Math.max(10, ctx.config.tileHeight ?? 40)
  const terrain = ctx.config.terrainColors?.length
    ? ctx.config.terrainColors
    : DEFAULT_TERRAIN
  const boardHeight = gridSize * tileHeight
  const originX = ctx.dimensions.width / 2
  const originY = (ctx.dimensions.height - boardHeight) / 2 + tileHeight / 2
  const tiles = selectIsometricLandmarks(ctx.points, ctx.config)

  const positioned = tiles.map((tile) => ({
    ...tile,
    x: originX + (tile.column - tile.row) * (tileWidth / 2),
    y: originY + (tile.column + tile.row) * (tileHeight / 2),
  }))

  const nodes: GeoAreaSceneNode[] = positioned.map((tile) => {
    const terrainCell = ctx.config.terrainByCell?.[tile.id]
    const resolvedTerrain = typeof terrainCell === "string"
      ? { kind: terrainCell }
      : terrainCell
    // Keep the major-city platform visually legible even when a coarse coastal
    // cell is water-dominant (for example central San Francisco).
    const terrainKind: IsometricTerrainKind = tile.landmark?.kind === "city"
      ? "urban"
      : resolvedTerrain?.kind ?? "land"
    const classifiedFill = resolvedTerrain?.fill
      ?? ctx.config.terrainPalette?.[terrainKind]
      ?? DEFAULT_CLASSIFIED_TERRAIN[terrainKind]
    const datum = tile.landmark
      ? {
          ...tile.landmark,
          gridRow: tile.row,
          gridColumn: tile.column,
          cellId: tile.id,
          terrainKind,
          terrainCoverage: resolvedTerrain?.coverage,
          features: tile.landmarks,
          featureCount: tile.landmarks.length,
        }
      : {
          id: tile.id,
          name: TERRAIN_LABELS[terrainKind],
          kind: "terrain",
          terrainKind,
          terrainCoverage: resolvedTerrain?.coverage,
          gridRow: tile.row,
          gridColumn: tile.column,
          cellId: tile.id,
          features: [],
          featureCount: 0,
        }
    return {
      type: "geoarea",
      pathData: diamondPath(tile.x, tile.y, tileWidth, tileHeight),
      centroid: [tile.x, tile.y],
      bounds: [
        [tile.x - tileWidth / 2, tile.y - tileHeight / 2],
        [tile.x + tileWidth / 2, tile.y + tileHeight / 2],
      ],
      screenArea: (tileWidth * tileHeight) / 2,
      style: {
        fill: resolvedTerrain || terrainKind === "urban"
          ? classifiedFill
          : terrain[tile.terrainIndex % terrain.length],
        stroke: terrainKind === "ocean"
          ? "#315d6c"
          : ctx.config.tileStroke ?? "#314934",
        strokeWidth: 1,
      },
      datum,
      group: tile.landmark?.kind ?? terrainKind,
      interactive: true,
    }
  })

  return {
    nodes,
    overlays: (
      <IsometricLandmarkOverlay
        tiles={positioned}
        tileWidth={tileWidth}
        tileHeight={tileHeight}
        sprites={ctx.config.sprites}
        resourceSize={ctx.config.resourceSpriteSize ?? DEFAULT_ISOMETRIC_SPRITE_SIZES.resource}
        citySize={ctx.config.citySpriteSize ?? DEFAULT_ISOMETRIC_SPRITE_SIZES.city}
        showCityLabel={ctx.config.showCityLabel !== false}
      />
    ),
    restyle: (node, selection) => {
      if (!selection?.isActive || !node.datum || node.datum.kind === "terrain") {
        return { fillOpacity: 1 }
      }
      return { fillOpacity: selection.predicate(node.datum) ? 1 : 0.28 }
    },
  }
}

function IsometricLandmarkOverlay({
  tiles,
  tileWidth,
  tileHeight,
  sprites,
  resourceSize,
  citySize,
  showCityLabel,
}: {
  tiles: Array<IsometricLandmarkTile & { x: number; y: number }>
  tileWidth: number
  tileHeight: number
  sprites?: Partial<Record<LandmarkKind, string>>
  resourceSize: number
  citySize: number
  showCityLabel: boolean
}) {
  const selection = useCustomLayoutSelection()
  const occupied = tiles
    .filter((tile) => tile.landmark)
    .sort((a, b) => a.y - b.y || a.x - b.x)

  return (
    <g aria-hidden="true" pointerEvents="none">
      {occupied.map((tile) => {
        const landmark = tile.landmark!
        const isCity = landmark.kind === "city"
        const size = isCity ? citySize : resourceSize
        // The supplied sprites include their own isometric ground footprint.
        // Anchor its bottom point to the cell's bottom vertex so that footprint
        // sits over the diamond instead of against its top corner.
        const bottom = tile.y + tileHeight / 2
        const opacity =
          selection.isActive && !selection.predicate(landmark) ? 0.28 : 1
        return (
          <g key={landmark.id} opacity={opacity}>
            <ellipse
              cx={tile.x}
              cy={tile.y + tileHeight * 0.15}
              rx={size * 0.28}
              ry={size * 0.1}
              fill="#17251d"
              opacity={0.32}
            />
            <PixelSprite
              kind={landmark.kind}
              href={sprites?.[landmark.kind]}
              x={tile.x - size / 2}
              y={bottom - size}
              size={size}
            />
            {tile.landmarks.length > 1 && (
              <FeatureCountBadge
                x={tile.x + tileWidth * 0.3}
                y={tile.y - tileHeight * 0.19}
                count={tile.landmarks.length - 1}
                tileHeight={tileHeight}
              />
            )}
          </g>
        )
      })}
      {showCityLabel && occupied
        .filter((tile) => tile.landmark?.kind === "city")
        .map((tile) => {
          const label = tile.landmark!.name.toUpperCase()
          const width = Math.max(56, label.length * 6.4 + 14)
          return (
            <g
              key={`${tile.landmark!.id}-label`}
              transform={`translate(${tile.x},${tile.y + tileHeight * 0.72})`}
            >
              <rect
                x={-width / 2}
                y={-7}
                width={width}
                height={14}
                rx={1}
                fill="#17251d"
                opacity={0.92}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#f5edcf"
                fontFamily="monospace"
                fontSize={9}
                fontWeight={700}
                letterSpacing={0.8}
              >
                {label}
              </text>
            </g>
          )
        })}
    </g>
  )
}

function FeatureCountBadge({
  x,
  y,
  count,
  tileHeight,
}: {
  x: number
  y: number
  count: number
  tileHeight: number
}) {
  const height = Math.max(10, Math.min(15, tileHeight * 0.34))
  const label = `+${count}`
  const width = Math.max(height, label.length * height * 0.58)
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={1}
        fill="#17251d"
        stroke="#f0d36d"
        strokeWidth={1}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f5edcf"
        fontFamily="monospace"
        fontSize={Math.max(7, height * 0.62)}
        fontWeight={700}
      >
        {label}
      </text>
    </g>
  )
}

const PIXEL_PATTERNS: Record<LandmarkKind, string[]> = {
  city: [
    "..1111..",
    "..1221..",
    ".111111.",
    ".133331.",
    "11111111",
    "13311331",
    "14411441",
    "11111111",
  ],
  culture: [
    "..1111..",
    ".122221.",
    "11111111",
    ".133331.",
    ".133331.",
    ".133331.",
    "11111111",
    ".444444.",
  ],
  monument: [
    "...11...",
    "..1221..",
    "..1221..",
    "..1331..",
    ".113311.",
    ".133331.",
    "11111111",
    ".444444.",
  ],
  faith: [
    "...11...",
    "...11...",
    "..1111..",
    "...11...",
    "..1221..",
    ".133331.",
    "11111111",
    ".444444.",
  ],
  nature: [
    "...11...",
    "..1221..",
    ".122221.",
    "12222221",
    ".133331.",
    "...11...",
    "..1441..",
    ".144441.",
  ],
  knowledge: [
    ".111111.",
    "12211221",
    "12211221",
    "13311331",
    "13311331",
    "13311331",
    "11111111",
    ".444444.",
  ],
  defense: [
    "11.11.11",
    "11111111",
    "12222221",
    "12211221",
    "13311331",
    "13333331",
    "11111111",
    ".444444.",
  ],
  arena: [
    "..1111..",
    ".122221.",
    "12333321",
    "12344321",
    "12344321",
    "12333321",
    ".122221.",
    "..1111..",
  ],
  transport: [
    "...11...",
    "..1221..",
    ".122221.",
    "11111111",
    "..1331..",
    "..1331..",
    ".114411.",
    "11444411",
  ],
}

const PIXEL_COLORS: Record<LandmarkKind, Record<string, string>> = {
  city: { "1": "#29364a", "2": "#d8b45b", "3": "#b7693c", "4": "#6d9fc5" },
  culture: { "1": "#29364a", "2": "#d5c9a3", "3": "#9c6fb2", "4": "#ece3c4" },
  monument: { "1": "#29364a", "2": "#d8cba8", "3": "#9c8f79", "4": "#ece3c4" },
  faith: { "1": "#29364a", "2": "#d9c36d", "3": "#a877a5", "4": "#ece3c4" },
  nature: { "1": "#29364a", "2": "#4f8a4e", "3": "#79aa56", "4": "#79583a" },
  knowledge: { "1": "#29364a", "2": "#d5c9a3", "3": "#4f7da0", "4": "#ece3c4" },
  defense: { "1": "#29364a", "2": "#a6a298", "3": "#777b7f", "4": "#d5c9a3" },
  arena: { "1": "#29364a", "2": "#cb8056", "3": "#d8cba8", "4": "#6d9fc5" },
  transport: { "1": "#29364a", "2": "#d8b45b", "3": "#6d9fc5", "4": "#ece3c4" },
}

function PixelSprite({
  kind,
  href,
  x,
  y,
  size,
}: {
  kind: LandmarkKind
  href?: string
  x: number
  y: number
  size: number
}) {
  if (href) {
    return (
      <image
        href={href}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMax meet"
        style={{ imageRendering: "pixelated" }}
      />
    )
  }

  const pattern = PIXEL_PATTERNS[kind]
  const colors = PIXEL_COLORS[kind]
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges">
      {pattern.flatMap((row, rowIndex) =>
        [...row].map((pixel, columnIndex) =>
          pixel === "." ? null : (
            <rect
              key={`${rowIndex}-${columnIndex}`}
              x={columnIndex}
              y={rowIndex}
              width={1}
              height={1}
              fill={colors[pixel]}
            />
          )
        )
      )}
    </svg>
  )
}
