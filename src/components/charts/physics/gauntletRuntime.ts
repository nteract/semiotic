/**
 * Gauntlet per-frame body force + tick helpers (no React).
 */
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { PhysicsPipelineControlSurface } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import {
  CORE_KIND,
  NEGATIVE_KIND,
  POSITIVE_KIND,
  buildNegativeSpawn,
  buildProjectSpawns,
  clampGauntletPoint,
  defaultPlacement,
  featureSlot,
  projectCoreId,
  projectNegativeId,
  projectPositiveId,
  resolvePlacement,
  type GauntletBodyDatum,
  type GauntletCoreBodyFn,
  type GauntletEffect,
  type GauntletEvent,
  type GauntletLayout,
  type GauntletProjectPlacement,
  type GauntletProjectPlacementFn,
  type GauntletProjectState,
  type GauntletPropertyDefinition
} from "./gauntletPhysics"
import { expandIds, resolvePopNegativeEntries, resolvePopPositiveIds } from "./gauntletEffects"

function isProjectNegativeBody<TDatum extends Datum>(
  body: PhysicsBodyState,
  projectId: string
): body is PhysicsBodyState & { datum: GauntletBodyDatum<TDatum> } {
  const datum = body.datum as GauntletBodyDatum<TDatum> | undefined
  return Boolean(
    datum?.__gauntlet &&
      datum.projectId === projectId &&
      datum.kind === NEGATIVE_KIND
  )
}

function negativeBodyOrdinal(body: PhysicsBodyState): number {
  const suffix = body.id.slice(body.id.lastIndexOf(":") + 1)
  const ordinal = Number(suffix)
  return Number.isFinite(ordinal) ? ordinal : -1
}

function nextNegativeBodyIndex<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  bodies: readonly PhysicsBodyState[]
): number {
  let maxOrdinal = -1
  for (const body of bodies) {
    if (!isProjectNegativeBody<TDatum>(body, project.id)) continue
    maxOrdinal = Math.max(maxOrdinal, negativeBodyOrdinal(body))
  }
  return Math.max(project.negativeIds.length, maxOrdinal + 1)
}

function resolveNegativeBodyIdsForPop<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  bodies: readonly PhysicsBodyState[],
  entries: Array<{ propertyId: string; index: number }>
): string[] {
  const candidates = bodies
    .filter((body) => isProjectNegativeBody<TDatum>(body, project.id))
    .sort((a, b) => negativeBodyOrdinal(a) - negativeBodyOrdinal(b) || a.id.localeCompare(b.id))
  const used = new Set<string>()

  return entries.map((entry) => {
    const body = candidates.find((candidate) => {
      if (used.has(candidate.id)) return false
      return candidate.datum.property?.id === entry.propertyId
    })
    if (!body) return projectNegativeId(project.id, entry.propertyId, entry.index)
    used.add(body.id)
    return body.id
  })
}

