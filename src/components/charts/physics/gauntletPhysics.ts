/**
 * Pure Gauntlet physics helpers (no React).
 * Types: `./gauntletTypes`.
 */
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { PhysicsPipelineConfig, PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
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

export {
  CORE_KIND,
  POSITIVE_KIND,
  NEGATIVE_KIND
} from "./gauntletTypes"
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

export const DEFAULT_WIDTH = 900
export const DEFAULT_HEIGHT = 520

export function gauntletWallColliders(
  layout: Pick<GauntletLayout, "width" | "floorY"> & Partial<Pick<GauntletLayout, "height">>
): NonNullable<PhysicsPipelineConfig["colliders"]> {
  const wall = resolveGauntletWall(layout)
  return [
    {
      id: "gauntlet-left",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: wall.left,
        y1: wall.top,
        x2: wall.left,
        y2: layout.floorY,
        thickness: wall.thickness
      }
    },
    {
      id: "gauntlet-ceiling",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: wall.left,
        y1: wall.top,
        x2: layout.width - wall.rightInset,
        y2: wall.top,
        thickness: wall.thickness
      }
    },
    {
      id: "gauntlet-floor",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: wall.left,
        y1: layout.floorY,
        x2: layout.width - wall.rightInset,
        y2: layout.floorY,
        thickness: wall.thickness
      }
    },
    {
      id: "gauntlet-right",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: layout.width - wall.rightInset,
        y1: wall.top,
        x2: layout.width - wall.rightInset,
        y2: layout.floorY,
        thickness: wall.thickness
      }
    }
  ]
}


export function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue> | undefined,
  fallback: TValue
): TValue {
  if (!accessor) return fallback
  return typeof accessor === "function"
    ? accessor(datum, index)
    : (datum[accessor] as TValue) ?? fallback
}

export function propertyLabel(property: GauntletPropertyDefinition | undefined): string {
  return property?.label ?? property?.id ?? "property"
}

export function projectCoreId(projectId: string): string {
  return `gauntlet:${projectId}:core`
}

export function projectPositiveId(projectId: string, propertyId: string): string {
  return `gauntlet:${projectId}:positive:${propertyId}`
}

