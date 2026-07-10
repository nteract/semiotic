import type { VisualToken } from "./tokenEncoding"
import { sedimentHeightfield } from "../stream/physics/PhysicsSediment"
import {
  collidersFromPlotBounds,
  collidersFromXScaleBins,
  type PhysicsBoundsColliderOptions,
  type PhysicsPlotBounds,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions,
  type PhysicsXBinColliderOptions
} from "../stream/physics/PhysicsPipelineStore"
import type {
  PhysicsBodyShape,
  PhysicsColliderSpec
} from "../stream/physics/PhysicsKernel"
import type {
  PhysicsSedimentBinSnapshot,
  PhysicsSedimentColumn,
  PhysicsSedimentHeightfieldOptions
} from "../stream/physics/PhysicsSediment"
import { mulberry32 } from "./random"

export type NumericScale = (value: number) => number
export type BandScale<T = string | number> = ((value: T) => number | undefined) & {
  bandwidth?: () => number
}

export interface PhysicsScaleColliderOptions<TBand = string | number> {
  plot: PhysicsPlotBounds
  idPrefix?: string
  bounds?: false | PhysicsBoundsColliderOptions
  xBins?: Omit<
    PhysicsXBinColliderOptions,
    "idPrefix" | "yTop" | "yBottom"
  > & {
    idPrefix?: string
    yTop?: number
    yBottom?: number
  }
  xBands?: PhysicsBandColliderOptions<TBand>
  yBands?: PhysicsBandColliderOptions<TBand>
}

export interface PhysicsBandColliderOptions<TBand = string | number> {
  values: readonly TBand[]
  scale: BandScale<TBand>
  bandwidth?: number
  wallThickness?: number
  includeBoundaryWalls?: boolean
  includeInteriorWalls?: boolean
  idPrefix?: string
}

export interface GaltonPegsOptions {
  plot: PhysicsPlotBounds
  rows: number
  columns?: number
  pegRadius?: number
  idPrefix?: string
  yStart?: number
  yEnd?: number
  stagger?: boolean
  restitution?: number
  friction?: number
}

export interface SpawnFromTokensOptions<D = unknown> {
  idPrefix?: string
  x?: number | ((token: VisualToken<D>, index: number) => number)
  y?: number | ((token: VisualToken<D>, index: number) => number)
  radius?: number | ((token: VisualToken<D>, index: number) => number)
  shape?: PhysicsBodyShape | ((token: VisualToken<D>, index: number) => PhysicsBodyShape)
  mass?: number | ((token: VisualToken<D>, index: number) => number)
  vx?: number | ((token: VisualToken<D>, index: number) => number)
  vy?: number | ((token: VisualToken<D>, index: number) => number)
  jitter?: number | { x?: number; y?: number }
  seed?: number
  spawnAt?: number | ((token: VisualToken<D>, index: number) => number)
  datum?: (token: VisualToken<D>, index: number) => unknown
}

export interface SedimentBakeOptions extends PhysicsSedimentHeightfieldOptions {
  idPrefix?: string
  collider?: boolean
  colliderThickness?: number
  restitution?: number
  friction?: number
}

export interface SedimentBakeResult {
  columns: PhysicsSedimentColumn[]
  colliders: PhysicsColliderSpec[]
}

export interface ArrivalReplayOptions {
  timeAccessor?: string | ((spawn: PhysicsQueuedSpawn, index: number) => unknown)
  timeScale?: number
  startAt?: number
  rebase?: boolean
  sort?: boolean
}

function finiteNumber(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN
  return Number.isFinite(number) ? number : null
}

function readMaybeAccessor<T>(
  value: number | ((item: T, index: number) => number) | undefined,
  item: T,
  index: number,
  fallback: number
): number {
  const next = typeof value === "function" ? value(item, index) : value
  return Number.isFinite(next) ? Number(next) : fallback
}

function readTokenCoordinate<D>(
  token: VisualToken<D>,
  field: "x" | "y",
  fallback: number
): number {
  const value = (token as VisualToken<D> & { x?: unknown; y?: unknown })[field]
  return finiteNumber(value) ?? fallback
}

