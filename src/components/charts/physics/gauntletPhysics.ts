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
  type GauntletEffect,
  type GauntletEvent,
  type GauntletEventContext,
  type GauntletEventLogItem,
  type GauntletGate,
  type GauntletLayout,
  type GauntletNegativeReplacementOptions,
  type GauntletPopSpec,
  type GauntletProjectPlacement,
  type GauntletProjectPlacementFn,
  type GauntletProjectState,
  type GauntletPropertyDefinition,
  type GauntletPropertyWorkPlan,
  type GauntletPropertyWorkPlanOptions,
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
  layout: Pick<GauntletLayout, "width" | "floorY">
): NonNullable<PhysicsPipelineConfig["colliders"]> {
  return [
    {
      id: "gauntlet-left",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: 28,
        y1: 76,
        x2: 28,
        y2: layout.floorY,
        thickness: 8
      }
    },
    {
      id: "gauntlet-ceiling",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: 28,
        y1: 76,
        x2: layout.width - 30,
        y2: 76,
        thickness: 8
      }
    },
    {
      id: "gauntlet-floor",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: 28,
        y1: layout.floorY,
        x2: layout.width - 30,
        y2: layout.floorY,
        thickness: 8
      }
    },
    {
      id: "gauntlet-right",
      restitution: 0.12,
      friction: 0.42,
      shape: {
        type: "segment",
        x1: layout.width - 30,
        y1: 76,
        x2: layout.width - 30,
        y2: layout.floorY,
        thickness: 8
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

export function expandIds(input: readonly string[] | Record<string, number> | undefined): string[] {
  if (!input) return []
  if (Array.isArray(input)) return [...input]
  return Object.entries(input).flatMap(([id, count]) =>
    Array.from({ length: Math.max(0, Math.round(Number(count) || 0)) }, () => id)
  )
}

export function isReadonlyStringArray(value: GauntletPopSpec | undefined): value is readonly string[] {
  return Array.isArray(value)
}

export function resolvePopSpecIds(
  attachedIds: readonly string[],
  popSpec: GauntletPopSpec | undefined
): string[] {
  if (!popSpec) return []
  if (isReadonlyStringArray(popSpec)) return [...popSpec]
  if (popSpec.ids) return [...popSpec.ids]
  if (!popSpec.candidates) return []
  return popSpec.candidates
    .filter((id: string) => attachedIds.includes(id))
    .slice(0, popSpec.count ?? 1)
}

export function resolvePopPositiveIds<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  effect: GauntletEffect
): string[] {
  return resolvePopSpecIds(project.activePositiveIds, effect.popPositive)
}

/**
 * Select attached property occurrences without exceeding a bounded work
 * budget. Selection is deterministic: property priority, then attachment
 * order. Expensive occurrences are skipped so later affordable work can fit.
 */
export function planGauntletPropertyWork(
  options: GauntletPropertyWorkPlanOptions
): GauntletPropertyWorkPlan {
  const budgetValue = Number(options.budget)
  const budget = Number.isFinite(budgetValue) ? Math.max(0, budgetValue) : 0
  const properties =
    options.properties instanceof Map
      ? options.properties
      : new Map(options.properties.map((property) => [property.id, property]))
  const candidates = options.candidates ? new Set(options.candidates) : null
  const occurrences = options.attachedIds
    .map((id, index) => {
      const property = properties.get(id)
      const workValue = Number(property?.work ?? 1)
      const priorityValue = Number(property?.priority ?? index)
      return {
        id,
        index,
        priority: Number.isFinite(priorityValue) ? priorityValue : index,
        work: Number.isFinite(workValue) && workValue > 0 ? workValue : 1
      }
    })
    .filter((entry) => !candidates || candidates.has(entry.id))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)

  const ids: string[] = []
  const skippedIds: string[] = []
  let used = 0
  for (const entry of occurrences) {
    if (used + entry.work > budget + Number.EPSILON) {
      skippedIds.push(entry.id)
      continue
    }
    ids.push(entry.id)
    used += entry.work
  }

  return {
    ids,
    used,
    budget,
    remaining: Math.max(0, budget - used),
    skippedIds
  }
}