export function projectNegativeId(projectId: string, propertyId: string, index: number): string {
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

export function buildLayout(size: [number, number], gates: readonly GauntletGate[] | undefined, crashOffset: number): GauntletLayout {
  const [width, height] = size
  const compact = width < 220 || height < 160
  const routeY = Math.round(height * 0.48)
  const floorY = compact
    ? height - Math.max(3, Math.min(12, height * 0.1))
    : height - 36
  const enabledGates = (gates ?? []).filter((gate) => gate.enabled !== false)
  const gateCount = Math.max(1, enabledGates.length)
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
      id: gate.id,
      x: gate.x ?? Math.round(gateStart + index * gateStep),
      width: gate.width ?? (compact
        ? Math.max(8, Math.round(width * 0.07))
        : Math.max(54, Math.round(width * 0.07)))
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

export function defaultPlacement(layout: GauntletLayout): Required<GauntletProjectPlacement> {
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
  spatialScale = 1
): { angle: number; index: number; radius: number } {
  const ordered = [...ids].sort((a, b) => a.localeCompare(b))
  const index = Math.max(0, ordered.indexOf(id))
  const t = ordered.length > 1 ? index / (ordered.length - 1) : 0.5
  // Keep positives on the upper arc so they read as lift/balloons. Avoid
  // angles in the lower half-plane; y increases downward in canvas space.
  return {
    angle: -Math.PI * 0.82 + t * Math.PI * 0.64,
    index,
    radius: (48 + (index % 2) * 6) * spatialScale
  }
}

export function defaultViability<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  positiveProperties: Map<string, GauntletPropertyDefinition>,
  negativeProperties: Map<string, GauntletPropertyDefinition>
): number {
  const lift = project.activePositiveIds.reduce(
    (sum, id) => sum + (positiveProperties.get(id)?.value ?? 1),
    0
  )
  const missing = project.missingPositiveIds.length + project.poppedPositiveIds.length
  const load = project.negativeIds.reduce(
    (sum, id) => sum + (negativeProperties.get(id)?.load ?? 1),
    0
  )
  return Math.max(0, Math.min(100, 75 + lift * 3 - load * 8 - project.delay * 1.2 - missing * 5))
}

export function createInitialState<TDatum extends Datum>(
  datum: TDatum,
  index: number,
  props: GauntletAccessors<TDatum>,
  positiveProperties: readonly GauntletPropertyDefinition[],
  negativeProperties: Map<string, GauntletPropertyDefinition>
): GauntletProjectState<TDatum> {
  const id = String(readAccessor(datum, index, props.idAccessor, datum.id != null ? String(datum.id) : `project-${index}`))
  const allPositiveIds = positiveProperties.map((property) => property.id)
  const activePositiveIds = [...readAccessor(datum, index, props.positiveAccessor, allPositiveIds)]
  const negativeIds = [...readAccessor(datum, index, props.negativeAccessor, [])].filter((id) =>
    negativeProperties.has(id)
  )
  const state: GauntletProjectState<TDatum> = {
    id,
    activePositiveIds,
    datum,
    delay: 0,
    eventsApplied: [],
    eventHistory: [],
    killed: false,
    metrics: { ...readAccessor(datum, index, props.metricsAccessor, {}) },
    missingPositiveIds: allPositiveIds.filter((propertyId) => !activePositiveIds.includes(propertyId)),
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
  coreBody?: GauntletCoreBodyFn<TDatum>
): PhysicsQueuedSpawn[] {
  const spatialScale = gauntletSpatialScale(layout)
  const defaultCoreRadius = Math.max(3, 28 * spatialScale)
  const coreX = placement.startX
  const coreY = placement.startY + (
    placement.startY === layout.routeY ? projectIndex * 38 * spatialScale : 0
  )
  const corePatch = coreBody?.(project, projectIndex, layout, placement) ?? {}
  const authoredCoreX = corePatch.x ?? coreX
  const authoredCoreY = corePatch.y ?? coreY
  const coreDatum = {
    __gauntlet: true,
    kind: CORE_KIND,
    projectId: project.id,
    sourceDatum: project.datum
  } satisfies GauntletBodyDatum<TDatum>
  const spawns: PhysicsQueuedSpawn[] = [
    {
      ...corePatch,
      id: projectCoreId(project.id),
      x: authoredCoreX,
      y: authoredCoreY,
      vx: corePatch.vx ?? 42,
      vy: corePatch.vy ?? 0,
      mass: corePatch.mass ?? 7,
      bodyCollisions: corePatch.bodyCollisions ?? true,
      shape: corePatch.shape ?? { type: "circle", radius: defaultCoreRadius },
      spawnAt: corePatch.spawnAt ?? project.startedAt,
      datum: coreDatum
    }
  ]
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
  spawns[0].x = clampedCore.x
  spawns[0].y = clampedCore.y

  for (const propertyId of project.activePositiveIds) {
    const property = positiveProperties.get(propertyId)
    if (!property) continue
    const slot = featureSlot(project.activePositiveIds, propertyId, spatialScale)
    const radius = property.radius ?? Math.max(2, 10 * spatialScale)
    const rawX = clampedCore.x + Math.cos(slot.angle) * slot.radius
    const rawY = clampedCore.y + Math.sin(slot.angle) * slot.radius
    const pos = clampGauntletPoint(rawX, rawY, radius, layout)
    spawns.push({
      id: projectPositiveId(project.id, propertyId),
      x: pos.x,
      y: pos.y,
      vx: Math.cos(slot.angle) * 18,
      vy: Math.sin(slot.angle) * 18,
      mass: property.mass ?? 0.75,
      bodyCollisions: false,
      shape: { type: "circle", radius },
      spawnAt: corePatch.spawnAt ?? project.startedAt,
      datum: {
        __gauntlet: true,
        kind: POSITIVE_KIND,
        projectId: project.id,
        property,
        sourceDatum: project.datum
      } satisfies GauntletBodyDatum<TDatum>,
      springs: property.spring === false ? [] : [
        {
          target: { type: "body", bodyId: projectCoreId(project.id) },
          stiffness: 0.56,
          damping: 0.9,
          restLength: Math.max(6, (52 + (slot.index % 2) * 4) * spatialScale),
          ...(property.spring ?? {})
        }
      ]
    })
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
  config: NonNullable<import("../../stream/physics/PhysicsPipelineStore").PhysicsPipelineConfig>
  initialSpawns: PhysicsQueuedSpawn[]
  layout: GauntletLayout
} {
  const size = options.size ?? [900, 520]
  const layout = buildLayout(size, options.gates, options.crashOffset ?? 30)
  const positiveProperties = options.positiveProperties ?? []
  const positiveById = new Map(positiveProperties.map((p) => [p.id, p]))
  const negativeById = new Map(
    (options.negativeProperties ?? []).map((p) => [p.id, p])
  )
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
        options.viability?.(state, {
          negativeProperties: negativeById,
          positiveProperties: positiveById
        }) ?? defaultViability(state, positiveById, negativeById)
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
  const spatialScale = gauntletSpatialScale(layout)
  const radius = property.radius ?? Math.max(2, 7.2 * spatialScale)
  const pos = clampGauntletPoint(
    x + (-12 + (index % 4) * 12) * spatialScale,
    y + (54 + Math.floor(index / 4) * 12) * spatialScale,
    radius,
    layout
  )
  return {
    id: projectNegativeId(project.id, property.id, index),
    x: pos.x,
    y: pos.y,
    vx: 10,
    vy: 6,
    mass: property.mass ?? 0.72,
    bodyCollisions: false,
    shape: { type: "circle", radius },
    spawnAt,
    datum: {
      __gauntlet: true,
      kind: NEGATIVE_KIND,
      projectId: project.id,
      property,
      sourceDatum: project.datum
    } satisfies GauntletBodyDatum<TDatum>,
    springs: property.spring === false ? [] : [
      {
        target: { type: "body", bodyId: projectCoreId(project.id) },
        stiffness: 0.62,
        damping: 0.92,
        restLength: Math.max(6, (52 + (index % 4) * 3) * spatialScale),
        ...(property.spring ?? {})
      }
    ]
  }
}
