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
  const consider = (time: number, across: number, min: number, max: number,
    nx: number, ny: number, penetration: number) => {
    if (time < firstTime && across >= min && across <= max) {
      firstTime = time
      contact = { nx, ny, penetration }
    }
  }
  if (dx > 0 && body.prevX + rx <= left + slop && body.x + rx > left) {
    const time = Math.max(0, (left - rx - body.prevX) / dx)
    consider(time, body.prevY + dy * time, top - spanY, bottom + spanY,
      -1, 0, body.x + rx - left)
  } else if (dx < 0 && body.prevX - rx >= right - slop && body.x - rx < right) {
    const time = Math.max(0, (right + rx - body.prevX) / dx)
    consider(time, body.prevY + dy * time, top - spanY, bottom + spanY,
      1, 0, right - (body.x - rx))
  }
  if (dy > 0 && body.prevY + ry <= top + slop && body.y + ry > top) {
    const time = Math.max(0, (top - ry - body.prevY) / dy)
    consider(time, body.prevX + dx * time, left - spanX, right + spanX,
      0, -1, body.y + ry - top)
  } else if (dy < 0 && body.prevY - ry >= bottom - slop && body.y - ry < bottom) {
    const time = Math.max(0, (bottom + ry - body.prevY) / dy)
    consider(time, body.prevX + dx * time, left - spanX, right + spanX,
      0, 1, bottom - (body.y - ry))
  }
  return contact
}
