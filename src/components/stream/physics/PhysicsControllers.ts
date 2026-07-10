/**
 * Physics controller plugins — per-tick process logic that rides the
 * StreamPhysicsFrame heartbeat without rebuilding the world topology.
 *
 * Controllers are the process analogue of custom-layout restyle: geometry
 * (colliders, stage bands) is declared once; capacity queues, portals, and
 * other stateful process rules tick live.
 */

import type {
  PhysicsBodyState,
  PhysicsColliderBodyFilter
} from "./PhysicsKernel"
import type {
  PhysicsPipelineControlSurface,
  PhysicsPipelineTickResult
} from "./PhysicsPipelineStore"
import type {
  StreamPhysicsBodyForce,
  StreamPhysicsBodyForceContext,
  StreamPhysicsBodyRegionState,
  StreamPhysicsRegionVector
} from "./StreamPhysicsFrame"

export interface PhysicsControllerTickContext {
  result: PhysicsPipelineTickResult
  controls: PhysicsPipelineControlSurface
  /**
   * Exact simulated seconds advanced by the kernel for this callback:
   * `result.steps * fixedDt`. This is zero when a pipeline tick does not run a
   * fixed substep, so time-based controller work must not advance on that tick.
   */
  dt: number
  elapsed: number
  /**
   * Region membership for a body (active region ids, charges, attributes).
   * Backed by StreamPhysicsFrame region state.
   */
  getRegionState: (bodyId: string) => StreamPhysicsBodyRegionState | undefined
}

export interface PhysicsController {
  /** Stable id for debugging / observation. */
  id: string
  /**
   * Keep the RAF loop alive even when the kernel reports allSleeping.
   * Capacity queues and continuous process rules should set this true.
   */
  continuous?: boolean
  /**
   * Called after each store tick and continuous-force application. It may run
   * with `context.dt === 0` when the frame only synchronizes runtime state.
   */
  tick: (context: PhysicsControllerTickContext) => void
  /**
   * Optional force contribution composed into StreamPhysicsFrame bodyForces.
   * The frame integrates the returned vector over simulated fixed-step time
   * and applies no impulse when the tick advances zero substeps. Return null to
   * skip this body.
   */
  bodyForce?: (
    context: StreamPhysicsBodyForceContext
  ) => StreamPhysicsRegionVector | null | undefined
  /** Optional live metrics for settled projection / readouts. */
  getSnapshot?: () => unknown
  dispose?: () => void
}

/** Live capacity queue metrics for projection / evidence / UI. */
export interface CapacityQueueSnapshot {
  regionId: string
  queueDepth: number
  processedCount: number
  unitsPerSecond: number
  /** Remaining work units currently in queue. */
  remainingWork: number
  /** Mean remaining work among queued bodies. */
  meanRemainingWork: number
}

export interface ComposedPhysicsControllers {
  controllers: PhysicsController[]
  continuous: boolean
  onTick: (
    result: PhysicsPipelineTickResult,
    controls: PhysicsPipelineControlSurface,
    extras: {
      dt: number
      elapsed: number
      getRegionState: PhysicsControllerTickContext["getRegionState"]
    }
  ) => void
  bodyForce: StreamPhysicsBodyForce
}

function addVectors(
  a: StreamPhysicsRegionVector | null | undefined,
  b: StreamPhysicsRegionVector | null | undefined
): StreamPhysicsRegionVector | null {
  if (!a && !b) return null
  return {
    x: (a?.x ?? 0) + (b?.x ?? 0),
    y: (a?.y ?? 0) + (b?.y ?? 0)
  }
}

/**
 * Compose controllers into a single continuous flag, bodyForce, and onTick.
 * Call onTick from StreamPhysicsFrame after each pipeline tick; `ctx.dt`
 * accounts for every fixed substep completed by that tick.
 */
export function composePhysicsControllers(
  controllers: readonly PhysicsController[] | undefined | null
): ComposedPhysicsControllers | null {
  if (!controllers?.length) return null
  const list = controllers.slice()
  const continuous = list.some((controller) => controller.continuous !== false)

  return {
    controllers: list,
    continuous,
    onTick: (result, controls, extras) => {
      const ctx: PhysicsControllerTickContext = {
        result,
        controls,
        dt: extras.dt,
        elapsed: extras.elapsed,
        getRegionState: extras.getRegionState
      }
      for (const controller of list) {
        controller.tick(ctx)
      }
    },
    bodyForce: (context) => {
      let force: StreamPhysicsRegionVector | null = null
      for (const controller of list) {
        if (!controller.bodyForce) continue
        force = addVectors(force, controller.bodyForce(context))
      }
      return force
    }
  }
}

