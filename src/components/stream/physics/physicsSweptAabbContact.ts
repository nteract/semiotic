import type { PhysicsBodyState, PhysicsColliderShape } from "./PhysicsKernel"

/** Preserve the entry face when motion or contact corrections cross a solid
 * AABB. Current-position overlap alone can project a crowded body out of the
 * far face, or miss a thin wall entirely. Sensors keep their overlap semantics. */
export function sweptAabbContact(
  body: PhysicsBodyState,
  shape: PhysicsColliderShape,
  slop: number
): { nx: number; ny: number; penetration: number } | null {
  if (shape.type !== "aabb") return null
  const dx = body.x - body.prevX
  const dy = body.y - body.prevY
  if (dx === 0 && dy === 0) return null

  const rx = body.shape.type === "circle" ? body.shape.radius : body.shape.width / 2
  const ry = body.shape.type === "circle" ? body.shape.radius : body.shape.height / 2
  const left = shape.x - shape.width / 2
  const right = shape.x + shape.width / 2
  const top = shape.y - shape.height / 2
  const bottom = shape.y + shape.height / 2
  if (Math.max(body.x, body.prevX) + rx < left ||
    Math.min(body.x, body.prevX) - rx > right ||
    Math.max(body.y, body.prevY) + ry < top ||
    Math.min(body.y, body.prevY) - ry > bottom) return null
  // A circle reaches a flat face only when its center crosses that face's
  // span. Corners retain the existing exact circle/AABB contact calculation.
  const spanX = body.shape.type === "circle" ? 0 : rx
  const spanY = body.shape.type === "circle" ? 0 : ry
  let firstTime = Infinity
  let contact: { nx: number; ny: number; penetration: number } | null = null
  const axis = (position: number, previous: number, delta: number, radius: number,
    near: number, far: number, across: number, acrossDelta: number,
    min: number, max: number, horizontal: boolean) => {
    let time: number
    let penetration: number
    let normal: number
    if (delta > 0 && previous + radius <= near + slop && position + radius > near) {
      time = Math.max(0, (near - radius - previous) / delta)
      penetration = position + radius - near
      normal = -1
    } else if (delta < 0 && previous - radius >= far - slop && position - radius < far) {
      time = Math.max(0, (far + radius - previous) / delta)
      penetration = far - (position - radius)
      normal = 1
    } else return
    const crossing = across + acrossDelta * time
    if (time < firstTime && crossing >= min && crossing <= max) {
      firstTime = time
      contact = { nx: horizontal ? normal : 0, ny: horizontal ? 0 : normal, penetration }
    }
  }
  // Preserve x-before-y tie breaking while sharing the entry-face arithmetic.
  axis(body.x, body.prevX, dx, rx, left, right, body.prevY, dy,
    top - spanY, bottom + spanY, true)
  axis(body.y, body.prevY, dy, ry, top, bottom, body.prevX, dx,
    left - spanX, right + spanX, false)
  return contact
}