function jitterAmount(
  jitter: SpawnFromTokensOptions["jitter"],
  axis: "x" | "y"
): number {
  if (typeof jitter === "number") return jitter
  return jitter?.[axis] ?? 0
}

function bandEdges<TBand>(
  options: PhysicsBandColliderOptions<TBand>
): number[] {
  const bandwidth = options.bandwidth ?? options.scale.bandwidth?.() ?? 0
  const edges = new Set<number>()
  for (const value of options.values) {
    const start = options.scale(value)
    if (!Number.isFinite(start)) continue
    edges.add(Number(start))
    edges.add(Number(start) + bandwidth)
  }
  return Array.from(edges).sort((a, b) => a - b)
}

function bandWallColliders<TBand>(options: {
  band: PhysicsBandColliderOptions<TBand>
  idPrefix: string
  plot: PhysicsPlotBounds
  projection: "x" | "y"
}): PhysicsColliderSpec[] {
  const {
    band,
    idPrefix,
    plot,
    projection
  } = options
  const {
    includeBoundaryWalls = true,
    includeInteriorWalls = true,
    wallThickness = 4
  } = band
  const edges = bandEdges(band)
  if (edges.length < 2) return []

  const first = includeBoundaryWalls ? 0 : 1
  const last = includeBoundaryWalls ? edges.length - 1 : edges.length - 2
  const colliders: PhysicsColliderSpec[] = []
  for (let index = first; index <= last; index += 1) {
    if (!includeInteriorWalls && index > 0 && index < edges.length - 1) {
      continue
    }
    const edge = edges[index]
    colliders.push({
      id: `${idPrefix}-wall-${index}`,
      shape:
        projection === "x"
          ? {
              type: "aabb",
              x: edge,
              y: plot.y + plot.height / 2,
              width: wallThickness,
              height: plot.height
            }
          : {
              type: "aabb",
              x: plot.x + plot.width / 2,
              y: edge,
              width: plot.width,
              height: wallThickness
            }
    })
  }
  return colliders
}

/**
 * Build chart-aligned static colliders from a plot rectangle plus optional
 * continuous bins or band-scale lanes.
 */
export function collidersFromScales<TBand = string | number>(
  options: PhysicsScaleColliderOptions<TBand>
): PhysicsColliderSpec[] {
  const {
    plot,
    idPrefix = "physics-scale",
    bounds = {},
    xBins,
    xBands,
    yBands
  } = options
  const colliders: PhysicsColliderSpec[] = []

  if (bounds !== false) {
    colliders.push(
      ...collidersFromPlotBounds(plot, {
        idPrefix,
        ...bounds
      })
    )
  }

  if (xBins) {
    const {
      idPrefix: xBinPrefix,
      yTop,
      yBottom,
      ...xBinOptions
    } = xBins
    colliders.push(
      ...collidersFromXScaleBins({
        ...xBinOptions,
        idPrefix: xBinPrefix ?? `${idPrefix}-xbin`,
        yTop: yTop ?? plot.y,
        yBottom: yBottom ?? plot.y + plot.height
      })
    )
  }

  if (xBands) {
    colliders.push(
      ...bandWallColliders({
        band: xBands,
        idPrefix: xBands.idPrefix ?? `${idPrefix}-xband`,
        plot,
        projection: "x"
      })
    )
  }

  if (yBands) {
    colliders.push(
      ...bandWallColliders({
        band: yBands,
        idPrefix: yBands.idPrefix ?? `${idPrefix}-yband`,
        plot,
        projection: "y"
      })
    )
  }

  return colliders
}

/**
 * Generate deterministic square peg colliders for Galton/Plinko-style custom
 * layouts. Square AABBs are intentional: they work with the built-in kernel's
 * small default collider vocabulary while still reading as point pegs.
 */
