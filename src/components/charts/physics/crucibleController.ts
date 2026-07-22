/**
 * React-facing replay and motion helpers for CrucibleChart.
 *
 * The reducer tape remains authoritative. These helpers only advance that
 * tape, reconcile its bounded body set, and steer marks toward ledger-derived
 * targets. No collision or body position can create a semantic transition.
 */
import type { Datum } from "../shared/datumTypes"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsPipelineControlSurface,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { StreamPhysicsRegionVector } from "../../stream/physics/StreamPhysicsFrame"
import {
  buildCrucibleStateSpawns,
  replayCruciblePlan,
  resolveCrucibleSnapshotAt,
  type CrucibleSpawnOptions
} from "./cruciblePhysics"
import type {
  CrucibleBodyDatum,
  CrucibleCompiledPlan,
  CrucibleDiagnostic,
  CrucibleMaterialization,
  CrucibleObservation,
  CruciblePhase,
  CrucibleRunState
} from "./crucibleTypes"
import type { CrucibleSnapshotAt } from "./crucibleChartProps"

const EPSILON = 1e-7

export interface CrucibleRuntime<TDatum extends Datum = Datum> {
  state: CrucibleRunState<TDatum>
  diagnostics: CrucibleDiagnostic[]
  materializations: CrucibleMaterialization[]
  observations: CrucibleObservation[]
}

function withPlaying<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  playing: boolean
): CrucibleRunState<TDatum> {
  state.playing = playing && !state.complete
  return state
}

/** Resolve a deterministic instant, defaulting snapshots to the terminal ledger. */
export function crucibleSnapshotTime<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  snapshotAt?: CrucibleSnapshotAt
): number {
  return resolveCrucibleSnapshotAt(plan, snapshotAt)
}

/** Replay from origin. Used for reset, phase stepping, snapshots, and live ticks. */
export function replayCrucibleRuntime<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  throughTime: number,
  playing = false
): CrucibleRuntime<TDatum> {
  const replay = replayCruciblePlan(plan, throughTime)
  return {
    ...replay,
    state: withPlaying(replay.state, playing)
  }
}

/**
 * Return only observations/materializations that became newly visible between
 * two instants. Replaying from origin stays deterministic without re-emitting
 * earlier domain observations.
 */
export function advanceCrucibleRuntime<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  previous: CrucibleRunState<TDatum>,
  throughTime: number,
  playing = previous.playing
): CrucibleRuntime<TDatum> {
  const replay = replayCrucibleRuntime(plan, throughTime, playing)
  const applied = new Set(previous.eventsApplied)
  return {
    ...replay,
    observations: replay.observations.filter(
      (item) => !applied.has(item.eventId)
    ),
    materializations: replay.materializations.filter(
      (item) => !applied.has(item.eventId)
    )
  }
}

/** Inclusive end of the current authored phase, or the tape end. */
export function nextCruciblePhaseBoundary<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  elapsed: number
): number {
  const next = plan.phases.find((phase) => phase.end > elapsed + EPSILON)
  return next?.end ?? plan.duration
}

/** Canonical state marks for snapshots and newly materialized product cores. */
export function crucibleStateSpawns<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  state: CrucibleRunState<TDatum>,
  options: CrucibleSpawnOptions = {}
): PhysicsQueuedSpawn[] {
  return buildCrucibleStateSpawns(state, plan.layout, options)
}

/** Add only missing marks. Source component bodies are never deleted. */
export function reconcileCrucibleBodies(
  controls: PhysicsPipelineControlSurface,
  desired: readonly PhysicsQueuedSpawn[]
): string[] {
  const existing = new Set(controls.readBodies().map((body) => body.id))
  const missing = desired.filter((spawn) => !existing.has(spawn.id))
  if (missing.length) controls.pushMany([...missing])
  return missing.map((spawn) => spawn.id)
}

export interface CrucibleBodyTarget {
  x: number
  y: number
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function unit(value: string, salt: number): number {
  return hashText(`${salt}:${value}`) / 0xffffffff
}

function phaseForState<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  state: CrucibleRunState<TDatum>
): CruciblePhase | undefined {
  return (
    plan.phases[state.phaseIndex] ??
    plan.phases.find((phase) => phase.id === state.phaseId)
  )
}

/** Map the pure state-spawn layout into semantic-id targets. */
export function crucibleStateTargets<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  state: CrucibleRunState<TDatum>,
  options: CrucibleSpawnOptions = {}
): Map<string, CrucibleBodyTarget> {
  return new Map(
    crucibleStateSpawns(plan, state, options).flatMap((spawn) => {
      const wrapped = spawn.datum as CrucibleBodyDatum<TDatum> | undefined
      return wrapped?.__crucible
        ? [
            [
              `${wrapped.kind}:${wrapped.semanticId}`,
              { x: spawn.x, y: spawn.y }
            ] as const
          ]
        : []
    })
  )
}

function formingProductTarget<TDatum extends Datum>(
  plan: CrucibleCompiledPlan<TDatum>,
  productId: string
): CrucibleBodyTarget {
  const forming = Object.values(plan.terminalState.products)
    .map((product) => product.id)
    .sort()
  const definitionIndex = Math.max(0, forming.indexOf(productId))
  const angle =
    (definitionIndex / Math.max(1, forming.length)) * Math.PI * 2 - Math.PI / 2
  const radiusX = Math.min(58, plan.layout.chamber.width * 0.19)
  const radiusY = Math.min(38, plan.layout.chamber.height * 0.16)
  return {
    x:
      plan.layout.chamber.x +
      plan.layout.chamber.width / 2 +
      Math.cos(angle) * radiusX,
    y:
      plan.layout.chamber.y +
      plan.layout.chamber.height * 0.52 +
      Math.sin(angle) * radiusY
  }
}

