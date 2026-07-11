import type { PhysicsBodyState, PhysicsColliderBodyFilter } from "./PhysicsKernel"
import type {
  PhysicsController
} from "./PhysicsControllers"
import type { StreamPhysicsBodyForceContext } from "./StreamPhysicsFrame"
import type {
  DependencyGateOptions,
  DependencyGateSnapshot,
  ServiceLevelCaseInfo,
  ServiceLevelCaseState,
  ServiceLevelControllerOptions,
  ServiceLevelSnapshot,
  ServiceResourceAssignment,
  ServiceResourcePoolOptions,
  ServiceResourcePoolSnapshot
} from "./ServiceOperationsTypes"

function valueAtPath(source: unknown, path: string): unknown {
  if (!path) return undefined
  let current = source
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function matchesFilter(
  body: PhysicsBodyState,
  filter: PhysicsColliderBodyFilter | undefined
): boolean {
  if (!filter) return true
  if (typeof filter === "function") return filter(body)
  const value = valueAtPath(body, filter.property)
  if ("equals" in filter && !Object.is(value, filter.equals)) return false
  if ("notEquals" in filter && Object.is(value, filter.notEquals)) return false
  if (filter.oneOf && !filter.oneOf.some((candidate) => Object.is(value, candidate))) return false
  return !(filter.notOneOf && filter.notOneOf.some((candidate) => Object.is(value, candidate)))
}

export interface ServiceResourcePoolController extends PhysicsController {
  assign: (caseBodyId: string) => ServiceResourceAssignment | null
  release: (caseBodyId: string) => boolean
  getAssignment: (caseBodyId: string) => ServiceResourceAssignment | undefined
  getSnapshot: () => ServiceResourcePoolSnapshot
}

/**
 * Models finite, visible service resources. Assignment is intentionally
 * explicit so domain controllers decide scheduling while this controller
 * supplies physical tethers, return-to-home force, and resource evidence.
 */
export function createServiceResourcePoolController(
  options: ServiceResourcePoolOptions
): ServiceResourcePoolController {
  const resources = options.resources.map((resource) => ({
    ...resource,
    bodyId: resource.bodyId ?? resource.id
  }))
  const resourceByBodyId = new Map(resources.map((resource) => [resource.bodyId, resource]))
  const assignmentByCaseId = new Map<string, ServiceResourceAssignment>()
  const assignmentByResourceId = new Map<string, ServiceResourceAssignment>()
  const assignmentForce = options.assignmentForce ?? 0.45
  const returnForce = options.returnForce ?? 0.35
  const caseAttraction = options.caseAttraction ?? 0.08
  const assignmentOffset = options.assignmentOffset ?? { x: 0, y: 0 }
  let bodiesById = new Map<string, PhysicsBodyState>()
  let currentTime = 0
  let metricRevision = 0

  const snapshot = (): ServiceResourcePoolSnapshot => ({
    total: resources.length,
    available: resources.length - assignmentByResourceId.size,
    assigned: assignmentByResourceId.size,
    assignments: Array.from(assignmentByCaseId.values()),
    simulatedAt: currentTime,
    metricRevision
  })

  const controller: ServiceResourcePoolController = {
    id: options.id ?? "service-resource-pool",
    continuous: true,
    assign: (caseBodyId) => {
      const existing = assignmentByCaseId.get(caseBodyId)
      if (existing) return existing
      const resource = resources.find((candidate) => !assignmentByResourceId.has(candidate.id))
      if (!resource) return null
      const assignment: ServiceResourceAssignment = {
        resourceId: resource.id,
        resourceBodyId: resource.bodyId,
        caseBodyId,
        assignedAt: currentTime
      }
      assignmentByCaseId.set(caseBodyId, assignment)
      assignmentByResourceId.set(resource.id, assignment)
      metricRevision += 1
      return assignment
    },
    release: (caseBodyId) => {
      const assignment = assignmentByCaseId.get(caseBodyId)
      if (!assignment) return false
      assignmentByCaseId.delete(caseBodyId)
      assignmentByResourceId.delete(assignment.resourceId)
      metricRevision += 1
      return true
    },
    getAssignment: (caseBodyId) => assignmentByCaseId.get(caseBodyId),
    tick: (ctx) => {
      currentTime = Math.max(currentTime, ctx.elapsed)
      bodiesById = new Map(ctx.controls.readBodies().map((body) => [body.id, body]))
      for (const [caseBodyId, assignment] of assignmentByCaseId) {
        if (bodiesById.has(caseBodyId) && bodiesById.has(assignment.resourceBodyId)) continue
        assignmentByCaseId.delete(caseBodyId)
        assignmentByResourceId.delete(assignment.resourceId)
        metricRevision += 1
      }
    },
    getSnapshot: snapshot,
    bodyForce: (context) => {
      const resource = resourceByBodyId.get(context.body.id)
      if (resource) {
        const assignment = assignmentByResourceId.get(resource.id)
        const target = assignment ? bodiesById.get(assignment.caseBodyId) : undefined
        const targetX = target ? target.x + (assignmentOffset.x ?? 0) : resource.home.x
        const targetY = target ? target.y + (assignmentOffset.y ?? 0) : resource.home.y
        const force = assignment ? assignmentForce : returnForce
        return { x: (targetX - context.body.x) * force, y: (targetY - context.body.y) * force }
      }
      const assignment = assignmentByCaseId.get(context.body.id)
      if (!assignment || caseAttraction <= 0) return null
      const resourceBody = bodiesById.get(assignment.resourceBodyId)
      if (!resourceBody) return null
      return {
        x: (resourceBody.x - context.body.x) * caseAttraction,
        y: (resourceBody.y - context.body.y) * caseAttraction
      }
    }
  }
  return controller
}

export interface ServiceLevelController extends PhysicsController {
  protect: (bodyId: string) => boolean
  complete: (bodyId: string) => boolean
  getCase: (bodyId: string) => ServiceLevelCaseInfo | undefined
  getSnapshot: () => ServiceLevelSnapshot
}

function deadlineFor(body: PhysicsBodyState, options: ServiceLevelControllerOptions): number {
  const raw = typeof options.deadlineAccessor === "function"
    ? options.deadlineAccessor(body)
    : valueAtPath(body.datum, options.deadlineAccessor) ?? valueAtPath(body, options.deadlineAccessor)
  return Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0
}

/** Tracks service-level outcomes independently from the force simulation. */
export function createServiceLevelController(
  options: ServiceLevelControllerOptions
): ServiceLevelController {
  const cases = new Map<string, ServiceLevelCaseInfo>()
  let currentTime = 0
  let metricRevision = 0

  function update(caseInfo: ServiceLevelCaseInfo): void {
    cases.set(caseInfo.bodyId, caseInfo)
    metricRevision += 1
    options.onStateChange?.({ ...caseInfo })
  }

  function complete(bodyId: string): boolean {
    const caseInfo = cases.get(bodyId)
    if (!caseInfo || caseInfo.completedAt != null) return false
    update({
      ...caseInfo,
      completedAt: currentTime,
      state: caseInfo.state === "unhappy" ? "resolved-unhappy" : "resolved"
    })
    return true
  }

  return {
    id: options.id ?? "service-level",
    continuous: true,
    protect: (bodyId) => {
      const caseInfo = cases.get(bodyId)
      if (!caseInfo || caseInfo.completedAt != null || caseInfo.state === "unhappy") return false
      update({ ...caseInfo, state: "protected", protectedAt: currentTime })
      return true
    },
    complete,
    getCase: (bodyId) => cases.get(bodyId),
    tick: (ctx) => {
      currentTime = Math.max(currentTime, ctx.elapsed)
      for (const body of ctx.controls.readBodies()) {
        if (!matchesFilter(body, options.bodyFilter)) continue
        if (!cases.has(body.id)) {
          const deadline = deadlineFor(body, options)
          update({ bodyId: body.id, openedAt: currentTime, deadlineAt: currentTime + deadline, state: "waiting" })
        }
        const caseInfo = cases.get(body.id)
        if (!caseInfo || caseInfo.completedAt != null) continue
        const inCompletion = options.completionRegionId
          ? ctx.getRegionState(body.id)?.activeRegionIds.includes(options.completionRegionId)
          : false
        if (inCompletion) {
          complete(body.id)
        } else if (caseInfo.state === "waiting" && currentTime >= caseInfo.deadlineAt) {
          update({ ...caseInfo, state: "unhappy" })
        }
      }
    },
    getSnapshot: () => {
      const values = Array.from(cases.values())
      const count = (state: ServiceLevelCaseState) => values.filter((value) => value.state === state).length
      return {
        total: values.length,
        waiting: count("waiting"),
        protected: count("protected"),
        unhappy: count("unhappy"),
        resolved: count("resolved"),
        resolvedUnhappy: count("resolved-unhappy"),
        simulatedAt: currentTime,
        metricRevision
      }
    }
  }
}

export interface DependencyGateController extends PhysicsController {
  getSnapshot: () => DependencyGateSnapshot
}

/** Holds dependency-bound work until an external condition or scheduled recovery opens. */
export function createDependencyGateController(
  options: DependencyGateOptions
): DependencyGateController {
  const held = new Set<string>()
  let currentTime = 0
  let released = 0
  let metricRevision = 0
  let open = false

  function gateOpen(time: number): boolean {
    if (options.isOpen) return options.isOpen(time)
    return options.opensAt != null && time >= options.opensAt
  }

  return {
    id: options.id ?? `dependency-gate:${options.regionId}`,
    continuous: true,
    tick: (ctx) => {
      currentTime = Math.max(currentTime, ctx.elapsed)
      const wasOpen = open
      open = gateOpen(currentTime)
      const bodies = ctx.controls.readBodies()
      const present = new Map(bodies.map((body) => [body.id, body]))
      for (const body of bodies) {
        const inside = ctx.getRegionState(body.id)?.activeRegionIds.includes(options.regionId)
        if (!inside || !matchesFilter(body, options.bodyFilter)) continue
        if (!open && !held.has(body.id)) {
          held.add(body.id)
          metricRevision += 1
          options.onHeld?.(body)
        }
      }
      if (open && !wasOpen) {
        for (const bodyId of held) {
          const body = present.get(bodyId)
          if (!body) continue
          ctx.controls.applyImpulse(bodyId, options.releaseImpulse?.x ?? 86, options.releaseImpulse?.y ?? 0)
          released += 1
          options.onReleased?.(body)
        }
        held.clear()
        metricRevision += 1
      }
      for (const bodyId of held) {
        if (!present.has(bodyId)) {
          held.delete(bodyId)
          metricRevision += 1
        }
      }
    },
    getSnapshot: () => ({
      regionId: options.regionId,
      isOpen: open,
      blocked: held.size,
      released,
      simulatedAt: currentTime,
      metricRevision
    }),
    bodyForce: (context: StreamPhysicsBodyForceContext) => {
      if (open || !held.has(context.body.id)) return null
      const region = context.regions?.find((candidate) => candidate.id === options.regionId)
      const shape = region?.shape
      if (!shape || shape.type !== "aabb") return { x: -context.body.vx * 0.8, y: -context.body.vy * 0.8 }
      const force = options.holdForce ?? 0.4
      return {
        x: (shape.x - context.body.x) * force - context.body.vx * 0.45,
        y: (shape.y - context.body.y) * force - context.body.vy * 0.45
      }
    }
  }
}
