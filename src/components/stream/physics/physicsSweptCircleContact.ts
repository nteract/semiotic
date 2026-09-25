import type { PhysicsBodyState } from "./PhysicsKernel"

/** Keep fast circle contacts on their entry side, including when one circle
 * has crossed the other between fixed steps. */
export function sweptCircleContact(a: PhysicsBodyState, b: PhysicsBodyState) {
  if (a.shape.type !== "circle" || b.shape.type !== "circle") return null
  const radius = a.shape.radius + b.shape.radius
  if (radius <= 0) return null
  const px = b.prevX - a.prevX
  const py = b.prevY - a.prevY
  const dx = b.x - a.x - px
  const dy = b.y - a.y - py
  const speedSq = dx * dx + dy * dy
  const approach = 2 * (px * dx + py * dy)
  const separation = px * px + py * py - radius * radius
  if (separation < -1e-5 || speedSq <= 1e-12 || approach >= 0) return null
  const discriminant = approach * approach - 4 * speedSq * separation
  if (discriminant < 0) return null
  const time = (-approach - Math.sqrt(discriminant)) / (2 * speedSq)
  if (time < 0 || time > 1) return null
  const nx = (px + time * dx) / radius
  const ny = (py + time * dy) / radius
  const penetration = radius - ((b.x - a.x) * nx + (b.y - a.y) * ny)
  return penetration > 0 ? { nx, ny, penetration } : null
}