export function galtonPegs(options: GaltonPegsOptions): PhysicsColliderSpec[] {
  const {
    plot,
    rows,
    columns = rows + 1,
    pegRadius = 3,
    idPrefix = "galton-peg",
    yStart = plot.y + plot.height * 0.18,
    yEnd = plot.y + plot.height * 0.58,
    stagger = true,
    restitution = 0.2,
    friction = 0.04
  } = options
  const safeRows = Math.max(0, Math.floor(rows))
  const safeColumns = Math.max(1, Math.floor(columns))
  if (safeRows === 0) return []

  const rowStep = safeRows <= 1 ? 0 : (yEnd - yStart) / (safeRows - 1)
  const columnStep = plot.width / safeColumns
  const pegs: PhysicsColliderSpec[] = []
  for (let row = 0; row < safeRows; row += 1) {
    const offset = stagger && row % 2 === 1 ? columnStep / 2 : 0
    for (let column = 0; column < safeColumns; column += 1) {
      const x = plot.x + columnStep * (column + 0.5) + offset
      if (x < plot.x + pegRadius || x > plot.x + plot.width - pegRadius) {
        continue
      }
      pegs.push({
        id: `${idPrefix}-${row}-${column}`,
        shape: {
          type: "aabb",
          x,
          y: yStart + row * rowStep,
          width: pegRadius * 2,
          height: pegRadius * 2
        },
        restitution,
        friction
      })
    }
  }
  return pegs
}

/**
 * Convert visual tokens into physics body spawns. Pair with
 * `generateTokens()` / `layoutTokenGrid()` for HOPs, unitized piles, or
 * posterior-sample demos inside `PhysicsCustomChart`.
 */
export function spawnFromTokens<D = unknown>(
  tokens: readonly VisualToken<D>[],
  options: SpawnFromTokensOptions<D> = {}
): PhysicsQueuedSpawn[] {
  const {
    idPrefix = "physics-token",
    radius = 5,
    shape,
    mass,
    vx,
    vy,
    spawnAt,
    seed = 1,
    jitter,
    datum
  } = options
  const random = mulberry32(seed)
  const jitterX = jitterAmount(jitter, "x")
  const jitterY = jitterAmount(jitter, "y")

  return tokens.map((token, index) => {
    const baseX = readMaybeAccessor(options.x, token, index, readTokenCoordinate(token, "x", 0))
    const baseY = readMaybeAccessor(options.y, token, index, readTokenCoordinate(token, "y", 0))
    const resolvedRadius = readMaybeAccessor(radius, token, index, 5)
    const resolvedShape =
      typeof shape === "function"
        ? shape(token, index)
        : shape ?? { type: "circle", radius: resolvedRadius }
    return {
      id: `${idPrefix}-${token.index ?? index}`,
      x: baseX + (random() - 0.5) * jitterX,
      y: baseY + (random() - 0.5) * jitterY,
      vx: readMaybeAccessor(vx, token, index, 0),
      vy: readMaybeAccessor(vy, token, index, 0),
      mass: readMaybeAccessor(mass, token, index, 1),
      spawnAt: readMaybeAccessor(spawnAt, token, index, undefined as unknown as number),
      shape: resolvedShape,
      datum: datum ? datum(token, index) : token.datum ?? token
    }
  }).map((spawn) => {
    if (Number.isFinite(spawn.spawnAt)) return spawn
    const { spawnAt: _spawnAt, ...rest } = spawn
    return rest
  })
}

/**
 * Turn sediment snapshots into drawable columns and optional static colliders.
 * Use the columns for overlays and the colliders when old data should become
 * a physical resting surface for live bodies.
 */
export function sedimentBake(
  bins: PhysicsSedimentBinSnapshot[],
  options: SedimentBakeOptions = {}
): SedimentBakeResult {
  const {
    idPrefix = "sediment",
    collider = true,
    colliderThickness = 1,
    restitution = 0.05,
    friction = 0.2,
    ...heightfieldOptions
  } = options
  const columns = sedimentHeightfield(bins, heightfieldOptions)
  const colliders = collider
    ? columns
        .filter((column) => column.height > 0)
        .map((column) => ({
          id: `${idPrefix}-${column.binId}`,
          shape: {
            type: "aabb" as const,
            x: column.x + column.width / 2,
            y: column.y + colliderThickness / 2,
            width: column.width,
            height: colliderThickness
          },
          restitution,
          friction
        }))
    : []
  return { columns, colliders }
}

function readSpawnTime(
  spawn: PhysicsQueuedSpawn,
  index: number,
  accessor: NonNullable<ArrivalReplayOptions["timeAccessor"]>
): number | null {
  if (typeof accessor === "function") return finiteNumber(accessor(spawn, index))
  return finiteNumber(
    (spawn as unknown as Record<string, unknown>)[accessor] ??
      (spawn.datum as Record<string, unknown> | undefined)?.[accessor]
  )
}

