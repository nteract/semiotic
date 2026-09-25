import type { PhysicsBodyState, PhysicsColliderSpec } from "./PhysicsKernel"

export interface PhysicsAabbBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface PhysicsColliderCandidates {
  bounds: ReturnType<typeof paddedBodyBounds>
  indexes: number[]
}

export function bodyInsideBounds(
  body: PhysicsBodyState,
  bounds: ReturnType<typeof paddedBodyBounds>
): boolean {
  return (
    Math.abs(body.x - bounds.x) <= bounds.padding &&
    Math.abs(body.y - bounds.y) <= bounds.padding
  )
}

/** Retain every collider the body's swept shape can reach inside this envelope.
 * Index order is the authored collider order, including after a rebuild. */
export function colliderCandidatesForBody(
  body: PhysicsBodyState,
  colliders: ReadonlyArray<{ bounds: PhysicsAabbBounds }>
): PhysicsColliderCandidates {
  const bounds = paddedBodyBounds(body)
  const indexes: number[] = []
  for (let index = 0; index < colliders.length; index++) {
    if (aabbOverlap(bounds, colliders[index].bounds)) indexes.push(index)
  }
  return { bounds, indexes }
}

export function paddedBodyBounds(body: PhysicsBodyState) {
  const rx =
    body.shape.type === "circle" ? body.shape.radius : body.shape.width / 2
  const ry =
    body.shape.type === "circle" ? body.shape.radius : body.shape.height / 2
  const padding = Math.max(0.005, Math.min(rx, ry))
  return {
    x: body.x,
    y: body.y,
    padding,
    minX: Math.min(body.x, body.prevX) - rx - padding,
    minY: Math.min(body.y, body.prevY) - ry - padding,
    maxX: Math.max(body.x, body.prevX) + rx + padding,
    maxY: Math.max(body.y, body.prevY) + ry + padding
  }
}

export function bodyBounds(
  body: Pick<PhysicsBodyState, "x" | "y" | "shape">
): PhysicsAabbBounds {
  const rx =
    body.shape.type === "circle" ? body.shape.radius : body.shape.width / 2
  const ry =
    body.shape.type === "circle" ? body.shape.radius : body.shape.height / 2
  return {
    minX: body.x - rx,
    minY: body.y - ry,
    maxX: body.x + rx,
    maxY: body.y + ry
  }
}

export function colliderBounds(
  collider: PhysicsColliderSpec
): PhysicsAabbBounds {
  const shape = collider.shape
  if (shape.type === "aabb") {
    return bodyBounds({ x: shape.x, y: shape.y, shape })
  }
  const half = (shape.thickness ?? 0) / 2
  return {
    minX: Math.min(shape.x1, shape.x2) - half,
    minY: Math.min(shape.y1, shape.y2) - half,
    maxX: Math.max(shape.x1, shape.x2) + half,
    maxY: Math.max(shape.y1, shape.y2) + half
  }
}

export function aabbOverlap(
  a: PhysicsAabbBounds,
  b: PhysicsAabbBounds
): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  )
}