export function computeGauntletBodyForce<TDatum extends Datum>(options: {
  body: PhysicsBodyState
  bodies: readonly PhysicsBodyState[]
  layout: GauntletLayout
  states: readonly GauntletProjectState<TDatum>[]
  projectPlacement: GauntletProjectPlacementFn<TDatum> | undefined
  positiveById: Map<string, GauntletPropertyDefinition>
  negativeById: Map<string, GauntletPropertyDefinition>
  projectEvents: (project: GauntletProjectState<TDatum>) => readonly GauntletEvent[]
  gateById: Map<string, GauntletLayout["gates"][number]>
  coreForceMode: "route" | "net"
  terminalBehavior: "outcome" | "hold-last"
  elapsed: number
}): { x: number; y: number } | null {
  const {
    body,
    bodies,
    layout,
    states,
    projectPlacement,
    positiveById,
    negativeById,
    projectEvents,
    gateById,
    coreForceMode,
    terminalBehavior,
    elapsed
  } = options
  const datum = body.datum as GauntletBodyDatum<TDatum> | undefined
  if (!datum?.__gauntlet) return null
  const projectIndex = states.findIndex((state) => state.id === datum.projectId)
  const project = projectIndex >= 0 ? states[projectIndex] : undefined
  if (!project) return null
  const placement = resolvePlacement(project, projectIndex, layout, projectPlacement)
  const core = bodies.find((candidate) => candidate.id === projectCoreId(project.id))
  const negativeLoad = project.negativeIds.reduce(
    (sum, id) => sum + (negativeById.get(id)?.load ?? 1),
    0
  )
  const forward = project.killed ? 0 : 58
  if (datum.kind !== CORE_KIND) {
    if (!core) return null
    let target: { x: number; y: number }
    const property = datum.property
    if (property?.target) {
      const matchingBodies = bodies
        .filter((candidate) => {
          const candidateDatum = candidate.datum as GauntletBodyDatum | undefined
          return (
            candidateDatum?.__gauntlet &&
            candidateDatum.projectId === project.id &&
            candidateDatum.kind === datum.kind
          )
        })
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      const index = Math.max(
        0,
        matchingBodies.findIndex((candidate) => candidate.id === body.id)
      )
      target = property.target({
        body,
        bodies,
        core,
        index,
        layout,
        placement,
        project
      }) ?? { x: core.x, y: core.y }
    } else if (datum.kind === POSITIVE_KIND && datum.property) {
      const slot = featureSlot(project.activePositiveIds, datum.property.id)
      target = {
        x: core.x + Math.cos(slot.angle) * slot.radius,
        y: core.y + Math.sin(slot.angle) * slot.radius - 2
      }
    } else {
      const negatives = bodies
        .filter(
          (candidate) =>
            (candidate.datum as GauntletBodyDatum | undefined)?.kind ===
              NEGATIVE_KIND &&
            (candidate.datum as GauntletBodyDatum).projectId === project.id
        )
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      const index = Math.max(
        0,
        negatives.findIndex((candidate) => candidate.id === body.id)
      )
      const row = Math.floor(index / 4)
      const count = Math.min(4, negatives.length - row * 4)
      const column = index % 4
      target = {
        x: core.x + (column - (count - 1) / 2) * 18,
        y: core.y + 54 + row * 13
      }
    }
    const bodyRadius = body.shape.type === "circle" ? body.shape.radius : 8
    target = clampGauntletPoint(target.x, target.y, bodyRadius, layout)
    const bodyClamped = clampGauntletPoint(body.x, body.y, bodyRadius, layout)
    const outside =
      Math.abs(bodyClamped.x - body.x) > 0.5 ||
      Math.abs(bodyClamped.y - body.y) > 0.5
    if (outside) {
      return {
        x: (bodyClamped.x - body.x) * 48 - body.vx * 6,
        y: (bodyClamped.y - body.y) * 48 - body.vy * 6
      }
    }
    const lift =
      datum.kind === POSITIVE_KIND && !project.killed
        ? (property?.buoyancy ?? property?.value ?? 1) * 3.2
        : 0
    const pull =
      datum.kind === NEGATIVE_KIND
        ? {
            x: (property?.pull?.x ?? -8) * 0.22,
            y: (property?.pull?.y ?? 22) * 0.22
          }
        : { x: 0, y: 0 }
    return {
      x: (target.x - body.x) * 28 - (body.vx - core.vx) * 3 + pull.x + forward * 0.01,
      y: (target.y - body.y) * 28 - (body.vy - core.vy) * 3 + pull.y - lift
    }
  }
  if (project.killed) {
    const crashX = project.crashX ?? project.metrics.lastX ?? body.x
    return {
      x: (crashX - body.x) * 44 - body.vx * 9,
      y: 160 + negativeLoad * 12 - body.vy * 1.6
    }
  }
  const projectEventsForRoute = projectEvents(project)
  const projectElapsed = Math.max(0, elapsed - (project.startedAt ?? 0))
  const target = projectRouteTarget(
    projectElapsed,
    project,
    layout,
    placement,
    projectEventsForRoute,
    gateById,
    terminalBehavior
  )
  const positiveLift = project.activePositiveIds.reduce(
    (sum, id) =>
      sum +
      (positiveById.get(id)?.buoyancy ?? positiveById.get(id)?.value ?? 1),
    0
  )
  const dragPull = negativeLoad * 13
  if (coreForceMode === "net") {
    const verticalBalance = (negativeLoad - positiveLift) * 32
    return {
      x: (target.x - body.x) * 15 - body.vx * 1.8 + forward * 0.18,
      y: (placement.routeY - body.y) * 1.25 - body.vy * 1.4 + verticalBalance
    }
  }
  return {
    x: (target.x - body.x) * 15 - body.vx * 1.8 + forward * 0.18,
    y: (target.y - body.y) * 15 - body.vy * 1.8 + dragPull - positiveLift * 2.2
  }
}

