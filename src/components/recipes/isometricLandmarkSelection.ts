import type { Datum } from "../charts/shared/datumTypes"
import type {
  IsometricLandmarkConfig,
  IsometricLandmarkTile,
  LandmarkKind
} from "./isometricLandmarks"

export const DEFAULT_TERRAIN = ["#739b58", "#83a964", "#668d52", "#8baa68"]
const VALID_KINDS = new Set<LandmarkKind>([
  "city",
  "culture",
  "monument",
  "faith",
  "nature",
  "knowledge",
  "defense",
  "arena",
  "transport"
])

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

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

export function normalizeGridSize(value: number | undefined): number {
  const rounded = Math.max(3, Math.round(value ?? 5))
  return rounded % 2 === 0 ? rounded + 1 : rounded
}

function normalizeKind(value: unknown): LandmarkKind {
  return VALID_KINDS.has(value as LandmarkKind)
    ? (value as LandmarkKind)
    : "monument"
}

/**
 * Quantize geographic landmarks into an odd square grid and choose one
 * representative per cell. Selection balances proximity to the cell center
 * with category reuse so a dense class does not consume the whole board.
 * The middle cell prefers a city after candidate priority. Only centerId can
 * relocate an in-range landmark; ties use name and id independently of locale.
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
  const tiles = Array.from(
    { length: gridSize * gridSize },
    (
      _,
      index
    ): Omit<IsometricLandmarkTile, "landmarks"> & {
      landmarks: Candidate[]
    } => {
      const row = Math.floor(index / gridSize)
      const column = index % gridSize
      return {
        id: `tile-${row}-${column}`,
        row,
        column,
        centerXKm: -radius + (column + 0.5) * cellSpan,
        centerYKm: radius - (row + 0.5) * cellSpan,
        terrainIndex: (row * 17 + column * 31) % DEFAULT_TERRAIN.length,
        landmark: null,
        landmarks: []
      }
    }
  )
  const configuredCandidates: Candidate[] = []

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
      Math.floor((xKm + radius) / cellSpan)
    )
    const row = Math.min(
      gridSize - 1,
      Math.floor((radius - yKm) / cellSpan)
    )
    const tile = tiles[row * gridSize + column]
    const priority = Number(getPriority(point))
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
      cellDistanceSq: (xKm - tile.centerXKm) ** 2 + (yKm - tile.centerYKm) ** 2,
      candidatePriority: Number.isFinite(priority) ? priority : 0
    }

    tile.landmarks.push(candidate)
    if (id === config.centerId) configuredCandidates.push(candidate)
  }

  const tieBreak = (a: Candidate, b: Candidate): number =>
    compareText(a.name, b.name) ||
    compareText(a.id, b.id) ||
    a.lon - b.lon ||
    a.lat - b.lat ||
    compareText(a.kind, b.kind)
  const byProximity = (a: Candidate, b: Candidate): number =>
    a.candidatePriority - b.candidatePriority ||
    a.cellDistanceSq - b.cellDistanceSq ||
    tieBreak(a, b)
  const middleTile = tiles[middle * gridSize + middle]
  // Only an explicit override can move a landmark away from its geographic cell.
  const centerCandidate =
    configuredCandidates.sort(byProximity)[0] ??
    [...middleTile.landmarks].sort(
      (a, b) =>
        a.candidatePriority - b.candidatePriority ||
        Number(b.kind === "city") - Number(a.kind === "city") ||
        a.distanceKm - b.distanceKm ||
        tieBreak(a, b)
    )[0]

  const kindUsage = new Map<LandmarkKind, number>()
  if (centerCandidate) kindUsage.set(centerCandidate.kind, 1)
  const score = (candidate: Candidate): number =>
    candidate.cellDistanceSq +
    (kindUsage.get(candidate.kind) ?? 0) * cellSpan * cellSpan * 0.35
  const byDiversity = (a: Candidate, b: Candidate): number =>
    a.candidatePriority - b.candidatePriority ||
    score(a) - score(b) ||
    tieBreak(a, b)
  for (const tile of tiles) {
    const isMiddle = tile === middleTile
    tile.landmarks = tile.landmarks
      .filter((candidate) => candidate !== centerCandidate)
      .sort(isMiddle ? byProximity : byDiversity)
    if (isMiddle && centerCandidate) tile.landmarks.unshift(centerCandidate)
    tile.landmark = tile.landmarks[0] ?? null
    if (tile.landmark && tile.landmark !== centerCandidate) {
      const kind = tile.landmark.kind
      kindUsage.set(kind, (kindUsage.get(kind) ?? 0) + 1)
    }
  }

  return tiles
}
