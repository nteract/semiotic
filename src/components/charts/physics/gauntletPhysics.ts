import { indexDefinitions } from "./gauntletEffects"
/**
 * Pure Gauntlet physics helpers (no React).
 * Types: `./gauntletTypes`.
 */
import { GAUNTLET_CHART_SIZE } from "../shared/chartSizeDefaultsPhysics"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type {
  PhysicsPipelineConfig,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import {
  CORE_KIND,
  NEGATIVE_KIND,
  POSITIVE_KIND,
  type GauntletAccessors,
  type GauntletBodyDatum,
  type GauntletCoreBodyFn,
  type GauntletGate,
  type GauntletLayout,
  type GauntletProjectPlacement,
  type GauntletProjectPlacementFn,
  type GauntletProjectState,
  type GauntletPropertyDefinition,
  type GauntletViabilityFn
} from "./gauntletTypes"

export { CORE_KIND, POSITIVE_KIND, NEGATIVE_KIND } from "./gauntletTypes"
export type {
  GauntletAccessors,
  GauntletBodyDatum,
  GauntletCoreBodyFn,
  GauntletEffect,
  GauntletEvent,
  GauntletEventContext,
  GauntletEventLogItem,
  GauntletGate,
  GauntletLayout,
  GauntletNegativeReplacementOptions,
  GauntletPopSpec,
  GauntletProjectPlacement,
  GauntletProjectPlacementFn,
  GauntletProjectState,
  GauntletPropertyDefinition,
  GauntletPropertyForceContext,
  GauntletPropertyWorkPlan,
  GauntletPropertyWorkPlanOptions,
  GauntletViabilityFn
} from "./gauntletTypes"

export const DEFAULT_WIDTH = GAUNTLET_CHART_SIZE.width
export const DEFAULT_HEIGHT = GAUNTLET_CHART_SIZE.height
export const EMPTY_GAUNTLET_PROPERTIES: readonly GauntletPropertyDefinition[] =
  []

export function gauntletWallColliders(
  layout: Pick<GauntletLayout, "width" | "floorY"> &
    Partial<Pick<GauntletLayout, "height">>
): NonNullable<PhysicsPipelineConfig["colliders"]> {
  const { left, top, rightInset, thickness } = resolveGauntletWall(layout)
  const right = layout.width - rightInset
  const floor = layout.floorY
  function segment(name: string, x1: number, y1: number, x2: number, y2: number) {
    return {
      id: `gauntlet-${name}`, restitution: 0.12, friction: 0.42,
      shape: { type: "segment" as const, x1, y1, x2, y2, thickness }
    }
  }
  return [
    segment("left", left, top, left, floor), segment("ceiling", left, top, right, top),
    segment("floor", left, floor, right, floor), segment("right", right, top, right, floor)
  ]
}

function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue> | undefined,
  fallback: TValue
): TValue {
  if (!accessor) return fallback
  return typeof accessor === "function"
    ? accessor(datum, index)
    : ((datum[accessor] as TValue) ?? fallback)
}

export function gauntletProjectId<TDatum extends Datum>(
  datum: TDatum, index: number, accessor: GauntletAccessors<TDatum>["idAccessor"]
) {
  return String(readAccessor(datum, index, accessor, String(datum.id ?? `project-${index}`)))
}

export function propertyLabel(
  property: GauntletPropertyDefinition | undefined
): string {
  return property?.label ?? property?.id ?? "property"
}

export function projectCoreId(projectId: string): string {
  return `gauntlet:${projectId}:core`
}

export function positiveBodies(projectId: string, ids: readonly string[]) {
  const counts = new Map<string, number>()
  return ids.map(propertyId => {
    const occurrence = counts.get(propertyId) ?? 0
    counts.set(propertyId, occurrence + 1)
    const kind = occurrence ? `positive-${occurrence}` : "positive"
    return { propertyId, occurrence, bodyId: `gauntlet:${projectId}:${kind}:${propertyId}` }
  })
}

export function projectNegativeId(
  projectId: string,
  propertyId: string,
  index: number
): string {
  return `gauntlet:${projectId}:negative:${propertyId}:${index}`
}

