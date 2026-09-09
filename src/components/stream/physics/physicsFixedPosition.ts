import type { PhysicsBodyState } from "./PhysicsKernel"

/** Fixed coordinates take precedence over forces, impulses, and contacts. */
export function enforceFixedPosition(body: PhysicsBodyState): void {
  const fixed = body.fixedPosition
  if (Number.isFinite(fixed?.x)) {
    body.x = body.prevX = fixed!.x!
    body.vx = 0
  }
  if (Number.isFinite(fixed?.y)) {
    body.y = body.prevY = fixed!.y!
    body.vy = 0
  }
}

export function cloneFixedPosition(fixed: PhysicsBodyState["fixedPosition"]) {
  if (!fixed) return undefined
  const x = Number.isFinite(fixed.x) ? fixed.x : undefined
  const y = Number.isFinite(fixed.y) ? fixed.y : undefined
  return x == null && y == null ? undefined : { x, y }
}

/**
 * Contact separation along the remaining free axis. A radial circle normal
 * cannot separate two equal-x circles horizontally when x encodes a value.
 */
export function fixedAxisContact(
  a: PhysicsBodyState,
  b: PhysicsBodyState,
  fixedAxis: "x" | "y"
): { nx: number; ny: number; penetration: number } {
  const freeAxis = fixedAxis === "x" ? "y" : "x"
  const across = Math.abs(b[fixedAxis] - a[fixedAxis])
  const delta = b[freeAxis] - a[freeAxis]
  const extent = (body: PhysicsBodyState, axis: "x" | "y") =>
    body.shape.type === "circle"
      ? body.shape.radius
      : (axis === "x" ? body.shape.width : body.shape.height) / 2
  let separation: number
  if (a.shape.type === "circle" && b.shape.type === "circle") {
    const sum = a.shape.radius + b.shape.radius
    separation = Math.sqrt(Math.max(0, sum * sum - across * across))
  } else if (a.shape.type === "aabb" && b.shape.type === "aabb") {
    separation = extent(a, freeAxis) + extent(b, freeAxis)
  } else {
    const circle = a.shape.type === "circle" ? a : b
    const box = a.shape.type === "aabb" ? a : b
    const radius = extent(circle, fixedAxis)
    const outside = Math.max(0, across - extent(box, fixedAxis))
    separation =
      extent(box, freeAxis) +
      Math.sqrt(Math.max(0, radius * radius - outside * outside))
  }
  const sign = delta < 0 ? -1 : 1
  return {
    nx: freeAxis === "x" ? sign : 0,
    ny: freeAxis === "y" ? sign : 0,
    penetration: Math.max(0, separation - Math.abs(delta))
  }
}
