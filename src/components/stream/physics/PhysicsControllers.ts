/** Stateful process rules that ride StreamPhysicsFrame's live heartbeat. */

import type { PhysicsBodyState } from "./PhysicsKernel"
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
import { createCapacityQueueController } from "./CapacityQueueController"

export { createCapacityQueueController }
export type {
  CapacityQueueAbandonedInfo,
  CapacityQueueAgeSummary,
  CapacityQueueBlockedInfo,
  CapacityQueueControllerOptions,
  CapacityQueueProcessedInfo,
  CapacityQueueSnapshot,
  CapacityQueueVisitInfo,
  CapacityQueueWindowSnapshot
} from "./CapacityQueueTypes"

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

/** Apply one portal impulse per active-region visit. */
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

export {
  createDependencyGateController,
  createServiceLevelController,
  createServiceResourcePoolController
} from "./ServiceOperationsControllers"
export type {
  DependencyGateController,
  ServiceLevelController,
  ServiceResourcePoolController
} from "./ServiceOperationsControllers"
export type {
  DependencyGateOptions,
  DependencyGateSnapshot,
  ServiceLevelCaseInfo,
  ServiceLevelCaseState,
  ServiceLevelControllerOptions,
  ServiceLevelSnapshot,
  ServiceResourceAssignment,
  ServiceResourceDefinition,
  ServiceResourcePoolOptions,
  ServiceResourcePoolSnapshot
} from "./ServiceOperationsTypes"
