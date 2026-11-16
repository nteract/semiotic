import { clamp } from "./recipeUtils"

// Named symbol paths round vertices to 0.001 px. Allow for rounding both the
// original extent and the final scaled path when checking physical clearance.
const ROUNDING_PAD = 0.002

/** Small deterministic PRNG so the force packing is stable across renders. */
function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * Seeded, deterministic packing of variable-radius circles within a cell rect.
 *
 * A jittered grid sized to the cell aspect seeds the marks near-uniformly (so
 * they start close to non-overlapping at a comfortable density), then a few
 * spatial-hash relaxation passes push apart any overlaps and clamp to the cell.
 *
 * Deliberately self-contained (no `d3-force` / `d3-quadtree`): the hot loop must
 * not cross module boundaries, because the docs bundle disables scope hoisting
 * and a cross-module tight loop deoptimizes badly (≈25× slower). Native `Map`
 * + arithmetic keeps it fast in any build.
 */
export function packCell(
  marks: { id: string; r: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
  padding: number,
  iterations: number,
  seed: number
): { positions: Map<string, { px: number; py: number }>; scale: number } {
  const cx = x + w / 2
  const cy = y + h / 2
  const out = new Map<string, { px: number; py: number }>()
  const n = marks.length
  if (n === 0) return { positions: out, scale: 1 }
  if (n === 1) {
    out.set(marks[0].id, { px: cx, py: cy })
    const r = marks[0].r
    return {
      positions: out,
      scale:
        r > 0
          ? Math.max(0, Math.min(1, (Math.min(w, h) / 2 - ROUNDING_PAD) / r))
          : 1
    }
  }

  const rng = lcg(seed)
  const R = new Float64Array(n)
  let maxR = 0
  for (let i = 0; i < n; i++) {
    R[i] = marks[i].r + padding
    if (R[i] > maxR) maxR = R[i]
  }

  // Jittered grid seed sized to the cell aspect ratio.
  const cols = Math.min(n, Math.max(1, Math.round(Math.sqrt((n * w) / h))))
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  const gw = w / cols
  const gh = h / Math.ceil(n / cols)
  for (let i = 0; i < n; i++) {
    const gx = i % cols
    const gy = Math.floor(i / cols)
    px[i] = x + (gx + 0.3 + rng() * 0.4) * gw
    py[i] = y + (gy + 0.3 + rng() * 0.4) * gh
  }

  // Spatial-hash relaxation. A near-uniform seed needs only light cleanup, so a
  // small fixed pass count usually separates at the capped density. A final
  // geometric fit below handles residual collisions, even with zero passes.
  const passes = Math.max(0, Math.min(iterations, 14))
  const cellSz = Math.max(1, (maxR + ROUNDING_PAD) * 2)
  const buckets = new Map<number, number[]>()
  const cwid = Math.max(1, Math.ceil(w / cellSz) + 3)
  const bucketKey = (gx: number, gy: number): number =>
    (gy + 1) * cwid + (gx + 1)
  for (let pass = 0; pass < passes; pass++) {
    buckets.clear()
    for (let i = 0; i < n; i++) {
      const k = bucketKey(
        Math.floor((px[i] - x) / cellSz),
        Math.floor((py[i] - y) / cellSz)
      )
      const arr = buckets.get(k)
      if (arr) arr.push(i)
      else buckets.set(k, [i])
    }
    for (let i = 0; i < n; i++) {
      const gx = Math.floor((px[i] - x) / cellSz)
      const gy = Math.floor((py[i] - y) / cellSz)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const arr = buckets.get(bucketKey(gx + dx, gy + dy))
          if (!arr) continue
          for (let a = 0; a < arr.length; a++) {
            const j = arr[a]
            if (j <= i) continue
            let ddx = px[j] - px[i]
            let ddy = py[j] - py[i]
            const rr = R[i] + R[j]
            const d2 = ddx * ddx + ddy * ddy
            if (d2 >= rr * rr) continue
            if (d2 > 1e-9) {
              const d = Math.sqrt(d2)
              const shift = (rr - d) / 2
              ddx /= d
              ddy /= d
              px[i] -= ddx * shift
              py[i] -= ddy * shift
              px[j] += ddx * shift
              py[j] += ddy * shift
            } else {
              // Coincident: nudge apart deterministically.
              const ang = i * 2.39996323
              px[i] += Math.cos(ang) * R[i]
              py[i] += Math.sin(ang) * R[i]
            }
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const r = R[i]
      const loX = x + r
      const hiX = x + w - r
      const loY = y + r
      const hiY = y + h - r
      px[i] = hiX > loX ? clamp(px[i], loX, hiX) : cx
      py[i] = hiY > loY ? clamp(py[i], loY, hiY) : cy
    }
  }

  // Relaxation is approximate. Measure the remaining clearance rather than
  // claiming an area cap alone guarantees separation. Only nearby pairs can
  // constrain a factor <= 1, so reuse the spatial hash instead of an n² scan.
  const clearance = () => {
    let scale = 1
    buckets.clear()
    for (let i = 0; i < n; i++) {
      const r = marks[i].r
      if (r > 0)
        scale = Math.min(
          scale,
          (px[i] - x - ROUNDING_PAD) / r,
          (x + w - px[i] - ROUNDING_PAD) / r,
          (py[i] - y - ROUNDING_PAD) / r,
          (y + h - py[i] - ROUNDING_PAD) / r
        )
      const gx = Math.floor((px[i] - x) / cellSz),
        gy = Math.floor((py[i] - y) / cellSz)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const j of buckets.get(bucketKey(gx + dx, gy + dy)) ?? []) {
            const sum = r + marks[j].r
            if (sum > 0)
              scale = Math.min(
                scale,
                (Math.hypot(px[j] - px[i], py[j] - py[i]) - ROUNDING_PAD * 2) /
                  sum
              )
          }
        }
      }
      const key = bucketKey(gx, gy)
      const bucket = buckets.get(key)
      if (bucket) bucket.push(i)
      else buckets.set(key, [i])
    }
    return scale
  }
  let scale = clearance()
  if (scale < 0.5) {
    // A pathological cell can collapse points onto a boundary. Fall back to
    // distinct grid centers before fitting, retaining every record.
    for (let i = 0; i < n; i++) {
      px[i] = x + ((i % cols) + 0.5) * gw
      py[i] = y + (Math.floor(i / cols) + 0.5) * gh
    }
    scale = clearance()
  }
  for (let i = 0; i < n; i++) out.set(marks[i].id, { px: px[i], py: py[i] })
  return { positions: out, scale: Math.max(0, scale) }
}
