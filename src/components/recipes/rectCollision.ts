import type { CollisionBox } from "./axisFixedForce"

// Sweep the axis with fewer overlapping intervals. The fixed-axis ordering can
// be reused throughout an axis-fixed simulation; the other ordering follows the
// moving boxes. Storage stays linear, even when every pair overlaps.
function intervalSweep(
  boxes: readonly CollisionBox[],
  axis: "x" | "y",
  padding: number
) {
  const size = axis === "x" ? "width" : "height"
  const lower = new Float64Array(boxes.length)
  const upper = new Float64Array(boxes.length)
  const order = Array.from({ length: boxes.length }, (_, i) => i)
  let pairs = 0
  const update = () => {
    for (let i = 0; i < boxes.length; i++) {
      const radius = (boxes[i][size] + Math.max(0, padding)) / 2
      lower[i] = boxes[i][axis] - radius
      upper[i] = boxes[i][axis] + radius
    }
    order.sort((a, b) => lower[a] - lower[b] || a - b)
    pairs = 0
    for (let i = 0; i < order.length; i++) {
      let lo = i + 1,
        hi = order.length
      while (lo < hi) {
        const mid = (lo + hi) >>> 1
        if (lower[order[mid]] <= upper[order[i]]) lo = mid + 1
        else hi = mid
      }
      pairs += lo - i - 1
    }
  }
  update()
  return {
    lower,
    upper,
    order,
    update,
    get pairs() {
      return pairs
    }
  }
}

/** Internal reusable collision pass. Boxes may move along the free axis. */
export function createRectCollision(
  boxes: readonly CollisionBox[],
  axis: "x" | "y",
  padding: number,
  strength: number,
  fixedCrossAxis = false
): () => Float64Array {
  const cross = axis === "x" ? "y" : "x"
  const freeSize = axis === "x" ? "width" : "height"
  const crossSize = axis === "x" ? "height" : "width"
  const freeSweep = intervalSweep(boxes, axis, padding)
  const crossSweep = intervalSweep(boxes, cross, padding)
  const forces = new Float64Array(boxes.length)
  return () => {
    forces.fill(0)
    freeSweep.update()
    if (!fixedCrossAxis) crossSweep.update()
    const { order, lower, upper } =
      freeSweep.pairs < crossSweep.pairs ? freeSweep : crossSweep
    for (let i = 0; i < order.length; i++) {
      const ai = order[i]
      const a = boxes[ai]
      for (
        let j = i + 1;
        j < order.length && lower[order[j]] <= upper[ai];
        j++
      ) {
        const bi = order[j]
        const b = boxes[bi]
        if (
          Math.abs(a[cross] - b[cross]) >
          (a[crossSize] + b[crossSize]) / 2 + padding
        )
          continue
        const delta = b[axis] - a[axis] || (a.id < b.id ? -0.5 : 0.5)
        const overlap =
          (a[freeSize] + b[freeSize]) / 2 + padding - Math.abs(delta)
        if (overlap <= 0) continue
        const push = overlap * strength * Math.sign(delta)
        forces[ai] -= push
        forces[bi] += push
      }
    }
    return forces
  }
}