/**
 * Prepare initial spawns for event-time/arrival-time replay. The returned
 * object spreads directly into a `PhysicsCustomChart` layout result.
 */
export function arrivalReplay(
  spawns: readonly PhysicsQueuedSpawn[],
  options: ArrivalReplayOptions = {}
): {
  initialSpawns: PhysicsQueuedSpawn[]
  initialSpawnPacing: PhysicsSpawnPacingOptions
} {
  const {
    timeAccessor = "arrivalTime",
    timeScale = 1,
    startAt = 0,
    rebase = true,
    sort = true
  } = options
  const rows = spawns.map((spawn, index) => {
    const time = readSpawnTime(spawn, index, timeAccessor) ?? spawn.spawnAt ?? index
    return { spawn, time }
  })
  const minTime = rows.length ? Math.min(...rows.map((row) => row.time)) : 0
  const initialSpawns = rows
    .map(({ spawn, time }) => ({
      ...spawn,
      spawnAt: startAt + (rebase ? time - minTime : time)
    }))
    .sort((a, b) => (sort ? (a.spawnAt ?? 0) - (b.spawnAt ?? 0) : 0))

  return {
    initialSpawns,
    initialSpawnPacing: {
      pacing: "arrival",
      startAt,
      timeAccessor: "spawnAt",
      timeScale
    }
  }
}

export type {
  PhysicsColliderSpec,
  PhysicsPlotBounds,
  PhysicsQueuedSpawn,
  PhysicsSedimentBinSnapshot,
  PhysicsSedimentColumn,
  PhysicsSedimentHeightfieldOptions,
  PhysicsSpawnPacingOptions
}

// Process-physics authoring kit (stage volumes, region factories, groups).
export {
  absorbRegion,
  bodyGroupSpec,
  capacitatedRegion,
  chargeGateRegion,
  forceFieldRegion,
  membraneRegion,
  portalRegion,
  pressureFieldRegion,
  processLaneWalls,
  processStageLayout,
  processStageRegions,
  routeSurfaceRegion,
  stageTargetInVolume
} from "./processPhysics"

export {
  aggregateRegionCounts,
  groupCompletionRows,
  regionCountsToProjectionRows
} from "./processAggregates"

export { processVolumePolygons } from "./processVolumeGeometry"

export {
  createProcessJourneyLedger,
  processJourneyRows,
  updateProcessJourney
} from "./processJourney"

// Process controllers (live capacity / portals) — also on StreamPhysicsFrame.
export {
  composePhysicsControllers,
  createCapacityQueueController,
  createPortalController
} from "../stream/physics/PhysicsControllers"
export type {
  CapacityQueueControllerOptions,
  CapacityQueueSnapshot,
  ComposedPhysicsControllers,
  PhysicsController,
  PhysicsControllerTickContext
} from "../stream/physics/PhysicsControllers"

// Process chrome (stage bays, capacity badges, feature sockets).
export { processChrome } from "./processChrome"
export type {
  ProcessChromeGroup,
  ProcessChromeLayout,
  ProcessChromeOptions,
  ProcessChromeStage
} from "./processChrome"
export type {
  BodyGroupSpec,
  BodyGroupSpecOptions,
  ProcessMembraneDef,
  ProcessRegionBaseOptions,
  ProcessStageRegionOptions,
  ProcessStageDef,
  ProcessVolumeLayout,
  ProcessVolumeLayoutOptions,
  ProcessVolumeMembraneBand,
  ProcessVolumeShape,
  ProcessVolumeStageBand
} from "./processPhysics"
export type { RegionCountBucket, RegionCountMap } from "./processAggregates"
export type {
  ProcessVolumePoint,
  ProcessVolumePolygon,
  ProcessVolumePolygonRole
} from "./processVolumeGeometry"
export type {
  ProcessJourneyEntityState,
  ProcessJourneyLedger,
  ProcessJourneyRow,
  ProcessJourneyStage,
  ProcessJourneyUpdateOptions
} from "./processJourney"