/** Interior of the collider box (matches wall segments in the frame config). */
export const GAUNTLET_WALL = {
  left: 28,
  top: 76,
  rightInset: 30,
  thickness: 8
} as const

type GauntletWallLayout = Pick<GauntletLayout, "width" | "floorY"> &
  Partial<Pick<GauntletLayout, "height">>

/** Scale the authored gauntlet corridor into context and sparkline boxes. */
export function resolveGauntletWall(layout: GauntletWallLayout) {
  const height = layout.height ?? layout.floorY + 36
  const compact = layout.width < 220 || height < 160
  if (!compact) return GAUNTLET_WALL
  const shortest = Math.max(1, Math.min(layout.width, height))
  const sideInset = Math.max(2, layout.width * 0.04)
  return {
    left: sideInset,
    top: Math.max(2, height * 0.08),
    rightInset: sideInset,
    thickness: Math.max(1, Math.min(4, shortest * 0.04))
  }
}

/** Scale default body/orbit geometry while preserving authored full-size values. */
export function gauntletSpatialScale(layout: GauntletWallLayout): number {
  const height = layout.height ?? layout.floorY + 36
  return Math.max(0.12, Math.min(1, layout.width / 500, height / 260))
}

/**
 * Keep body centers inside the playable gauntlet corridor so satellite
 * property particles never spawn or settle outside the left/right walls
 * (the "stuck on the left" regression for Homes on Main Street).
 */
export function clampGauntletPoint(
  x: number,
  y: number,
  radius: number,
  layout: GauntletWallLayout
): { x: number; y: number } {
  const wall = resolveGauntletWall(layout)
  const pad = Math.max(2, radius + 2)
  const minX = wall.left + wall.thickness / 2 + pad
  const maxX = layout.width - wall.rightInset - wall.thickness / 2 - pad
  const minY = wall.top + wall.thickness / 2 + pad
  const maxY = layout.floorY - pad
  const clampAxis = (value: number, min: number, max: number) =>
    min <= max ? Math.max(min, Math.min(max, value)) : (min + max) / 2
  return {
    x: clampAxis(x, minX, maxX),
    y: clampAxis(y, minY, maxY)
  }
}

export function buildLayout(
  size: [number, number],
  gates: readonly GauntletGate[] | undefined,
  crashOffset: number
): GauntletLayout {
  const [width, height] = size
  const compact = width < 220 || height < 160
  const routeY = Math.round(height * 0.48)
  const floorY = compact
    ? height - Math.max(3, Math.min(12, height * 0.1))
    : height - 36
  const enabledGates = (gates ?? []).filter((gate) => gate.enabled !== false)
  const gateCount = enabledGates.length
  const gateStart = width * 0.22
  const gateEnd = width * 0.78
  const gateStep = gateCount <= 1 ? 0 : (gateEnd - gateStart) / (gateCount - 1)
  // Start far enough right that positive-property orbits (radius ~72–80)
  // never clear the left wall on spawn.
  const startX = compact
    ? Math.max(Math.round(width * 0.12), width * 0.08 + 6)
    : Math.max(Math.round(width * 0.14), 110)
  const resolvedCrashOffset = compact
    ? Math.min(crashOffset, Math.max(3, height * 0.22))
    : crashOffset
  return {
    crashY: floorY - resolvedCrashOffset,
    floorY,
    gates: enabledGates.map((gate, index) => ({
      ...gate,
      x: gate.x ?? Math.round(gateStart + index * gateStep),
      width:
        gate.width ??
        Math.max(compact ? 8 : 54, Math.round(width * 0.07))
    })),
    graveyardX: Math.round(width * (compact ? 0.72 : 0.84)),
    graveyardY: floorY - 4,
    height,
    routeY,
    socketX: Math.round(width * (compact ? 0.82 : 0.92)),
    startX,
    width
  }
}

export function defaultPlacement(
  layout: GauntletLayout
): Required<GauntletProjectPlacement> {
  return {
    graveyardX: layout.graveyardX,
    graveyardY: layout.graveyardY,
    routeY: layout.routeY,
    socketX: layout.socketX,
    socketY: layout.routeY - 4,
    startX: layout.startX,
    startY: layout.routeY
  }
}

