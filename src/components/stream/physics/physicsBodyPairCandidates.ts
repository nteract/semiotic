import type { PhysicsBodyState } from "./PhysicsKernel"
import {
  aabbOverlap,
  bodyInsideBounds,
  paddedBodyBounds
} from "./physicsCollisionBounds"

type BodyCandidateBounds = ReturnType<typeof paddedBodyBounds> & {
  cellX: number
  cellY: number
}

/** A neighbor list remains valid while each body stays inside its padded
 * starting bounds. Position correction can create contacts that did not
 * overlap at the beginning of a step, so exact-overlap lists are insufficient. */
export function physicsBodyPairCandidates(
  bodies: PhysicsBodyState[],
  size: number,
  gravity = { x: 0, y: 0 }
) {
  let maximumExtent = 1
  const bounds = bodies.map((body) => {
    const box = paddedBodyBounds(body) as BodyCandidateBounds
    if (body.bodyCollisions !== false) {
      maximumExtent = Math.max(
        maximumExtent,
        box.maxX - box.minX,
        box.maxY - box.minY
      )
    }
    return box
  })
  // A large configured cell otherwise compares a dense pile of tiny marks
  // quadratically. Bound its size by the actual padded swept extents; the
  // overlap test and final ordering remain independent of this partition.
  const cellSize = Math.max(1, Math.min(size, maximumExtent))
  // Numeric coordinates avoid rebuilding and hashing a string for every cell.
  const columns = new Map<number, Map<number, number[]>>()
  for (let i = 0; i < bodies.length; i += 1) {
    if (bodies[i].bodyCollisions === false) continue
    const box = bounds[i]
    box.cellX = Math.floor(box.minX / cellSize)
    box.cellY = Math.floor(box.minY / cellSize)
    for (let x = box.cellX; x <= Math.floor(box.maxX / cellSize); x += 1) {
      let column = columns.get(x)
      if (!column) columns.set(x, (column = new Map()))
      for (let y = box.cellY; y <= Math.floor(box.maxY / cellSize); y += 1) {
        const cell = column.get(y)
        if (cell) cell.push(i)
        else column.set(y, [i])
      }
    }
  }
  const pairs: [number, number][] = []
  for (const [x, column] of columns) {
    for (const [y, indexes] of column) {
      for (let i = 0; i < indexes.length; i += 1) {
        for (let j = i + 1; j < indexes.length; j += 1) {
          const a = indexes[i]
          const b = indexes[j]
          const first = bounds[a]
          const second = bounds[b]
          // Emit a pair only from its first shared cell, avoiding both duplicate
          // tuples and a separate pair-key set.
          if (
            x !== Math.max(first.cellX, second.cellX) ||
            y !== Math.max(first.cellY, second.cellY)
          )
            continue
          if (aabbOverlap(first, second)) {
            pairs.push([a, b])
          }
        }
      }
    }
  }
  const depths = bodies.map((body) => body.x * gravity.x + body.y * gravity.y)
  pairs.sort(
    ([a0, a1], [b0, b1]) =>
      Math.max(depths[b0], depths[b1]) - Math.max(depths[a0], depths[a1]) ||
      (a0 === b0 ? a1 - b1 : a0 - b0)
  )
  return {
    pairs,
    coversPositions: () =>
      bodies.every(
        (body, index) =>
          body.bodyCollisions === false || bodyInsideBounds(body, bounds[index])
      )
  }
}
