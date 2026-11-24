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
  gauntletSpatialScale,
  projectCoreId,
  projectNegativeId,
  positiveBodies,
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
import { expandIds, resolvePopNegativeEntries, inventoryChange } from "./gauntletEffects"

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

function settleAwareForce(
  body: PhysicsBodyState,
  force: { x: number; y: number }
): { x: number; y: number } | null {
  const speed = Math.hypot(body.vx, body.vy)
  // StreamPhysicsFrame treats every non-zero force as an impulse, which wakes
  // the body and restarts its sleep timer. Compound bodies asymptotically hover
  // around their spring target, so suppress their final sub-pixel correction
  // once both motion and the requested correction are visually negligible.
  return speed < 2 && Math.hypot(force.x, force.y) < 4 ? null : force
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
  const spatialScale = gauntletSpatialScale(layout)
  const negativeLoad = project.negativeIds.reduce(
    (sum, id) => sum + (negativeById.get(id)?.load ?? 1),
    0
  )
  const forward = project.killed ? 0 : 58 * Math.max(0.25, spatialScale)
  if (datum.kind !== CORE_KIND) {
    if (!core) return null
    let target: { x: number; y: number }
    const property = datum.property
    const siblingPosition = () => {
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
      return { count: matchingBodies.length, index: Math.max(
        0,
        matchingBodies.findIndex((candidate) => candidate.id === body.id)
      ) }
    }
    if (property?.target) {
      const { index } = siblingPosition()
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
      const slot = featureSlot(
        project.activePositiveIds,
        datum.property.id,
        spatialScale,
        datum.occurrence
      )
      target = {
        x: core.x + Math.cos(slot.angle) * slot.radius,
        y: core.y + Math.sin(slot.angle) * slot.radius - 2
      }
    } else {
      const { index, count: siblingCount } = siblingPosition()
      const row = Math.floor(index / 4)
      const count = Math.min(4, siblingCount - row * 4)
      const column = index % 4
      target = {
        x: core.x + (column - (count - 1) / 2) * 18 * spatialScale,
        y: core.y + (54 + row * 13) * spatialScale
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
    return settleAwareForce(body, {
      x: (target.x - body.x) * 28 - (body.vx - core.vx) * 3 + pull.x + forward * 0.01,
      y: (target.y - body.y) * 28 - (body.vy - core.vy) * 3 + pull.y - lift
    })
  }
  if (project.killed) {
    const crashX = project.crashX ?? project.metrics.lastX ?? body.x
    return settleAwareForce(body, {
      x: (crashX - body.x) * 44 - body.vx * 9,
      y: (160 + negativeLoad * 12) * spatialScale - body.vy * 1.6
    })
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
    return settleAwareForce(body, {
      x: (target.x - body.x) * 15 - body.vx * 1.8 + forward * 0.18,
      y: (placement.routeY - body.y) * 1.25 - body.vy * 1.4 + verticalBalance
    })
  }
  return settleAwareForce(body, {
    x: (target.x - body.x) * 15 - body.vx * 1.8 + forward * 0.18,
    y: (target.y - body.y) * 15 - body.vy * 1.8 + dragPull - positiveLift * 2.2
  })
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
    options?: { color?: string; durationMs?: number; radius?: number; scale?: number }
  ) => unknown
  /** Uniform pop-burst scale (see StreamPhysicsPopOptions.scale). */
  popScale?: number
}): void {
  const {
    project,
    effect,
    controls,
    layout,
    positiveById,
    negativeById,
    coreBody,
    popBodies,
    popScale
  } = options
  const bodies = controls.readBodies()
  const core = bodies.find(body => body.id === projectCoreId(project.id))
  const x = core?.x ?? layout.startX
  const y = core?.y ?? layout.routeY
  const negatives = bodies.filter(body => isProjectNegativeBody<TDatum>(body, project.id))
  const currentNegativeCount = negatives.reduce(
    (next, body) => Math.max(next, negativeBodyOrdinal(body) + 1), project.negativeIds.length
  )
  const spawns = expandIds(effect.addNegative).flatMap(
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
  const { removed, added, active } = inventoryChange(project.activePositiveIds, effect.popPositive, effect.addPositive, true)
  const previouslyAttached = removed.length ? positiveBodies(project.id, project.activePositiveIds) : []
  function popProperty(bodyId: string, property: GauntletPropertyDefinition | undefined, radius: number) {
    popBodies([bodyId], {
      color: property?.popColor ?? property?.color,
      durationMs: 900,
      radius: (property?.radius ?? radius) + 3,
      scale: popScale
    })
  }
  for (const { propertyId, index } of removed) {
    popProperty(previouslyAttached[index].bodyId, positiveById.get(propertyId), 10)
  }
  if (added.length) {
    const placement = { ...defaultPlacement(layout), routeY: y, socketY: y, startX: x, startY: y }
    spawns.push(...buildProjectSpawns(
      { ...project, activePositiveIds: active, negativeIds: [] }, 0, layout, placement,
      positiveById, negativeById, coreBody, active.length - added.length
    ))
  }
  if (spawns.length) controls.pushMany(spawns)
  const removedNegatives = resolvePopNegativeEntries(project, effect)
  if (!removedNegatives.length) return
  negatives.sort((a, b) => negativeBodyOrdinal(a) - negativeBodyOrdinal(b) || a.id.localeCompare(b.id))
  for (const { propertyId, index } of removedNegatives) {
    const match = negatives.findIndex(body => body.datum.property?.id === propertyId)
    const bodyId = match < 0 ? projectNegativeId(project.id, propertyId, index) : negatives.splice(match, 1)[0].id
    popProperty(bodyId, negativeById.get(propertyId), 7)
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
  const spatialScale = gauntletSpatialScale(layout)
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
        y: event.routeY ?? placement.routeY + Math.min(180, burden) * 0.28 * spatialScale
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
      Math.sin(routeElapsed * 2.6) * 7 * spatialScale
  }
}