export function resolvePlacement<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  index: number,
  layout: GauntletLayout,
  projectPlacement: GauntletProjectPlacementFn<TDatum> | undefined
): Required<GauntletProjectPlacement> {
  const base = defaultPlacement(layout)
  const resolved = projectPlacement?.(project, index, layout) ?? {}
  return {
    ...base,
    ...resolved,
    startY: resolved.startY ?? resolved.routeY ?? base.startY,
    socketY: resolved.socketY ?? resolved.routeY ?? base.socketY,
    graveyardY: resolved.graveyardY ?? base.graveyardY
  }
}

export function featureSlot(
  ids: readonly string[],
  id: string,
  spatialScale = 1,
  occurrence = 0
): { angle: number; index: number; radius: number } {
  // Collation-equivalent IDs still need separate slots. Count preceding properties
  // directly so each force calculation avoids copying and sorting the inventory.
  const index = ids.reduce((rank, other) => {
    const order = other.localeCompare(id)
    return rank + Number(order < 0 || (order === 0 && other < id))
  }, occurrence)
  const t = ids.length > 1 ? index / (ids.length - 1) : 0.5
  // Keep positives on the upper arc so they read as lift/balloons. Avoid
  // angles in the lower half-plane; y increases downward in canvas space.
  return {
    angle: -Math.PI * 0.82 + t * Math.PI * 0.64,
    index,
    radius: (48 + (index % 2) * 6) * spatialScale
  }
}

export function resolveGauntletViability<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  positiveProperties: Map<string, GauntletPropertyDefinition>,
  negativeProperties: Map<string, GauntletPropertyDefinition>,
  viability?: GauntletViabilityFn<TDatum>
): number {
  const authored = viability?.(project, { negativeProperties, positiveProperties })
  if (authored != null) return authored
  const lift = project.activePositiveIds.reduce(
    (sum, id) => sum + (positiveProperties.get(id)?.value ?? 1),
    0
  )
  const missing =
    project.missingPositiveIds.length + project.poppedPositiveIds.length
  const load = project.negativeIds.reduce(
    (sum, id) => sum + (negativeProperties.get(id)?.load ?? 1),
    0
  )
  return Math.max(
    0,
    Math.min(100, 75 + lift * 3 - load * 8 - project.delay * 1.2 - missing * 5)
  )
}

export function createInitialState<TDatum extends Datum>(
  datum: TDatum,
  index: number,
  props: GauntletAccessors<TDatum>,
  positiveProperties: readonly GauntletPropertyDefinition[],
  negativeProperties: Map<string, GauntletPropertyDefinition>
): GauntletProjectState<TDatum> {
  const id = gauntletProjectId(datum, index, props.idAccessor)
  const allPositiveIds = positiveProperties.map((property) => property.id)
  const activePositiveIds = [
    ...readAccessor(datum, index, props.positiveAccessor, allPositiveIds)
  ]
  const negativeIds = [
    ...readAccessor(datum, index, props.negativeAccessor, [])
  ].filter((id) => negativeProperties.has(id))
  const state: GauntletProjectState<TDatum> = {
    id,
    activePositiveIds,
    datum,
    delay: 0,
    eventsApplied: [],
    eventHistory: [],
    killed: false,
    metrics: { ...readAccessor(datum, index, props.metricsAccessor, {}) },
    missingPositiveIds: allPositiveIds.filter(
      (propertyId) => !activePositiveIds.includes(propertyId)
    ),
    negativeIds,
    outcome: "in_process",
    poppedPositiveIds: [],
    poppedNegativeIds: [],
    startedAt: Math.max(
      0,
      Number(readAccessor(datum, index, props.startTimeAccessor, 0)) || 0
    ),
    stage: "project filed",
    viability: readAccessor(datum, index, props.initialViability, 100)
  }
  return state
}

