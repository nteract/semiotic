import type {
  PhysicsBodySpec,
  PhysicsColliderSpec,
  PhysicsKernelOptions,
  PhysicsKernelSnapshot,
  PhysicsSpringSpec
} from "./PhysicsKernel"
import { validatePhysicsTravel } from "./physicsBodyTravel"
import type {
  PhysicsPipelineConfig,
  PhysicsPipelineSnapshot,
  PhysicsQueuedSpawn
} from "./PhysicsPipelineTypes"

function finite(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${field} must be finite`)
}

function positive(value: number, field: string): void {
  finite(value, field)
  if (value <= 0) throw new RangeError(`${field} must be positive`)
}

function array(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new RangeError(`${field} must be an array`)
}

function stringArray(value: unknown, field: string): void {
  array(value, field)
  for (const item of value) {
    if (typeof item !== "string")
      throw new RangeError(`${field} must contain strings`)
  }
}

export function validatePhysicsBody(spec: PhysicsBodySpec): void {
  if (
    !spec ||
    !spec.shape ||
    (spec.shape.type !== "circle" && spec.shape.type !== "aabb")
  )
    throw new RangeError("Physics bodies require a circle or aabb shape")
  const label = `Physics body ${spec.id}`
  finite(spec.x, `${label}.x`)
  finite(spec.y, `${label}.y`)
  for (const key of ["vx", "vy", "angle", "restitution", "friction"] as const) {
    if (spec[key] != null) finite(spec[key], `${label}.${key}`)
  }
  if (spec.mass != null) positive(spec.mass, `${label}.mass`)
  if (spec.travel) {
    validatePhysicsTravel(spec.travel)
    if (spec.fixedPosition)
      throw new RangeError("Physics travel cannot use fixedPosition")
  }
  if (spec.shape.type === "circle")
    positive(spec.shape.radius, `${label}.radius`)
  else {
    positive(spec.shape.width, `${label}.width`)
    positive(spec.shape.height, `${label}.height`)
  }
}

export function validatePhysicsSpring(spec: PhysicsSpringSpec): void {
  for (const key of ["restLength", "stiffness", "damping"] as const) {
    if (spec[key] != null) finite(spec[key], `Physics spring.${key}`)
  }
  if (spec.target.type === "point") {
    finite(spec.target.x, "Physics spring.target.x")
    finite(spec.target.y, "Physics spring.target.y")
  }
}

export function validatePhysicsSpawn(spec: PhysicsQueuedSpawn): void {
  validatePhysicsBody(spec)
  if (spec.spawnAt != null)
    finite(spec.spawnAt, `Physics body ${spec.id}.spawnAt`)
  for (const spring of spec.springs ?? [])
    validatePhysicsSpring({ ...spring, bodyId: spec.id })
}

export function validatePhysicsColliders(
  colliders: PhysicsColliderSpec[]
): void {
  for (const collider of colliders) {
    if (
      !collider?.shape ||
      (collider.shape.type !== "segment" && collider.shape.type !== "aabb")
    )
      throw new RangeError("Physics colliders require a segment or aabb shape")
    const shape = collider.shape
    if (shape.type === "segment") {
      for (const key of ["x1", "y1", "x2", "y2"] as const)
        finite(shape[key], `Physics collider ${collider.id}.${key}`)
    } else {
      for (const key of ["x", "y", "width", "height"] as const)
        finite(shape[key], `Physics collider ${collider.id}.${key}`)
    }
    for (const [key, value] of Object.entries(collider.shape)) {
      if (key !== "type" && value != null)
        finite(value as number, `Physics collider ${collider.id}.${key}`)
    }
    for (const key of ["restitution", "friction"] as const) {
      if (collider[key] != null)
        finite(collider[key], `Physics collider ${collider.id}.${key}`)
    }
  }
}

export function validatePhysicsOptions(options: PhysicsKernelOptions): void {
  for (const [key, value] of Object.entries(options)) {
    if (key !== "gravity" && value != null)
      finite(value as number, `Physics option ${key}`)
  }
  if (options.gravity) {
    finite(options.gravity.x, "Physics gravity.x")
    finite(options.gravity.y, "Physics gravity.y")
  }
  for (const key of ["fixedDt", "cellSize"] as const) {
    if (options[key] != null) positive(options[key], `Physics option ${key}`)
  }
  if (options.velocityDamping != null && options.velocityDamping < 0)
    throw new RangeError("Physics velocityDamping must be nonnegative")
}

export function validatePhysicsSnapshot(snapshot: PhysicsKernelSnapshot): void {
  stringArray(snapshot.activeSensors, "Physics activeSensors")
  array(snapshot.bodies, "Physics bodies")
  array(snapshot.colliders, "Physics colliders")
  array(snapshot.springs, "Physics springs")
  validatePhysicsOptions(snapshot.options)
  for (const body of snapshot.bodies) {
    validatePhysicsBody(body)
    for (const key of ["prevX", "prevY", "sleepTime", "index"] as const)
      finite(body[key], `Physics body ${body.id}.${key}`)
  }
  validatePhysicsColliders(snapshot.colliders)
  for (const spring of snapshot.springs) validatePhysicsSpring(spring)
  if (snapshot.randomState != null)
    finite(snapshot.randomState, "Physics randomState")
}

export function validatePhysicsPipelineConfig(
  config: PhysicsPipelineConfig
): void {
  if (config.kernel) validatePhysicsOptions(config.kernel)
  if (config.viewTransform) {
    finite(config.viewTransform.x, "Physics viewTransform.x")
    finite(config.viewTransform.y, "Physics viewTransform.y")
  }
  if (config.colliders) validatePhysicsColliders(config.colliders)
  if (config.fixedDt != null) positive(config.fixedDt, "Physics fixedDt")
  for (const key of [
    "maxDeltaSeconds",
    "maxSubsteps",
    "settleStepLimit",
    "timeScale"
  ] as const) {
    if (config[key] != null) {
      finite(config[key], `Physics ${key}`)
      if (config[key] < 0)
        throw new RangeError(`Physics ${key} must be nonnegative`)
    }
  }
}

export function validatePhysicsPipelineSnapshot(
  snapshot: PhysicsPipelineSnapshot
): void {
  stringArray(snapshot.activeSensorPairs, "Physics activeSensorPairs")
  stringArray(snapshot.liveBodyOrder, "Physics liveBodyOrder")
  array(snapshot.queue, "Physics queue")
  if (snapshot.sediment != null) {
    array(snapshot.sediment, "Physics sediment")
    for (const bin of snapshot.sediment) {
      if (!bin) throw new RangeError("Physics sediment requires bin records")
      stringArray(bin.bodyIds, "Physics sediment.bodyIds")
      finite(bin.count, "Physics sediment.count")
      for (const name of ["x", "y", "value"] as const) {
        const stats = bin[name]
        if (!stats) throw new RangeError("Physics sediment requires statistics")
        for (const key of [
          "count",
          "total",
          "mean",
          "min",
          "max",
          "variance"
        ] as const)
          finite(stats[key], `Physics sediment.${name}.${key}`)
      }
    }
  }
  validatePhysicsPipelineConfig(snapshot.config)
  validatePhysicsSnapshot(snapshot.world)
  for (const spawn of snapshot.queue) {
    validatePhysicsSpawn(spawn)
    finite(spawn.sequence, "Physics queue sequence")
  }
  finite(snapshot.elapsedSeconds, "Physics elapsedSeconds")
  finite(snapshot.accumulator, "Physics accumulator")
  if (
    snapshot.nextSequence != null &&
    (!Number.isSafeInteger(snapshot.nextSequence) ||
      snapshot.nextSequence < 0 ||
      snapshot.queue.some((spawn) => spawn.sequence >= snapshot.nextSequence!))
  )
    throw new RangeError(
      "Physics nextSequence must exceed queued sequence numbers"
    )
}
