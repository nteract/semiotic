import type { PhysicsBodyState } from "./PhysicsKernel"

export type ContactPoint = [number, number]
export interface PhysicsContact {
  nx: number
  ny: number
  penetration: number
}
const EPSILON = 1e-9

/** Clip the path against a convex polygon's open interior. An isolated
 * corner touch or travel along a face has no interior interval. */
function entersPolygon(
  body: PhysicsBodyState,
  points: ContactPoint[]
): boolean {
  let entry = 0
  let exit = 1
  const dx = body.x - body.prevX
  const dy = body.y - body.prevY
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[(i + 1) % points.length]
    const nx = by - ay
    const ny = ax - bx
    if (Math.hypot(nx, ny) <= EPSILON) continue
    const separation = (body.prevX - ax) * nx + (body.prevY - ay) * ny
    const approach = dx * nx + dy * ny
    if (approach < 0) entry = Math.max(entry, -separation / approach)
    else if (approach > 0) exit = Math.min(exit, -separation / approach)
    else if (separation >= 0) return false
    if (entry >= exit) return false
  }
  return entry < exit
}

/** Signed distance to the unrounded polygon (negative inside), and the outward
 * normal of the nearest boundary. Two vertices describe a circle's segment. */
export function nearestBoundary(x: number, y: number, points: ContactPoint[]) {
  let inside = points.length > 2
  let best = Infinity
  let closestX = points[0][0]
  let closestY = points[0][1]
  let nx = 1
  let ny = 0
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[(i + 1) % points.length]
    const dx = bx - ax
    const dy = by - ay
    const length = Math.hypot(dx, dy)
    if (length <= EPSILON) continue
    const ex = dy / length
    const ey = -dx / length
    if ((x - ax) * ex + (y - ay) * ey > 0) inside = false
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (length * length))
    )
    const px = ax + t * dx
    const py = ay + t * dy
    const distanceSquared = (x - px) ** 2 + (y - py) ** 2
    if (distanceSquared < best) {
      best = distanceSquared
      closestX = px
      closestY = py
      nx = ex
      ny = ey
    }
  }
  const distance = Math.hypot(x - closestX, y - closestY)
  if (!inside && distance > EPSILON) {
    nx = (x - closestX) / distance
    ny = (y - closestY) / distance
  }
  return { distance: inside ? -distance : distance, nx, ny }
}

export function sweepRoundedPolygon(
  body: PhysicsBodyState,
  points: ContactPoint[],
  radius: number,
  slop: number
): PhysicsContact | null {
  const dx = body.x - body.prevX
  const dy = body.y - body.prevY
  const speedSquared = dx * dx + dy * dy
  if (speedSquared <= EPSILON * EPSILON) return null
  if (radius === 0 && !entersPolygon(body, points)) return null
  // Deep initial overlaps need the minimum separating translation, not a
  // crossing reconstructed from a point that was already inside the solid.
  if (nearestBoundary(body.prevX, body.prevY, points).distance < radius - slop)
    return null
  let firstTime = Infinity
  let contact: PhysicsContact | null = null
  const accept = (
    time: number,
    nx: number,
    ny: number,
    ax: number,
    ay: number
  ) => {
    if (time < 0 || time > 1 || time > firstTime) return
    // Keep the kernel's x-before-y tie break at an exact rectangular corner.
    if (time === firstTime && contact && Math.abs(nx) <= Math.abs(contact.nx))
      return
    if (dx * nx + dy * ny >= 0) return
    const penetration = radius - ((body.x - ax) * nx + (body.y - ay) * ny)
    if (penetration <= 0) return
    firstTime = time
    contact = { nx: nx === 0 ? 0 : nx, ny: ny === 0 ? 0 : ny, penetration }
  }
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[(i + 1) % points.length]
    const sx = bx - ax
    const sy = by - ay
    const length = Math.hypot(sx, sy)
    if (length > EPSILON) {
      const nx = sy / length
      const ny = -sx / length
      const approach = dx * nx + dy * ny
      const separation =
        (body.prevX - ax) * nx + (body.prevY - ay) * ny - radius
      if (approach < 0 && separation >= -slop) {
        const time = Math.max(0, -separation / approach)
        const along =
          ((body.prevX + time * dx - ax) * sx +
            (body.prevY + time * dy - ay) * sy) /
          length
        if (along >= 0 && along <= length) accept(time, nx, ny, ax, ay)
      }
    }
    if (radius <= 0) continue
    // Rounded vertices cover capsule endpoints and thick-segment box corners.
    const px = body.prevX - ax
    const py = body.prevY - ay
    const approach = px * dx + py * dy
    const separation = px * px + py * py - radius * radius
    const discriminant = approach * approach - speedSquared * separation
    if (approach >= 0 || discriminant < 0) continue
    const time = Math.max(
      0,
      (-approach - Math.sqrt(discriminant)) / speedSquared
    )
    const nx = px + time * dx
    const ny = py + time * dy
    const lengthToVertex = Math.hypot(nx, ny)
    if (lengthToVertex > EPSILON)
      accept(time, nx / lengthToVertex, ny / lengthToVertex, ax, ay)
  }
  return contact
}