export function spawnBodiesForGauntletEffect<TDatum extends Datum>(options: {
  project: GauntletProjectState<TDatum>
  effect: GauntletEffect
  controls: PhysicsPipelineControlSurface
  layout: GauntletLayout
  positiveById: Map<string, GauntletPropertyDefinition>
  negativeById: Map<string, GauntletPropertyDefinition>
  coreBody?: GauntletCoreBodyFn<TDatum>
  popBodies: (
    ids: string[],
    options?: { color?: string; durationMs?: number; radius?: number }
  ) => unknown
}): void {
  const {
    project,
    effect,
    controls,
    layout,
    positiveById,
    negativeById,
    coreBody,
    popBodies
  } = options
  const core = controls
    .readBodies()
    .find((body) => body.id === projectCoreId(project.id))
  const bodies = controls.readBodies()
  const x = core?.x ?? layout.startX
  const y = core?.y ?? layout.routeY
  const currentNegativeCount = nextNegativeBodyIndex(project, bodies)
  const negativeSpawns = expandIds(effect.addNegative).flatMap(
    (propertyId, offset) => {
      const property = negativeById.get(propertyId)
      return property
        ? [
            buildNegativeSpawn(
              project,
              property,
              currentNegativeCount + offset,
              x,
              y,
              layout
            )
          ]
        : []
    }
  )
  const positiveSpawns = expandIds(effect.addPositive).flatMap((propertyId) => {
    const property = positiveById.get(propertyId)
    if (!property || project.activePositiveIds.includes(propertyId)) return []
    const placement = {
      ...defaultPlacement(layout),
      routeY: y,
      socketY: y,
      startX: x,
      startY: y
    }
    return buildProjectSpawns(
      { ...project, activePositiveIds: [propertyId], negativeIds: [] },
      0,
      layout,
      placement,
      positiveById,
      negativeById,
      coreBody
    ).filter((spawn) => spawn.id.includes(":positive:"))
  })
  if (negativeSpawns.length || positiveSpawns.length) {
    controls.pushMany([...negativeSpawns, ...positiveSpawns])
  }
  const popIds = resolvePopPositiveIds(project, effect)
  for (const propertyId of popIds) {
    const property = positiveById.get(propertyId)
    popBodies([projectPositiveId(project.id, propertyId)], {
      color: property?.popColor ?? property?.color,
      durationMs: 900,
      radius: (property?.radius ?? 10) + 3
    })
  }
  const popNegativeEntries = resolvePopNegativeEntries(project, effect)
  const popNegativeBodyIds = resolveNegativeBodyIdsForPop(
    project,
    bodies,
    popNegativeEntries
  )
  popNegativeEntries.forEach((entry, index) => {
    const property = negativeById.get(entry.propertyId)
    popBodies([popNegativeBodyIds[index]], {
      color: property?.popColor ?? property?.color,
      durationMs: 900,
      radius: (property?.radius ?? 7) + 3
    })
  })
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
