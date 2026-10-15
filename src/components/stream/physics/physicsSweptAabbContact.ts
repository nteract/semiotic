import type { PhysicsBodyState, PhysicsColliderShape } from "./PhysicsKernel"
import { sweepRoundedPolygon } from "./physicsRoundedPolygonContact"

/** Preserve the entry side when motion or contact corrections cross a solid
 * AABB. Expand flat faces by the box's half-extents or round the rectangle by
 * the circle's radius, so corner crossings cannot miss the solid. */
export function sweptAabbContact(
  body: PhysicsBodyState,
  shape: PhysicsColliderShape,
  slop: number
) {
  if (shape.type !== "aabb" || (body.x === body.prevX && body.y === body.prevY))
    return null
  const radius = body.shape.type === "circle" ? body.shape.radius : 0
  const halfWidth =
    (shape.width + (body.shape.type === "aabb" ? body.shape.width : 0)) / 2
  const halfHeight =
    (shape.height + (body.shape.type === "aabb" ? body.shape.height : 0)) / 2
  const left = shape.x - halfWidth
  const right = shape.x + halfWidth
  const top = shape.y - halfHeight
  const bottom = shape.y + halfHeight
  if (
    Math.max(body.x, body.prevX) + radius < left ||
    Math.min(body.x, body.prevX) - radius > right ||
    Math.max(body.y, body.prevY) + radius < top ||
    Math.min(body.y, body.prevY) - radius > bottom
  )
    return null
  return sweepRoundedPolygon(
    body,
    [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom]
    ],
    radius,
    slop
  )
}