/**
 * Ledger-derived target with phase motion layered on top. Motion may explain
 * agitation/separation, but cannot alter the target state.
 */
export function targetForCrucibleBody<TDatum extends Datum>(options: {
  body: PhysicsBodyState
  plan: CrucibleCompiledPlan<TDatum>
  state: CrucibleRunState<TDatum>
  targets: ReadonlyMap<string, CrucibleBodyTarget>
}): CrucibleBodyTarget | null {
  const { body, plan, state, targets } = options
  const wrapped = body.datum as CrucibleBodyDatum<TDatum> | undefined
  if (!wrapped?.__crucible) return null
  const key = `${wrapped.kind}:${wrapped.semanticId}`
  let target = targets.get(key)
  if (!target) return null

  const phase = phaseForState(plan, state)
  const intensity = Math.max(0, Math.min(2, Number(phase?.intensity ?? 0.5)))
  const motion = phase?.motion ?? "hold"
  const elapsed = state.elapsed

  if (wrapped.kind === "product") {
    const product = state.products[wrapped.semanticId]
    if (product?.status === "forming")
      target = formingProductTarget(plan, product.id)
  } else {
    const component = state.components[wrapped.semanticId]
    const product = component?.productIds
      .map((id) => state.products[id])
      .find((candidate) => candidate?.status === "forming")
    if (product) {
      const center = formingProductTarget(plan, product.id)
      const angle = unit(component.id, 17) * Math.PI * 2
      const orbit = Math.max(5, Math.min(18, plan.layout.width * 0.026))
      target = {
        x: center.x + Math.cos(angle) * orbit,
        y: center.y + Math.sin(angle) * orbit
      }
    }
  }

  const semanticId = wrapped.semanticId
  const phaseOffset = unit(semanticId, 23) * Math.PI * 2
  const insideChamber =
    target.x >= plan.layout.chamber.x &&
    target.x <= plan.layout.chamber.x + plan.layout.chamber.width &&
    target.y >= plan.layout.chamber.y &&
    target.y <= plan.layout.chamber.y + plan.layout.chamber.height

  if (!state.complete && insideChamber) {
    if (motion === "mix") {
      const amplitudeX =
        Math.min(34, plan.layout.chamber.width * 0.1) * intensity
      const amplitudeY =
        Math.min(24, plan.layout.chamber.height * 0.09) * intensity
      target = {
        x:
          target.x +
          Math.cos(elapsed * (1.4 + unit(semanticId, 29)) + phaseOffset) *
            amplitudeX,
        y:
          target.y +
          Math.sin(elapsed * (1.8 + unit(semanticId, 31)) + phaseOffset) *
            amplitudeY
      }
    } else if (motion === "press") {
      const centerX = plan.layout.chamber.x + plan.layout.chamber.width / 2
      const centerY = plan.layout.chamber.y + plan.layout.chamber.height * 0.56
      target = {
        x: centerX + (target.x - centerX) * Math.max(0.3, 1 - intensity * 0.32),
        y: centerY + (target.y - centerY) * Math.max(0.35, 1 - intensity * 0.26)
      }
    } else if (motion === "separate") {
      const direction = unit(semanticId, 41) < 0.5 ? -1 : 1
      target = {
        x:
          target.x +
          direction *
            Math.min(28, plan.layout.chamber.width * 0.075) *
            intensity,
        y: target.y
      }
    } else if (motion === "bind") {
      const centerX = plan.layout.chamber.x + plan.layout.chamber.width / 2
      const centerY = plan.layout.chamber.y + plan.layout.chamber.height * 0.5
      target = {
        x: centerX + (target.x - centerX) * 0.72,
        y: centerY + (target.y - centerY) * 0.72
      }
    } else if (motion === "charge") {
      target = {
        x: target.x,
        y: target.y + Math.sin(elapsed * 2 + phaseOffset) * 4 * intensity
      }
    } else if (motion === "quench") {
      target = {
        x: target.x + Math.sin(phaseOffset) * 2 * intensity,
        y: target.y
      }
    }
  }

  return target
}

/** Damped attraction to a semantic target; deliberately no semantic side effects. */
export function computeCrucibleBodyForce<TDatum extends Datum>(options: {
  body: PhysicsBodyState
  plan: CrucibleCompiledPlan<TDatum>
  state: CrucibleRunState<TDatum>
  targets: ReadonlyMap<string, CrucibleBodyTarget>
}): StreamPhysicsRegionVector | null {
  const target = targetForCrucibleBody(options)
  if (!target) return null
  const { body, state } = options
  const dx = target.x - body.x
  const dy = target.y - body.y
  const distance = Math.hypot(dx, dy)
  const speed = Math.hypot(body.vx, body.vy)
  if (state.complete && distance < 0.7 && speed < 0.45) return null
  const pouring =
    !state.complete && phaseForState(options.plan, state)?.motion === "pour"
  const stiffness = state.complete ? 0.68 : pouring ? 0.72 : 0.5
  const damping = state.complete ? 0.22 : pouring ? 0.18 : 0.14
  const maxForce = state.complete ? 42 : pouring ? 72 : 56
  return {
    x: Math.max(
      -maxForce,
      Math.min(maxForce, dx * stiffness - body.vx * damping)
    ),
    y: Math.max(
      -maxForce,
      Math.min(maxForce, dy * stiffness - body.vy * damping)
    )
  }
}
