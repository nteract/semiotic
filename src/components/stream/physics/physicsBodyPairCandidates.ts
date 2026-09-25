import type { PhysicsBodyState } from "./PhysicsKernel"

/** A neighbor list remains valid while each body stays inside its padded
 * starting bounds. Position correction can create contacts that did not
 * overlap at the beginning of a step, so exact-overlap lists are insufficient. */
export function physicsBodyPairCandidates(
  bodies: PhysicsBodyState[],
  size: number,
  gravity = { x: 0, y: 0 }
) {
  const cellSize = Math.max(1, size)
  const bounds = bodies.map((body) => {
    const rx = body.shape.type === "circle" ? body.shape.radius : body.shape.width / 2
    const ry = body.shape.type === "circle" ? body.shape.radius : body.shape.height / 2
    const padding = Math.max(0.005, Math.min(rx, ry))
    return {
      x: body.x, y: body.y, padding,
      minX: Math.min(body.x, body.prevX) - rx - padding,
      maxX: Math.max(body.x, body.prevX) + rx + padding,
      minY: Math.min(body.y, body.prevY) - ry - padding,
      maxY: Math.max(body.y, body.prevY) + ry + padding
    }
  })
  const cells = new Map<string, number[]>()
  for (let i = 0; i < bodies.length; i += 1) {
    if (bodies[i].bodyCollisions === false) continue
    const box = bounds[i]
    for (let x = Math.floor(box.minX / cellSize); x <= Math.floor(box.maxX / cellSize); x += 1) {
      for (let y = Math.floor(box.minY / cellSize); y <= Math.floor(box.maxY / cellSize); y += 1) {
        const key = `${x}:${y}`
        const cell = cells.get(key)
        if (cell) cell.push(i)
        else cells.set(key, [i])
      }
    }
  }
  const pairSet = new Set<string>()
  for (const indexes of cells.values()) {
    for (let i = 0; i < indexes.length; i += 1) {
      for (let j = i + 1; j < indexes.length; j += 1) {
        const a = indexes[i]
        const b = indexes[j]
        const first = bounds[a]
        const second = bounds[b]
        if (first.minX <= second.maxX && first.maxX >= second.minX &&
          first.minY <= second.maxY && first.maxY >= second.minY) {
          pairSet.add(`${a}:${b}`)
        }
      }
    }
  }
  // Parse once per neighbor-list build, not at every relaxation iteration.
  const depths = bodies.map((body) => body.x * gravity.x + body.y * gravity.y)
  const pairs = Array.from(pairSet, (key) => key.split(":").map(Number) as [number, number])
    .sort(([a0, a1], [b0, b1]) =>
      Math.max(depths[b0], depths[b1]) - Math.max(depths[a0], depths[a1]) ||
      (a0 === b0 ? a1 - b1 : a0 - b0)
    )
  return {
    pairs,
    coversPositions: () => bodies.every((body, index) =>
      body.bodyCollisions === false || (
        Math.abs(body.x - bounds[index].x) <= bounds[index].padding &&
        Math.abs(body.y - bounds[index].y) <= bounds[index].padding
      )
    )
  }
}
