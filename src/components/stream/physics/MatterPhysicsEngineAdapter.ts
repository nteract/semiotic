import type { PhysicsEngineCapabilities } from "./PhysicsEngineAdapter"
import type {
  PhysicsBodyShape,
  PhysicsBodySpec,
  PhysicsColliderShape,
  PhysicsColliderSpec
} from "./PhysicsKernel"
import {
  loadOptionalPhysicsPeer,
  optionalEngineDependencyError
} from "./PhysicsOptionalEngineAdapters"

export const MATTER_PHYSICS_PACKAGE = "matter-js"
export const MATTER_PHYSICS_IMPORT_PATH = "semiotic/physics/matter"

export const MATTER_PHYSICS_CAPABILITIES: PhysicsEngineCapabilities = {
  engine: "matter-js",
  determinism: "tolerance",
  sensors: true,
  joints: true,
  ccd: false,
  maxBodiesHint: 5000,
  worker: false
}

export const MATTER_PHYSICS_INSTALL = {
  engine: "Matter.js",
  importPath: MATTER_PHYSICS_IMPORT_PATH,
  packageName: MATTER_PHYSICS_PACKAGE,
  installCommand: `npm install ${MATTER_PHYSICS_PACKAGE}`
} as const

export interface MatterVectorLike {
  x: number
  y: number
}

export interface MatterBoundsLike {
  min: MatterVectorLike
  max: MatterVectorLike
}

export interface MatterBodyLike {
  id?: string | number
  label?: string
  position?: MatterVectorLike
  velocity?: MatterVectorLike
  angle?: number
  mass?: number
  circleRadius?: number
  bounds?: MatterBoundsLike
  isSensor?: boolean
  plugin?: Record<string, unknown>
}

export interface MatterMigrationOptions {
  datumFromPlugin?: string
  fallbackRadius?: number
  idPrefix?: string
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function bodyId(body: MatterBodyLike, index: number, idPrefix: string): string {
  const pluginId = body.plugin?.id
  return String(pluginId ?? body.label ?? body.id ?? `${idPrefix}-${index}`)
}

function shapeFromMatterBody(
  body: MatterBodyLike,
  fallbackRadius: number
): PhysicsBodyShape {
  const radius = finite(body.circleRadius)
  if (radius != null && radius > 0) return { type: "circle", radius }
  const bounds = body.bounds
  if (bounds) {
    const width = Math.max(1, bounds.max.x - bounds.min.x)
    const height = Math.max(1, bounds.max.y - bounds.min.y)
    return { type: "aabb", width, height }
  }
  return { type: "circle", radius: fallbackRadius }
}

function colliderShapeFromMatterBody(
  body: MatterBodyLike,
  fallbackRadius: number
): PhysicsColliderShape {
  const position = body.position ?? { x: 0, y: 0 }
  const radius = finite(body.circleRadius)
  if (radius != null && radius > 0) {
    return {
      type: "aabb",
      x: position.x,
      y: position.y,
      width: radius * 2,
      height: radius * 2
    }
  }
  const bounds = body.bounds
  if (bounds) {
    return {
      type: "aabb",
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      width: Math.max(1, bounds.max.x - bounds.min.x),
      height: Math.max(1, bounds.max.y - bounds.min.y)
    }
  }
  return {
    type: "aabb",
    x: position.x,
    y: position.y,
    width: fallbackRadius * 2,
    height: fallbackRadius * 2
  }
}

function datumFromMatterBody(
  body: MatterBodyLike,
  datumFromPlugin: string | undefined
): unknown {
  if (!datumFromPlugin) return body.plugin
  return body.plugin?.[datumFromPlugin]
}

export function matterBodyToPhysicsBodySpec(
  body: MatterBodyLike,
  index = 0,
  options: MatterMigrationOptions = {}
): PhysicsBodySpec {
  const fallbackRadius = options.fallbackRadius ?? 4
  const idPrefix = options.idPrefix ?? "matter-body"
  const position = body.position ?? { x: 0, y: 0 }
  const velocity = body.velocity ?? { x: 0, y: 0 }
  return {
    id: bodyId(body, index, idPrefix),
    x: position.x,
    y: position.y,
    vx: velocity.x,
    vy: velocity.y,
    angle: body.angle,
    mass: finite(body.mass) ?? 1,
    shape: shapeFromMatterBody(body, fallbackRadius),
    datum: datumFromMatterBody(body, options.datumFromPlugin)
  }
}

export function matterBodyToPhysicsColliderSpec(
  body: MatterBodyLike,
  index = 0,
  options: MatterMigrationOptions = {}
): PhysicsColliderSpec {
  const fallbackRadius = options.fallbackRadius ?? 4
  const idPrefix = options.idPrefix ?? "matter-collider"
  return {
    id: bodyId(body, index, idPrefix),
    sensor: Boolean(body.isSensor),
    shape: colliderShapeFromMatterBody(body, fallbackRadius)
  }
}

export function matterBodiesToPhysicsSpawns(
  bodies: readonly MatterBodyLike[],
  options: MatterMigrationOptions = {}
): PhysicsBodySpec[] {
  return bodies.map((body, index) =>
    matterBodyToPhysicsBodySpec(body, index, options)
  )
}

export function matterBodiesToPhysicsColliders(
  bodies: readonly MatterBodyLike[],
  options: MatterMigrationOptions = {}
): PhysicsColliderSpec[] {
  return bodies.map((body, index) =>
    matterBodyToPhysicsColliderSpec(body, index, options)
  )
}

export async function loadMatterPhysicsPeer(): Promise<unknown> {
  const module = await loadOptionalPhysicsPeer(MATTER_PHYSICS_INSTALL)
  return (module as { default?: unknown }).default ?? module
}

export function matterPhysicsDependencyError(cause?: unknown): Error {
  return optionalEngineDependencyError(MATTER_PHYSICS_INSTALL, cause)
}