export function buildProjectSpawns<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  projectIndex: number,
  layout: GauntletLayout,
  placement: Required<GauntletProjectPlacement>,
  positiveProperties: Map<string, GauntletPropertyDefinition>,
  negativeProperties: Map<string, GauntletPropertyDefinition>,
  coreBody?: GauntletCoreBodyFn<TDatum>,
  positiveStart?: number
): PhysicsQueuedSpawn[] {
  const spatialScale = gauntletSpatialScale(layout)
  const defaultCoreRadius = Math.max(3, 28 * spatialScale)
  const coreX = placement.startX
  const coreY =
    placement.startY +
    (placement.startY === layout.routeY ? projectIndex * 38 * spatialScale : 0)
  const corePatch = coreBody?.(project, projectIndex, layout, placement) ?? {}
  const authoredCoreX = corePatch.x ?? coreX
  const authoredCoreY = corePatch.y ?? coreY
  const coreRadius =
    corePatch.shape && "radius" in corePatch.shape
      ? Number(corePatch.shape.radius) || defaultCoreRadius
      : defaultCoreRadius
  const clampedCore = clampGauntletPoint(
    authoredCoreX,
    authoredCoreY,
    coreRadius,
    layout
  )
  const spawns: PhysicsQueuedSpawn[] = []
  if (positiveStart === undefined) {
    const coreDatum = {
      __gauntlet: true,
      kind: CORE_KIND,
      projectId: project.id,
      sourceDatum: project.datum
    } satisfies GauntletBodyDatum<TDatum>
    spawns.push({
        ...corePatch,
        id: projectCoreId(project.id),
        ...clampedCore,
        vx: corePatch.vx ?? 42,
        vy: corePatch.vy ?? 0,
        mass: corePatch.mass ?? 7,
        bodyCollisions: corePatch.bodyCollisions ?? true,
        shape: corePatch.shape ?? { type: "circle", radius: defaultCoreRadius },
        spawnAt: corePatch.spawnAt ?? project.startedAt,
        datum: coreDatum
    })
  }
  const positives = positiveBodies(project.id, project.activePositiveIds)
  for (const { propertyId, occurrence, bodyId } of positives.slice(positiveStart ?? 0)) {
    const property = positiveProperties.get(propertyId)
    if (!property) continue
    const slot = featureSlot(
      project.activePositiveIds,
      propertyId,
      spatialScale,
      occurrence
    )
    spawns.push(buildPropertySpawn(project, property, bodyId, slot.index, clampedCore.x,
      clampedCore.y, layout, corePatch.spawnAt ?? project.startedAt, { ...slot, occurrence }))
  }
  project.negativeIds.forEach((propertyId, index) => {
    const property = negativeProperties.get(propertyId)
    if (!property) return
    spawns.push(
      buildNegativeSpawn(
        project,
        property,
        index,
        clampedCore.x,
        clampedCore.y,
        layout,
        corePatch.spawnAt ?? project.startedAt
      )
    )
  })
  return spawns
}

/**
 * Pure Gauntlet world builder for SSR / renderChart. Materializes project
 * cores + property satellites once without React state or gate animation.
 */
