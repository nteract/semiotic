/**
 * Region effect application, body forces, and post-tick pipeline for
 * StreamPhysicsFrame. Pure control-surface helpers — no React.
 */

import type { Style } from "../types"
import type {
  PhysicsBodyState,
  PhysicsColliderBodyFilter,
  PhysicsColliderSpec
} from "./PhysicsKernel"
import type {
  PhysicsPipelineControlSurface,
  PhysicsPipelineStore,
  PhysicsPipelineTickResult,
  PhysicsSimulationState
} from "./PhysicsPipelineStore"
import { composePhysicsControllers } from "./PhysicsControllers"
import type {
  PhysicsBodySelection,
  PhysicsBodyStyleContext,
  StreamPhysicsBodyForce,
  StreamPhysicsBodyForceContext,
  StreamPhysicsBodyRegionState,
  StreamPhysicsRegionEffect,
  StreamPhysicsRegionEffectContext,
  StreamPhysicsRegionVector,
  PhysicsSemanticItem,
  StreamPhysicsFrameProps
} from "./StreamPhysicsTypes"

/** Internal region bookkeeping (Sets for O(1) membership). */
export interface InternalStreamPhysicsBodyRegionState {
  activeRegionIds: Set<string>
  regionIds: Set<string>
  charges: Record<string, unknown>
  attributes: Record<string, unknown>
  energy: number
}

export function isSelected(
  body: PhysicsBodyState,
  selection: PhysicsBodySelection | null | undefined
): boolean {
  if (!selection?.isActive) return false
  return selection.predicate?.(body) ?? true
}

export function regionSensorId(region: StreamPhysicsRegionEffect): string {
  return region.sensorId ?? `stream-region-${region.id}`
}

export function regionBoundaryColliders(
  region: StreamPhysicsRegionEffect
): PhysicsColliderSpec[] {
  const baseId = regionSensorId(region)
  const common: {
    bodyFilter?: PhysicsColliderBodyFilter
    friction?: number
    restitution?: number
  } = {
    bodyFilter: region.bodyFilter,
    friction: region.friction,
    restitution: region.restitution
  }
  if (region.collider === "boundary" && region.shape.type === "aabb") {
    const thickness = region.colliderThickness ?? 8
    const left = region.shape.x - region.shape.width / 2
    const right = region.shape.x + region.shape.width / 2
    const top = region.shape.y - region.shape.height / 2
    const bottom = region.shape.y + region.shape.height / 2
    return [
      {
        ...common,
        id: `${baseId}-top`,
        shape: {
          type: "segment",
          x1: left,
          y1: top,
          x2: right,
          y2: top,
          thickness
        }
      },
      {
        ...common,
        id: `${baseId}-right`,
        shape: {
          type: "segment",
          x1: right,
          y1: top,
          x2: right,
          y2: bottom,
          thickness
        }
      },
      {
        ...common,
        id: `${baseId}-bottom`,
        shape: {
          type: "segment",
          x1: right,
          y1: bottom,
          x2: left,
          y2: bottom,
          thickness
        }
      },
      {
        ...common,
        id: `${baseId}-left`,
        shape: {
          type: "segment",
          x1: left,
          y1: bottom,
          x2: left,
          y2: top,
          thickness
        }
      }
    ]
  }
  if (!region.collider) return []
  return [
    {
      ...common,
      id: `${baseId}-collider`,
      shape: region.shape
    }
  ]
}

export function publicRegionState(
  state: InternalStreamPhysicsBodyRegionState | undefined
): StreamPhysicsBodyRegionState | undefined {
  if (!state) return undefined
  return {
    activeRegionIds: Array.from(state.activeRegionIds),
    regionIds: Array.from(state.regionIds),
    charges: { ...state.charges },
    attributes: { ...state.attributes },
    energy: state.energy
  }
}

export function cloneRegionStateSnapshot(
  state: Map<string, InternalStreamPhysicsBodyRegionState>
): Record<string, StreamPhysicsBodyRegionState> {
  const snapshot: Record<string, StreamPhysicsBodyRegionState> = {}
  state.forEach((value, key) => {
    const publicState = publicRegionState(value)
    if (publicState) snapshot[key] = publicState
  })
  return snapshot
}

export function ensureInternalRegionState(
  state: Map<string, InternalStreamPhysicsBodyRegionState>,
  bodyId: string
): InternalStreamPhysicsBodyRegionState {
  let current = state.get(bodyId)
  if (!current) {
    current = {
      activeRegionIds: new Set(),
      attributes: {},
      charges: {},
      energy: 0,
      regionIds: new Set()
    }
    state.set(bodyId, current)
  }
  return current
}