/** Build one add/pop effect for an occurrence-preserving replacement. */
export function replaceGauntletNegative<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  options: GauntletNegativeReplacementOptions
): GauntletEffect {
  if (!options.from || !options.to || options.from === options.to) return {}
  const requested = Math.max(0, Math.floor(Number(options.count ?? 1) || 0))
  const available = project.negativeIds.filter((id) => id === options.from).length
  const count = Math.min(requested, available)
  if (!count) return {}
  return {
    addNegative: { [options.to]: count },
    popNegative: {
      ids: Array.from({ length: count }, () => options.from)
    }
  }
}

/**
 * Resolve which negative property instances to detach. Returns body indices
 * into `project.negativeIds` so multi-instance loads keep stable body ids.
 */
export function resolvePopNegativeEntries<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  effect: GauntletEffect
): Array<{ propertyId: string; index: number }> {
  const wanted = resolvePopSpecIds(project.negativeIds, effect.popNegative)
  if (!wanted.length) return []
  const remaining = new Map<string, number>()
  for (const id of wanted) {
    remaining.set(id, (remaining.get(id) ?? 0) + 1)
  }
  const entries: Array<{ propertyId: string; index: number }> = []
  project.negativeIds.forEach((propertyId, index) => {
    const count = remaining.get(propertyId) ?? 0
    if (count <= 0) return
    entries.push({ propertyId, index })
    remaining.set(propertyId, count - 1)
  })
  return entries
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

/**
 * Keep body centers inside the playable gauntlet corridor so satellite
 * property particles never spawn or settle outside the left/right walls
 * (the "stuck on the left" regression for Homes on Main Street).
 */
export function clampGauntletPoint(
  x: number,
  y: number,
  radius: number,
  layout: Pick<GauntletLayout, "width" | "floorY">
): { x: number; y: number } {
  const pad = Math.max(2, radius + 2)
  const minX = GAUNTLET_WALL.left + GAUNTLET_WALL.thickness / 2 + pad
  const maxX = layout.width - GAUNTLET_WALL.rightInset - GAUNTLET_WALL.thickness / 2 - pad
  const minY = GAUNTLET_WALL.top + GAUNTLET_WALL.thickness / 2 + pad
  const maxY = layout.floorY - pad
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  }
}

