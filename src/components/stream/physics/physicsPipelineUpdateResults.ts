import type { PhysicsKernelOptions } from "./PhysicsKernel"
import type { PhysicsPipelineConfig } from "./PhysicsPipelineTypes"
import type { Invalidation } from "../pipelineUpdateContract"

export const PHYSICS_BODY_INVALIDATIONS: readonly Invalidation[] = [
  "data",
  "scene-geometry",
  "data-paint",
  "accessibility",
  "evidence"
]

export const PHYSICS_MOTION_INVALIDATIONS: readonly Invalidation[] = [
  "scene-geometry",
  "data-paint",
  "accessibility",
  "evidence"
]

export const PHYSICS_STATE_INVALIDATIONS: readonly Invalidation[] = [
  "overlay",
  "accessibility",
  "evidence"
]

/** Whether a config patch rebuilds Physics' retained simulation resource. */
export type PhysicsRetainedDataEffect = "preserve" | "rebuild"

export interface PhysicsConfigPatchDependency {
  readonly retainedData: PhysicsRetainedDataEffect
  readonly invalidations: readonly Invalidation[]
}

const dependency = (
  retainedData: PhysicsRetainedDataEffect,
  invalidations: readonly Invalidation[]
): PhysicsConfigPatchDependency => ({ retainedData, invalidations })

const ENGINE_REBUILD: readonly Invalidation[] = [
  "scene-geometry",
  "data-paint",
  "accessibility",
  "evidence"
]

const LAYOUT: readonly Invalidation[] = [
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence"
]

const GEOMETRY: readonly Invalidation[] = [
  "scene-geometry",
  "data-paint",
  "accessibility",
  "evidence"
]

const NOOP: readonly Invalidation[] = []

/**
 * Physics config changes either rebuild the retained engine, affect the next
 * simulated geometry, alter capacity presentation, or only change future
 * stepping/observation behavior. This keeps direct store consumers from
 * treating every physics option as a full scene-layout update.
 */
export const PHYSICS_CONFIG_PATCH_DEPENDENCIES: Readonly<
  Record<string, PhysicsConfigPatchDependency>
> = {
  engine: dependency("rebuild", ENGINE_REBUILD),
  kernel: dependency("preserve", GEOMETRY),
  colliders: dependency("preserve", GEOMETRY),
  sediment: dependency("preserve", GEOMETRY),

  bodyBudget: dependency("preserve", LAYOUT),
  bodyLimit: dependency("preserve", LAYOUT),
  eviction: dependency("preserve", LAYOUT),

  fixedDt: dependency("preserve", NOOP),
  maxDeltaSeconds: dependency("preserve", NOOP),
  maxSubsteps: dependency("preserve", NOOP),
  settleStepLimit: dependency("preserve", NOOP),
  timeScale: dependency("preserve", NOOP),
  observation: dependency("preserve", NOOP)
}

const DEFAULT_CONFIG_PATCH_DEPENDENCY = dependency("preserve", LAYOUT)

export interface PhysicsConfigPatchClassification {
  readonly retainedData: PhysicsRetainedDataEffect
  readonly invalidations: ReadonlySet<Invalidation>
}

/** Union the declared effects for a patch after its effective keys are known. */
export function classifyPhysicsConfigPatch(
  keys: readonly string[]
): PhysicsConfigPatchClassification {
  let retainedData: PhysicsRetainedDataEffect = "preserve"
  const invalidations = new Set<Invalidation>()

  for (const key of keys) {
    const effect = PHYSICS_CONFIG_PATCH_DEPENDENCIES[key]
      ?? DEFAULT_CONFIG_PATCH_DEPENDENCY
    if (effect.retainedData === "rebuild") retainedData = "rebuild"
    for (const invalidation of effect.invalidations) {
      invalidations.add(invalidation)
    }
  }

  return { retainedData, invalidations }
}

const KERNEL_OPTION_KEYS: readonly Exclude<keyof PhysicsKernelOptions, "gravity">[] = [
  "seed",
  "fixedDt",
  "cellSize",
  "collisionIterations",
  "velocityDamping",
  "sleepSpeed",
  "sleepAfter",
  "restitution",
  "friction",
  "maxVelocity",
  "contactWakeSpeed"
]

export function physicsKernelOptionsEqual(
  a: PhysicsKernelOptions | undefined,
  b: PhysicsKernelOptions | undefined
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.gravity?.x !== b.gravity?.x || a.gravity?.y !== b.gravity?.y) {
    return false
  }
  return KERNEL_OPTION_KEYS.every((key) => a[key] === b[key])
}

export function changedPhysicsConfigKeys(
  config: PhysicsPipelineConfig,
  previous: PhysicsPipelineConfig
): string[] {
  return Object.keys(config).filter((key) => {
    if (key === "kernel") {
      return !physicsKernelOptionsEqual(config.kernel, previous.kernel)
    }
    return (config as Record<string, unknown>)[key] !==
      (previous as Record<string, unknown>)[key]
  })
}