export function resolveRegionVector(
  vector:
    | StreamPhysicsRegionVector
    | ((
        context: StreamPhysicsRegionEffectContext
      ) => StreamPhysicsRegionVector | null | undefined)
    | undefined,
  context: StreamPhysicsRegionEffectContext
): StreamPhysicsRegionVector | null {
  const resolved = typeof vector === "function" ? vector(context) : vector
  if (!resolved) return null
  const x = Number(resolved.x ?? 0)
  const y = Number(resolved.y ?? 0)
  if (!Number.isFinite(x) && !Number.isFinite(y)) return null
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  }
}

export function mergeRegionAttributes(
  region: StreamPhysicsRegionEffect,
  context: StreamPhysicsRegionEffectContext,
  state: InternalStreamPhysicsBodyRegionState
): void {
  const nextAttributes =
    typeof region.attributes === "function"
      ? region.attributes(context)
      : region.attributes
  if (nextAttributes) {
    state.attributes = { ...state.attributes, ...nextAttributes }
  }
}

export function resolveRegionCharge(
  region: StreamPhysicsRegionEffect,
  context: StreamPhysicsRegionEffectContext
): unknown {
  if (region.charge !== undefined) {
    return typeof region.charge === "function"
      ? region.charge(context)
      : region.charge
  }
  return region.kind === "charge-gate" ? 1 : undefined
}

export function regionToSemanticItem(
  region: StreamPhysicsRegionEffect
): PhysicsSemanticItem | null {
  if (region.semanticItem === false) return null
  const shape = region.shape
  const override = region.semanticItem ?? {}
  const base: PhysicsSemanticItem =
    shape.type === "aabb"
      ? {
          id: region.id,
          label: region.label ?? region.id,
          description: region.description,
          group: region.kind ?? "region",
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height
        }
      : {
          id: region.id,
          label: region.label ?? region.id,
          description: region.description,
          group: region.kind ?? "region",
          x: (shape.x1 + shape.x2) / 2,
          y: (shape.y1 + shape.y2) / 2,
          pathData: `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}`
        }
  return {
    ...base,
    ...override,
    id: override.id ?? base.id
  }
}

export function regionRuntimeEffectsRequireSync(
  regionEffects: readonly StreamPhysicsRegionEffect[]
): boolean {
  return regionEffects.some(
    (region) =>
      region.force != null ||
      region.damping != null ||
      region.impulseOnEnter != null ||
      region.impulseOnExit != null
  )
}

export function applyActiveRegionEffects(
  controls: PhysicsPipelineControlSurface,
  regionEffects: readonly StreamPhysicsRegionEffect[],
  regionState: Map<string, InternalStreamPhysicsBodyRegionState>,
  dtSeconds: number
): boolean {
  const dt = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0
  if (!(dt > 0) || !regionRuntimeEffectsRequireSync(regionEffects)) return false
  const regionsById = new Map(
    regionEffects.map((region) => [region.id, region])
  )
  const bodies = controls.readBodies()
  let applied = false
  for (const body of bodies) {
    const internalState = regionState.get(body.id)
    if (!internalState || !internalState.activeRegionIds.size) continue
    const publicState = publicRegionState(internalState)
    if (!publicState) continue
    for (const regionId of internalState.activeRegionIds) {
      const region = regionsById.get(regionId)
      if (!region) continue
      const context = { body, region, regionState: publicState }
      const force = resolveRegionVector(region.force, context)
      const damping = Number(region.damping ?? 0)
      const ix =
        (force?.x ?? 0) * dt -
        (Number.isFinite(damping) ? body.vx * damping * dt : 0)
      const iy =
        (force?.y ?? 0) * dt -
        (Number.isFinite(damping) ? body.vy * damping * dt : 0)
      if (ix || iy) {
        controls.applyImpulse(body.id, ix, iy)
        applied = true
      }
    }
  }
  return applied
}

export function resolveBodyForceVector(
  force: StreamPhysicsBodyForce | undefined,
  context: StreamPhysicsBodyForceContext
): StreamPhysicsRegionVector | null {
  const resolved = typeof force === "function" ? force(context) : force
  if (!resolved) return null
  const x = Number(resolved.x ?? 0)
  const y = Number(resolved.y ?? 0)
  if (!Number.isFinite(x) && !Number.isFinite(y)) return null
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  }
}

const EMPTY_REGION_EFFECTS: StreamPhysicsRegionEffect[] = []