export function buildLayout(size: [number, number], gates: readonly GauntletGate[] | undefined, crashOffset: number): GauntletLayout {
  const [width, height] = size
  const routeY = Math.round(height * 0.48)
  const floorY = height - 36
  const enabledGates = (gates ?? []).filter((gate) => gate.enabled !== false)
  const gateCount = Math.max(1, enabledGates.length)
  const gateStart = width * 0.22
  const gateEnd = width * 0.78
  const gateStep = gateCount <= 1 ? 0 : (gateEnd - gateStart) / (gateCount - 1)
  // Start far enough right that positive-property orbits (radius ~72–80)
  // never clear the left wall on spawn.
  const startX = Math.max(Math.round(width * 0.14), 110)
  return {
    crashY: floorY - crashOffset,
    floorY,
    gates: enabledGates.map((gate, index) => ({
      ...gate,
      id: gate.id,
      x: gate.x ?? Math.round(gateStart + index * gateStep),
      width: gate.width ?? Math.max(54, Math.round(width * 0.07))
    })),
    graveyardX: Math.round(width * 0.84),
    graveyardY: floorY - 4,
    height,
    routeY,
    socketX: Math.round(width * 0.92),
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

export function featureSlot(ids: readonly string[], id: string): { angle: number; index: number; radius: number } {
  const ordered = [...ids].sort((a, b) => a.localeCompare(b))
  const index = Math.max(0, ordered.indexOf(id))
  const t = ordered.length > 1 ? index / (ordered.length - 1) : 0.5
  // Keep positives on the upper arc so they read as lift/balloons. Avoid
  // angles in the lower half-plane; y increases downward in canvas space.
  return {
    angle: -Math.PI * 0.82 + t * Math.PI * 0.64,
    index,
    radius: 48 + (index % 2) * 6
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
  const coreX = placement.startX
  const coreY = placement.startY + (placement.startY === layout.routeY ? projectIndex * 38 : 0)
  const corePatch = coreBody?.(project, projectIndex, layout, placement) ?? {}
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
      x: corePatch.x ?? coreX,
      y: corePatch.y ?? coreY,
      vx: corePatch.vx ?? 42,
      vy: corePatch.vy ?? 0,
      mass: corePatch.mass ?? 7,
      bodyCollisions: corePatch.bodyCollisions ?? true,
      shape: corePatch.shape ?? { type: "circle", radius: 28 },
      spawnAt: corePatch.spawnAt ?? project.startedAt,
      datum: coreDatum
    }
  ]
  const coreRadius =
    corePatch.shape && "radius" in corePatch.shape
      ? Number(corePatch.shape.radius) || 28
      : 28
  const clampedCore = clampGauntletPoint(coreX, coreY, coreRadius, layout)
  spawns[0].x = clampedCore.x
  spawns[0].y = clampedCore.y

  for (const propertyId of project.activePositiveIds) {
    const property = positiveProperties.get(propertyId)
    if (!property) continue
    const slot = featureSlot(project.activePositiveIds, propertyId)
    const radius = property.radius ?? 10
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
          restLength: 52 + (slot.index % 2) * 4,
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
  layout: Pick<GauntletLayout, "width" | "floorY">,
  spawnAt?: number
): PhysicsQueuedSpawn {
  const radius = property.radius ?? 7.2
  const pos = clampGauntletPoint(
    x - 12 + (index % 4) * 12,
    y + 54 + Math.floor(index / 4) * 12,
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
        restLength: 52 + (index % 4) * 3,
        ...(property.spring ?? {})
      }
    ]
  }
}

/**
 * Pure project-state transition for a single gate effect. Exported so unit
 * tests can cover popPositive / popNegative / add* without driving the
 * full physics tick loop.
 */
export function applyGauntletEffect<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  effect: GauntletEffect,
  context: GauntletEventContext<TDatum>
): GauntletProjectState<TDatum> {
  if (effect.when && !effect.when(context)) return project
  let next = { ...project }
  const popIds = resolvePopPositiveIds(next, effect)
  if (popIds.length) {
    next = {
      ...next,
      activePositiveIds: next.activePositiveIds.filter((id) => !popIds.includes(id)),
      poppedPositiveIds: Array.from(new Set([...next.poppedPositiveIds, ...popIds]))
    }
  }
  const popNegativeEntries = resolvePopNegativeEntries(next, effect)
  if (popNegativeEntries.length) {
    const removeIndices = new Set(popNegativeEntries.map((entry) => entry.index))
    next = {
      ...next,
      negativeIds: next.negativeIds.filter((_, index) => !removeIndices.has(index)),
      poppedNegativeIds: [
        ...next.poppedNegativeIds,
        ...popNegativeEntries.map((entry) => entry.propertyId)
      ]
    }
  }
  const addedPositive = expandIds(effect.addPositive)
  if (addedPositive.length) {
    next = {
      ...next,
      activePositiveIds: Array.from(new Set([...next.activePositiveIds, ...addedPositive])),
      missingPositiveIds: next.missingPositiveIds.filter((id) => !addedPositive.includes(id))
    }
  }
  const addedNegative = expandIds(effect.addNegative)
  if (addedNegative.length) {
    next = {
      ...next,
      negativeIds: [...next.negativeIds, ...addedNegative]
    }
  }
  if (effect.delayDelta) {
    next = { ...next, delay: next.delay + effect.delayDelta }
  }
  if (effect.metricsDelta) {
    const metrics = { ...next.metrics }
    for (const [key, value] of Object.entries(effect.metricsDelta)) {
      metrics[key] = Number(metrics[key] ?? 0) + value
    }
    next = { ...next, metrics }
  }
  if (effect.viabilityDelta) {
    next = { ...next, viability: next.viability + effect.viabilityDelta }
  }
  if (effect.stage) next = { ...next, stage: effect.stage }
  if (effect.outcome) next = { ...next, outcome: effect.outcome }
  return next
}

