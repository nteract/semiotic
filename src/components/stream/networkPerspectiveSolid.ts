/**
 * Side walls for perspective "pieces": any flat outline lying on the ground
 * gains visible thickness. Walls are vertical, and every perspective preset
 * lifts straight up on screen, so a wall is the screen-space strip between a
 * top outline and the same outline `drop` px lower.
 */
import type { NetworkPerspectiveFace } from "./networkSceneTypes"
import { polygonPath, type NormalizedPathSegment } from "./svgPathTransform"

type Pt = [number, number]

/** Flatten the first subpath of normalized segments into a polygon. */
export function samplePolygon(segs: readonly NormalizedPathSegment[], steps = 8): Pt[] {
  const out: Pt[] = []
  let x = 0
  let y = 0
  for (const seg of segs) {
    const p = seg.p
    if (seg.c === "M") {
      if (out.length) break
      x = p[0]
      y = p[1]
      out.push([x, y])
    } else if (seg.c === "L") {
      x = p[0]
      y = p[1]
      out.push([x, y])
    } else if (seg.c === "Q" || seg.c === "C") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const u = 1 - t
        out.push(
          seg.c === "Q"
            ? [u * u * x + 2 * u * t * p[0] + t * t * p[2], u * u * y + 2 * u * t * p[1] + t * t * p[3]]
            : [
                u * u * u * x + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t * t * t * p[4],
                u * u * u * y + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t * t * t * p[5]
              ]
        )
      }
      x = p[p.length - 2]
      y = p[p.length - 1]
    } else if (seg.c === "Z") {
      break
    }
  }
  const [fx, fy] = out[0] ?? [0, 0]
  const [lx, ly] = out[out.length - 1] ?? [0, 0]
  if (out.length > 1 && Math.abs(fx - lx) < 1e-9 && Math.abs(fy - ly) < 1e-9) out.pop()
  return out
}

/**
 * Visible walls of a solid whose top outline (screen px) sits `drop` px above
 * its base. A wall shows when its outward normal points down-screen (toward
 * the viewer); light comes from the upper left, so left-facing walls are
 * lighter than right-facing ones. Neighboring walls with the same shade merge
 * into one strip, painted far to near.
 */
export function extrudeOutline(top: readonly Pt[], drop: number, rim: "faceted" | "flat" = "faceted"): NetworkPerspectiveFace[] {
  const n = top.length
  if (n < 3 || !(drop > 0.05)) return []
  let area = 0
  for (let i = 0; i < n; i++) {
    const [x0, y0] = top[i]
    const [x1, y1] = top[(i + 1) % n]
    area += x0 * y1 - x1 * y0
  }
  const sign = area >= 0 ? 1 : -1
  const shades = top.map((p, i): number | null => {
    const q = top[(i + 1) % n]
    const dx = q[0] - p[0]
    const dy = q[1] - p[1]
    const len = Math.hypot(dx, dy)
    if (len < 1e-9) return null
    const nx = (sign * dy) / len
    const ny = (-sign * dx) / len
    if (ny <= 0.02) return null
    if (rim === "flat") return -0.26
    // Quantized so curved outlines merge into a few lit bands. Isometric
    // normals land on half-step ties; absorb coordinate/libm roundoff so
    // ties consistently follow Math.round's direction toward +Infinity.
    return Math.round(-6.5 - 4 * nx + 1e-9) * 0.04
  })
  // Start after a break so no strip wraps across index 0.
  let start = shades.findIndex((s, i) => s !== shades[(i + n - 1) % n])
  if (start < 0) start = 0
  const faces: Array<NetworkPerspectiveFace & { depth: number }> = []
  const wall = (run: number[], shade: number, depth?: number) => {
    const strip: Pt[] = []
    for (const i of run) strip.push(top[i])
    strip.push(top[(run[run.length - 1] + 1) % n])
    const bottom = strip.map(([x, y]): Pt => [x, y + drop]).reverse()
    faces.push({
      pathD: polygonPath([...strip, ...bottom]),
      shade,
      depth: depth ?? strip.reduce((s, p) => s + p[1], 0) / strip.length
    })
  }
  let run: number[] = []
  let chain: number[] = []
  const flush = () => {
    if (run.length) wall(run, shades[run[0]]!)
    run = []
  }
  const endChain = () => {
    flush()
    // Several bands along one wall: a backing strip in the darkest shade
    // closes the anti-aliasing seams between them.
    const bands = new Set(chain.map((i) => shades[i]))
    if (bands.size > 1) wall(chain, Math.min(...(bands as Set<number>)), -Infinity)
    chain = []
  }
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n
    const shade = shades[i]
    if (shade == null) {
      endChain()
      continue
    }
    if (run.length && shades[run[0]] !== shade) flush()
    run.push(i)
    chain.push(i)
  }
  endChain()
  return faces
    .sort((p, q) => p.depth - q.depth)
    .map(({ pathD, shade }) => ({ pathD, shade: Math.round(shade * 100) / 100 }))
}