export function applyBodyForces(
  controls: PhysicsPipelineControlSurface,
  bodyForces: StreamPhysicsBodyForce | undefined,
  regionEffects: readonly StreamPhysicsRegionEffect[],
  regionState: Map<string, InternalStreamPhysicsBodyRegionState>,
  simulationState: PhysicsSimulationState,
  dtSeconds: number
): boolean {
  const dt = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0
  if (!(dt > 0) || !bodyForces) return false
  const regionById = new Map(regionEffects.map((region) => [region.id, region]))
  const bodies = controls.readBodies()
  let applied = false
  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index]
    const internalState = regionState.get(body.id)
    const publicState = publicRegionState(internalState)
    // Build regions without Array.from + map + filter intermediate arrays.
    let regions: StreamPhysicsRegionEffect[] = EMPTY_REGION_EFFECTS
    if (internalState && internalState.activeRegionIds.size > 0) {
      const list: StreamPhysicsRegionEffect[] = []
      for (const id of internalState.activeRegionIds) {
        const region = regionById.get(id)
        if (region) list.push(region)
      }
      regions = list
    }
    const vector = resolveBodyForceVector(bodyForces, {
      body,
      bodies,
      index,
      regionState: publicState,
      regions,
      simulationState
    })
    if (!vector) continue
    const ix = (vector.x ?? 0) * dt
    const iy = (vector.y ?? 0) * dt
    if (ix || iy) {
      controls.applyImpulse(body.id, ix, iy)
      applied = true
    }
  }
  return applied
}

/**
 * Shared post-tick pipeline: region forces → body forces → controllers → onTick.
 * Used by the main RAF path and the worker-fallback path (DRY + one snapshot).
 */
export function runPhysicsPostTick(options: {
  store: PhysicsPipelineStore
  result: PhysicsPipelineTickResult
  regionEffects: readonly StreamPhysicsRegionEffect[]
  regionState: Map<string, InternalStreamPhysicsBodyRegionState>
  bodyForces: StreamPhysicsBodyForce | undefined
  composed: ReturnType<typeof composePhysicsControllers>
  onTick?: (
    result: PhysicsPipelineTickResult,
    controls: PhysicsPipelineControlSurface
  ) => void
}): {
  regionEffectsApplied: boolean
  bodyForcesApplied: boolean
  snapshot: ReturnType<PhysicsPipelineStore["snapshot"]>
} {
  const controls = options.store.controls()
  // Single snapshot for simulation state + reschedule predicate.
  const snapshot = options.store.snapshot()
  const fixedDt = snapshot.config.fixedDt || 1 / 60
  const simulatedDt = Math.max(0, options.result.steps * fixedDt)
  const regionEffectsApplied = applyActiveRegionEffects(
    controls,
    options.regionEffects,
    options.regionState,
    simulatedDt
  )
  const bodyForcesApplied = applyBodyForces(
    controls,
    options.bodyForces,
    options.regionEffects,
    options.regionState,
    snapshot.simulationState,
    simulatedDt
  )
  if (options.composed) {
    options.composed.onTick(options.result, controls, {
      dt: simulatedDt,
      elapsed: options.result.elapsedSeconds,
      getRegionState: (bodyId) =>
        publicRegionState(options.regionState.get(bodyId))
    })
  }
  options.onTick?.(options.result, controls)
  return { regionEffectsApplied, bodyForcesApplied, snapshot }
}

export function resolveStyle(
  body: PhysicsBodyState,
  simulationState: PhysicsSimulationState,
  bodyStyle: StreamPhysicsFrameProps["bodyStyle"],
  selectedBodyStyle: StreamPhysicsFrameProps["selectedBodyStyle"],
  selection: StreamPhysicsFrameProps["selection"],
  regionState: StreamPhysicsBodyRegionState | undefined,
  activeRegions: StreamPhysicsRegionEffect[],
  fallbackFill: string,
  fallbackStroke: string,
  primitives?: {
    color?: string
    stroke?: string
    strokeWidth?: number
    opacity?: number
  }
): Style {
  const selected = isSelected(body, selection)
  const context: PhysicsBodyStyleContext = {
    selected,
    simulationState,
    regionState,
    regions: activeRegions
  }
  const base =
    typeof bodyStyle === "function" ? bodyStyle(body, context) : bodyStyle
  const regionPatch = activeRegions.reduce<Style>((style, region) => {
    if (!region.bodyStyle) return style
    return {
      ...style,
      ...(typeof region.bodyStyle === "function"
        ? region.bodyStyle(body, context)
        : region.bodyStyle)
    }
  }, {})
  const selectedPatch = selected
    ? typeof selectedBodyStyle === "function"
      ? selectedBodyStyle(body, context)
      : selectedBodyStyle
    : undefined

  return {
    fill: primitives?.color ?? fallbackFill,
    stroke: primitives?.stroke ?? fallbackStroke,
    strokeWidth: primitives?.strokeWidth ?? 1,
    opacity: primitives?.opacity ?? 0.9,
    ...base,
    ...regionPatch,
    ...selectedPatch
  }
}
