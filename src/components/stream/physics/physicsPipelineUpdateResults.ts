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

export const PHYSICS_CONFIG_INVALIDATIONS: readonly Invalidation[] = [
  "layout",
  "scene-geometry",
  "data-paint",
  "overlay",
  "accessibility",
  "evidence"
]

export const PHYSICS_STATE_INVALIDATIONS: readonly Invalidation[] = [
  "overlay",
  "accessibility",
  "evidence"
]

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