export function buildGauntletPhysics<TDatum extends Datum = Datum>(options: {
  data?: readonly TDatum[]
  size?: [number, number]
  gates?: readonly GauntletGate[]
  positiveProperties?: readonly GauntletPropertyDefinition[]
  negativeProperties?: readonly GauntletPropertyDefinition[]
  crashOffset?: number
  idAccessor?: ChartAccessor<TDatum, string>
  positiveAccessor?: ChartAccessor<TDatum, readonly string[]>
  negativeAccessor?: ChartAccessor<TDatum, readonly string[]>
  metricsAccessor?: ChartAccessor<TDatum, Record<string, number>>
  initialViability?: ChartAccessor<TDatum, number>
  startTimeAccessor?: ChartAccessor<TDatum, number>
  projectPlacement?: GauntletProjectPlacementFn<TDatum>
  coreBody?: GauntletCoreBodyFn<TDatum>
  viability?: GauntletViabilityFn<TDatum>
}): {
  config: NonNullable<
    import("../../stream/physics/PhysicsPipelineStore").PhysicsPipelineConfig
  >
  initialSpawns: PhysicsQueuedSpawn[]
  layout: GauntletLayout
  states: GauntletProjectState<TDatum>[]
} {
  const size = options.size ?? [900, 520]
  const layout = buildLayout(size, options.gates, options.crashOffset ?? 30)
  const positiveProperties = options.positiveProperties ?? []
  const positiveById = indexDefinitions(positiveProperties)
  const negativeById = indexDefinitions(options.negativeProperties ?? [])
  const accessors = {
    idAccessor: options.idAccessor,
    initialViability: options.initialViability,
    metricsAccessor: options.metricsAccessor,
    negativeAccessor: options.negativeAccessor,
    positiveAccessor: options.positiveAccessor,
    startTimeAccessor: options.startTimeAccessor
  }
  const data = options.data ?? []
  const states = data.map((datum, index) => {
    const state = createInitialState(
      datum,
      index,
      accessors,
      positiveProperties,
      negativeById
    )
    return {
      ...state,
      viability:
        resolveGauntletViability(state, positiveById, negativeById, options.viability)
    }
  })
  const initialSpawns = states.flatMap((project, index) => {
    const placement = resolvePlacement(
      project,
      index,
      layout,
      options.projectPlacement
    )
    return buildProjectSpawns(
      project,
      index,
      layout,
      placement,
      positiveById,
      negativeById,
      options.coreBody
    )
  })
  return {
    layout,
    states,
    initialSpawns,
    config: {
      fixedDt: 1 / 60,
      maxSubsteps: 8,
      kernel: {
        gravity: { x: 0, y: 0 },
        restitution: 0.16,
        friction: 0.44,
        velocityDamping: 0.982,
        maxVelocity: 520,
        sleepAfter: 0.8,
        sleepSpeed: 7
      },
      colliders: gauntletWallColliders(layout)
    }
  }
}

export function buildNegativeSpawn<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  property: GauntletPropertyDefinition,
  index: number,
  x: number,
  y: number,
  layout: GauntletWallLayout,
  spawnAt?: number
): PhysicsQueuedSpawn {
  return buildPropertySpawn(project, property, projectNegativeId(project.id, property.id, index),
    index, x, y, layout, spawnAt)
}

function buildPropertySpawn<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>, property: GauntletPropertyDefinition,
  id: string, index: number, x: number, y: number, layout: GauntletWallLayout,
  spawnAt: number | undefined, slot?: ReturnType<typeof featureSlot> & { occurrence: number }
): PhysicsQueuedSpawn {
  const scale = gauntletSpatialScale(layout)
  const radius = property.radius ?? Math.max(2, (slot ? 10 : 7.2) * scale)
  const pos = clampGauntletPoint(
    x + (slot ? Math.cos(slot.angle) * slot.radius : (-12 + (index % 4) * 12) * scale),
    y + (slot ? Math.sin(slot.angle) * slot.radius : (54 + Math.floor(index / 4) * 12) * scale),
    radius, layout
  )
  return {
    id, ...pos, spawnAt,
    vx: slot ? Math.cos(slot.angle) * 18 : 10,
    vy: slot ? Math.sin(slot.angle) * 18 : 6,
    mass: property.mass ?? (slot ? 0.75 : 0.72),
    bodyCollisions: false,
    shape: { type: "circle", radius },
    datum: {
      __gauntlet: true, kind: slot ? POSITIVE_KIND : NEGATIVE_KIND,
      projectId: project.id, sourceDatum: project.datum, property,
      ...(slot && { occurrence: slot.occurrence })
    } satisfies GauntletBodyDatum<TDatum>,
    springs: property.spring === false ? [] : [{
      target: { type: "body", bodyId: projectCoreId(project.id) },
      stiffness: slot ? 0.56 : 0.62, damping: slot ? 0.9 : 0.92,
      restLength: Math.max(6, (52 + (slot ? (index % 2) * 4 : (index % 4) * 3)) * scale),
      ...property.spring,
      id: property.spring?.id ?? `${id}:spring`
    }]
  }
}
