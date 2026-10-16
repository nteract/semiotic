import type { PhysicsColliderBodyFilter, PhysicsColliderSpec } from "./PhysicsKernel"

function sameValues(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  // Array.some in matchesPhysicsBodyFilter skips holes; an authored undefined
  // entry can match a missing field, but an empty slot cannot.
  for (let i = 0; i < a.length; i++) {
    if ((i in a) !== (i in b) || !Object.is(a[i], b[i])) return false
  }
  return true
}

function sameFilter(a: PhysicsColliderBodyFilter | undefined, b: PhysicsColliderBodyFilter | undefined): boolean {
  if (a === b) return true
  if (!a || !b || typeof a === "function" || typeof b === "function") return false
  return a.property === b.property &&
    ("equals" in a) === ("equals" in b) &&
    ("notEquals" in a) === ("notEquals" in b) &&
    Object.is(a.equals, b.equals) &&
    Object.is(a.notEquals, b.notEquals) && sameValues(a.oneOf, b.oneOf) &&
    sameValues(a.notOneOf, b.notOneOf)
}

/** Collider order and filter value identity affect contact behavior. */
export function physicsCollidersEqual(
  a: readonly PhysicsColliderSpec[] | undefined,
  b: readonly PhysicsColliderSpec[] | undefined
): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  return a.every((collider, i) => {
    const other = b[i]
    const shape = collider.shape
    const otherShape = other.shape
    const sameShape = shape.type === "segment" && otherShape.type === "segment"
      ? shape.x1 === otherShape.x1 && shape.y1 === otherShape.y1 &&
        shape.x2 === otherShape.x2 && shape.y2 === otherShape.y2 &&
        (shape.thickness ?? 0) === (otherShape.thickness ?? 0)
      : shape.type === "aabb" && otherShape.type === "aabb" &&
        shape.x === otherShape.x && shape.y === otherShape.y &&
        shape.width === otherShape.width && shape.height === otherShape.height
    return collider.id === other.id && collider.sensor === other.sensor &&
      collider.friction === other.friction && collider.restitution === other.restitution &&
      sameFilter(collider.bodyFilter, other.bodyFilter) && sameShape
  })
}