export function eventLogItem(event: GauntletEvent, effects: readonly GauntletEffect[]): GauntletEventLogItem {
  return {
    id: event.id,
    label: event.label ?? event.id,
    summary: event.summary ?? effects.find((effect) => effect.summary)?.summary,
    time: event.time
  }
}

/** Append one semantic event exactly once, even when render ticks outpace state commits. */
export function recordGauntletEvent<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  logItem: GauntletEventLogItem
): GauntletProjectState<TDatum> {
  if (project.eventsApplied.includes(logItem.id)) return project
  return {
    ...project,
    eventsApplied: [...project.eventsApplied, logItem.id],
    eventHistory: [...(project.eventHistory ?? []), logItem],
    lastEvent: logItem,
    stage: logItem.label ?? project.stage
  }
}

export function projectRouteTarget<TDatum extends Datum>(
  elapsed: number,
  project: GauntletProjectState<TDatum>,
  layout: GauntletLayout,
  placement: Required<GauntletProjectPlacement>,
  events: readonly GauntletEvent[],
  gateById: Map<string, GauntletLayout["gates"][number]>,
  terminalBehavior: "outcome" | "hold-last"
): { x: number; y: number } {
  if (project.killed) return { x: project.metrics.lastX ?? placement.graveyardX, y: placement.graveyardY }
  const finalEvent = events[events.length - 1]
  if (!finalEvent) return { x: placement.socketX, y: placement.routeY }
  const waitingForCapacity = events.find((event) => {
    if (event.time > elapsed || project.eventsApplied.includes(event.id)) {
      return false
    }
    return Boolean(event.gateId && gateById.get(event.gateId)?.capacity)
  })
  const routeElapsed = waitingForCapacity
    ? Math.min(elapsed, waitingForCapacity.time)
    : elapsed
  const successful = project.outcome === "built" || project.outcome === "built_diminished"
  if (routeElapsed > finalEvent.time + 0.85) {
    if (terminalBehavior === "hold-last") {
      const gate = finalEvent.gateId ? gateById.get(finalEvent.gateId) : undefined
      return {
        x: finalEvent.routeX ?? gate?.x ?? placement.socketX,
        y: finalEvent.routeY ?? placement.routeY
      }
    }
    return successful
      ? { x: placement.socketX, y: placement.socketY }
      : { x: placement.graveyardX, y: placement.graveyardY - 14 }
  }
  const burden =
    project.delay * 0.85 +
    project.negativeIds.length * 12 +
    (project.poppedPositiveIds.length + project.missingPositiveIds.length) * 8
  const keyframes = [
    { time: 0, x: placement.startX, y: placement.startY },
    ...events.map((event) => {
      const gate = event.gateId ? gateById.get(event.gateId) : undefined
      return {
        time: event.time,
        x: event.routeX ?? gate?.x ?? placement.startX,
        y: event.routeY ?? placement.routeY + Math.min(180, burden) * 0.28
      }
    })
  ].sort((a, b) => a.time - b.time)
  let previous = keyframes[0]
  let next = keyframes[keyframes.length - 1]
  for (let index = 1; index < keyframes.length; index += 1) {
    if (routeElapsed <= keyframes[index].time) {
      next = keyframes[index]
      break
    }
    previous = keyframes[index]
  }
  const span = Math.max(0.1, next.time - previous.time)
  const tRaw = Math.max(0, Math.min(1, (routeElapsed - previous.time) / span))
  const t = tRaw * tRaw * (3 - 2 * tRaw)
  return {
    x: previous.x + (next.x - previous.x) * t,
    y:
      previous.y +
      (next.y - previous.y) * t +
      Math.sin(routeElapsed * 2.6) * 7
  }
}