function readUnitWork(
  body: PhysicsBodyState,
  unitAccessor: CapacityQueueControllerOptions["unitAccessor"]
): number {
  if (typeof unitAccessor === "function") {
    const value = unitAccessor(body)
    return Number.isFinite(value) && value > 0 ? Number(value) : 1
  }
  const datum = body.datum as Record<string, unknown> | undefined
  if (unitAccessor && datum && typeof datum === "object") {
    const value = Number(datum[unitAccessor])
    if (Number.isFinite(value) && value > 0) return value
  }
  const work = Number(datum?.work ?? datum?.reviewWork ?? datum?.value)
  if (Number.isFinite(work) && work > 0) return work
  return 1
}

function valueAtPath(source: unknown, path: string): unknown {
  if (!path) return undefined
  let current = source
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function bodyMatchesFilter(
  body: PhysicsBodyState,
  filter: PhysicsColliderBodyFilter | undefined
): boolean {
  if (!filter) return true
  if (typeof filter === "function") return filter(body)

  const value = valueAtPath(body, filter.property)
  if ("equals" in filter && !Object.is(value, filter.equals)) return false
  if ("notEquals" in filter && Object.is(value, filter.notEquals)) return false
  if (
    filter.oneOf &&
    !filter.oneOf.some((candidate) => Object.is(value, candidate))
  ) {
    return false
  }
  if (
    filter.notOneOf &&
    filter.notOneOf.some((candidate) => Object.is(value, candidate))
  ) {
    return false
  }
  return true
}

export interface CapacityQueueControllerOptions {
  id?: string
  /** Must match a StreamPhysicsRegionEffect id (sensor region). */
  regionId: string
  /** Work units processed per second while the queue is non-empty. */
  unitsPerSecond: number
  /** Only matching bodies may enter the queue. Uses collider body-filter semantics. */
  bodyFilter?: PhysicsColliderBodyFilter
  /**
   * Work-units per body. String form reads `body.datum[field]`.
   * Defaults to datum.work / reviewWork / value, then 1.
   */
  unitAccessor?: string | ((body: PhysicsBodyState) => number)
  /** Impulse applied when a body finishes processing (default forward release). */
  releaseImpulse?: StreamPhysicsRegionVector
  /**
   * Called when a body is fully processed and released. Use to advance stage
   * metadata or emit host observations.
   */
  onProcessed?: (
    body: PhysicsBodyState,
    info: { work: number; regionId: string }
  ) => void
  /**
   * Queue packing force: "lane" stacks bodies along the region with rank-based
   * anchors; "none" only processes without layout forces.
   */
  queueLayout?: "lane" | "none"
  /** Pixel spacing between stacked queue slots (lane mode). */
  queueSlotSpacing?: number
  /** Pull strength toward the queue slot (lane mode). */
  queueStiffness?: number
  /** Max bodies held in the processing queue (overflow keeps waiting outside). */
  maxQueue?: number
  continuous?: boolean
}

interface QueueEntry {
  bodyId: string
  remaining: number
  total: number
  enteredAt: number
}

/**
 * Live capacitated sensor: bodies overlapping `regionId` enter a FIFO queue
 * that drains at `unitsPerSecond`. Processed bodies receive a release impulse.
 *
 * This is the real process primitive behind ProcessFlowChart capacity stages —
 * not just damping theater.
 */
export function createCapacityQueueController(
  options: CapacityQueueControllerOptions
): PhysicsController {
  const regionId = options.regionId
  const unitsPerSecond = Math.max(0, options.unitsPerSecond)
  const queueLayout = options.queueLayout ?? "lane"
  const slotSpacing = options.queueSlotSpacing ?? 14
  const stiffness = options.queueStiffness ?? 0.35
  const maxQueue = options.maxQueue ?? Number.POSITIVE_INFINITY
  const releaseImpulse = options.releaseImpulse ?? { x: 90, y: 0 }
  const queue = new Map<string, QueueEntry>()
  const processedInRegion = new Set<string>()
  let sequence = 0
  /** bodyId → FIFO rank; rebuilt each tick for O(1) bodyForce lookup. */
  let rankByBodyId = new Map<string, number>()
  let queueLength = 0
  let processedCount = 0

  function inRegion(
    bodyId: string,
    getRegionState: PhysicsControllerTickContext["getRegionState"]
  ): boolean {
    const state = getRegionState(bodyId)
    if (!state) return false
    return state.activeRegionIds.includes(regionId)
  }

  return {
    id: options.id ?? `capacity-queue:${regionId}`,
    continuous: options.continuous !== false,
    tick: (ctx) => {
      const bodies = ctx.controls.readBodies()
      const bodyById = new Map<string, PhysicsBodyState>()
      const active = new Set<string>()
      const present = new Set<string>()
      for (const body of bodies) {
        bodyById.set(body.id, body)
        if (!inRegion(body.id, ctx.getRegionState)) continue
        active.add(body.id)
        if (!bodyMatchesFilter(body, options.bodyFilter)) continue
        present.add(body.id)
        if (!queue.has(body.id) && !processedInRegion.has(body.id)) {
          if (queue.size >= maxQueue) continue
          const total = readUnitWork(body, options.unitAccessor)
          queue.set(body.id, {
            bodyId: body.id,
            remaining: total,
            total,
            enteredAt: sequence++
          })
        }
      }

      for (const id of queue.keys()) {
        if (!present.has(id)) queue.delete(id)
      }
      for (const id of processedInRegion) {
        if (!active.has(id)) processedInRegion.delete(id)
      }

      const ordered = Array.from(queue.values()).sort(
        (a, b) => a.enteredAt - b.enteredAt
      )
      const nextRanks = new Map<string, number>()
      for (let i = 0; i < ordered.length; i += 1) {
        nextRanks.set(ordered[i].bodyId, i)
      }
      rankByBodyId = nextRanks
      queueLength = ordered.length

      let budget = unitsPerSecond * Math.max(0, ctx.dt)
      if (!(budget > 0) || ordered.length === 0) return

      for (const entry of ordered) {
        if (!(budget > 0)) break
        const take = Math.min(entry.remaining, budget)
        entry.remaining -= take
        budget -= take
        if (entry.remaining > 1e-6) continue

        queue.delete(entry.bodyId)
        processedInRegion.add(entry.bodyId)
        processedCount += 1
        const body = bodyById.get(entry.bodyId)
        if (!body) continue
        ctx.controls.applyImpulse(
          entry.bodyId,
          releaseImpulse.x ?? 0,
          releaseImpulse.y ?? 0
        )
        options.onProcessed?.(body, {
          work: entry.total,
          regionId
        })
        ctx.controls.recordObservation({
          type: "physics-capacity-processed",
          bodyId: entry.bodyId,
          datum: body.datum,
          x: body.x,
          y: body.y,
          regionId,
          work: entry.total
        })
      }
    },
    getSnapshot: (): CapacityQueueSnapshot => {
      let remainingWork = 0
      for (const entry of queue.values()) {
        remainingWork += entry.remaining
      }
      const depth = queue.size
      return {
        regionId,
        queueDepth: depth,
        processedCount,
        unitsPerSecond,
        remainingWork,
        meanRemainingWork: depth > 0 ? remainingWork / depth : 0
      }
    },
    bodyForce: (context) => {
      if (queueLayout === "none") return null
      const entry = queue.get(context.body.id)
      if (!entry) return null
      const rank = rankByBodyId.get(context.body.id)
      if (rank == null) return null

      // Stack queued bodies slightly upstream so release is visible.
      let shape: { x: number; y: number; width: number } | undefined
      const regions = context.regions
      if (regions) {
        for (let i = 0; i < regions.length; i += 1) {
          if (regions[i].id === regionId) {
            const candidate = regions[i].shape
            if (candidate && candidate.type === "aabb") {
              shape = candidate
            }
            break
          }
        }
      }
      if (!shape) {
        // Soft hold: damp forward motion while queued.
        return { x: -Math.sign(context.body.vx || 1) * 8, y: 0 }
      }

      const slotX = shape.x - shape.width * 0.22 - rank * (slotSpacing * 0.15)
      const slotY =
        shape.y -
        ((rank - (queueLength - 1) / 2) * slotSpacing) /
          Math.max(1, Math.sqrt(queueLength))
      const dx = slotX - context.body.x
      const dy = slotY - context.body.y
      return {
        x: dx * stiffness,
        y: dy * stiffness * 0.85
      }
    }
  }
}

/**
 * Portal controller: bodies in `fromRegionId` are periodically teleported via
 * impulse toward a target, and optional datum transform runs on exit.
 */
export function createPortalController(options: {
  id?: string
  fromRegionId: string
  impulse?: StreamPhysicsRegionVector
  continuous?: boolean
  onPortal?: (body: PhysicsBodyState) => void
}): PhysicsController {
  const seen = new Set<string>()
  const impulse = options.impulse ?? { x: -60, y: 0 }
  return {
    id: options.id ?? `portal:${options.fromRegionId}`,
    continuous: options.continuous === true,
    tick: (ctx) => {
      const bodies = ctx.controls.readBodies()
      for (const body of bodies) {
        const state = ctx.getRegionState(body.id)
        const inside = state?.activeRegionIds.includes(options.fromRegionId)
        if (!inside) {
          seen.delete(body.id)
          continue
        }
        if (seen.has(body.id)) continue
        seen.add(body.id)
        ctx.controls.applyImpulse(body.id, impulse.x ?? 0, impulse.y ?? 0)
        options.onPortal?.(body)
      }
    }
  }
}

export type PhysicsControllerFactory = typeof createCapacityQueueController
