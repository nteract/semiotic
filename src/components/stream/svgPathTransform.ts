/**
 * Minimal SVG path normalizer and point-mapper.
 *
 * Normalizes any path string to absolute `M/L/C/Q/Z` segments (H/V become L,
 * S/T are reflected into C/Q, and elliptical arcs become cubic Béziers), then
 * maps every vertex and control point through a caller-supplied function.
 * Béziers commute with affine maps, so mapping control points is exact for an
 * affine projection; arcs are converted first because they do not.
 */

export type PathPointMapper = (x: number, y: number) => [number, number]

/** One absolute segment: M/L carry one point, Q two, C three, Z none. */
export interface NormalizedPathSegment {
  c: "M" | "L" | "C" | "Q" | "Z"
  p: number[]
}

const COMMAND = /[MmLlHhVvCcSsQqTtAaZz]/
const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
const ARGS: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0
}

function arcToCubics(
  x1: number, y1: number, rx: number, ry: number, angle: number,
  largeArc: number, sweep: number, x2: number, y2: number
): number[][] {
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) return [[x1, y1, x2, y2, x2, y2]]
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  const phi = (angle * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const xp = cos * dx + sin * dy
  const yp = -sin * dx + cos * dy
  const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
  const den = rx * rx * yp * yp + ry * ry * xp * xp
  let coef = Math.sqrt(Math.max(0, num / den))
  if (largeArc === sweep) coef = -coef
  const cxp = (coef * rx * yp) / ry
  const cyp = (-coef * ry * xp) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const vAngle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const theta = vAngle(1, 0, (xp - cxp) / rx, (yp - cyp) / ry)
  let delta = vAngle((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry)
  if (!sweep && delta > 0) delta -= Math.PI * 2
  else if (sweep && delta < 0) delta += Math.PI * 2

  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9))
  const step = delta / segments
  const k = (4 / 3) * Math.tan(step / 4)
  const point = (t: number): [number, number] => [
    cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
    cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos
  ]
  const derivative = (t: number): [number, number] => [
    -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin,
    -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos
  ]
  const out: number[][] = []
  let t0 = theta
  for (let i = 0; i < segments; i++) {
    const t1 = t0 + step
    const [ax, ay] = point(t0)
    const [bx, by] = i === segments - 1 ? [x2, y2] : point(t1)
    const [d0x, d0y] = derivative(t0)
    const [d1x, d1y] = derivative(t1)
    out.push([ax + k * d0x, ay + k * d0y, bx - k * d1x, by - k * d1y, bx, by])
    t0 = t1
  }
  return out
}

/** Parse and normalize an SVG path to absolute M/L/C/Q/Z segments. */
export function normalizeSvgPath(d: string): NormalizedPathSegment[] {
  const tokens = d.match(TOKEN)
  if (!tokens) return []
  const out: NormalizedPathSegment[] = []
  let i = 0
  let cmd = ""
  let x = 0, y = 0, startX = 0, startY = 0
  let lastC: [number, number] | null = null
  let lastQ: [number, number] | null = null
  while (i < tokens.length) {
    if (COMMAND.test(tokens[i])) cmd = tokens[i++]
    else if (!cmd) return out
    const upper = cmd.toUpperCase()
    const rel = cmd !== upper
    const n = ARGS[upper]
    if (upper === "Z") {
      out.push({ c: "Z", p: [] })
      x = startX
      y = startY
      lastC = lastQ = null
      continue
    }
    if (i + n > tokens.length) break
    const a = tokens.slice(i, i + n).map(Number)
    i += n
    if (a.some((v) => !Number.isFinite(v))) break
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    let nextC: [number, number] | null = null
    let nextQ: [number, number] | null = null
    switch (upper) {
      case "M":
        x = a[0] + ox; y = a[1] + oy
        startX = x; startY = y
        out.push({ c: "M", p: [x, y] })
        // Subsequent coordinate pairs after a moveto are implicit linetos.
        cmd = rel ? "l" : "L"
        break
      case "L":
        x = a[0] + ox; y = a[1] + oy
        out.push({ c: "L", p: [x, y] })
        break
      case "H":
        x = a[0] + ox
        out.push({ c: "L", p: [x, y] })
        break
      case "V":
        y = a[0] + (rel ? y : 0)
        out.push({ c: "L", p: [x, y] })
        break
      case "C": {
        const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, a[4] + ox, a[5] + oy]
        out.push({ c: "C", p })
        nextC = [p[2], p[3]]
        x = p[4]; y = p[5]
        break
      }
      case "S": {
        const c1x: number = lastC ? 2 * x - lastC[0] : x
        const c1y: number = lastC ? 2 * y - lastC[1] : y
        const p: number[] = [c1x, c1y, a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy]
        out.push({ c: "C", p })
        nextC = [p[2], p[3]]
        x = p[4]; y = p[5]
        break
      }
      case "Q": {
        const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy]
        out.push({ c: "Q", p })
        nextQ = [p[0], p[1]]
        x = p[2]; y = p[3]
        break
      }
      case "T": {
        const c1x: number = lastQ ? 2 * x - lastQ[0] : x
        const c1y: number = lastQ ? 2 * y - lastQ[1] : y
        const p: number[] = [c1x, c1y, a[0] + ox, a[1] + oy]
        out.push({ c: "Q", p })
        nextQ = [c1x, c1y]
        x = p[2]; y = p[3]
        break
      }
      case "A": {
        const ex = a[5] + ox
        const ey = a[6] + oy
        for (const p of arcToCubics(x, y, a[0], a[1], a[2], a[3], a[4], ex, ey)) {
          out.push({ c: "C", p })
          nextC = [p[2], p[3]]
        }
        x = ex; y = ey
        break
      }
    }
    lastC = nextC
    lastQ = nextQ
  }
  return out
}

const fmt = (v: number) => {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? "0" : String(r)
}

/** Serialize normalized segments after mapping every point. */
export function serializeSvgPath(
  segments: readonly NormalizedPathSegment[],
  map?: PathPointMapper
): string {
  let d = ""
  for (const seg of segments) {
    d += seg.c
    for (let j = 0; j < seg.p.length; j += 2) {
      const [x, y] = map ? map(seg.p[j], seg.p[j + 1]) : [seg.p[j], seg.p[j + 1]]
      d += (j ? " " : "") + fmt(x) + " " + fmt(y)
    }
  }
  return d
}

/** Map every vertex and control point of an SVG path string. */
export function transformSvgPath(d: string, map: PathPointMapper): string {
  return serializeSvgPath(normalizeSvgPath(d), map)
}

/** Call `visit` for every vertex and control point (convex-hull bounds). */
export function forEachSvgPathPoint(
  segments: readonly NormalizedPathSegment[],
  visit: (x: number, y: number) => void
): void {
  for (const seg of segments) {
    for (let j = 0; j < seg.p.length; j += 2) visit(seg.p[j], seg.p[j + 1])
  }
}

/** Closed polygon path through the given points. */
export function polygonPath(points: ReadonlyArray<readonly [number, number]>): string {
  let d = ""
  points.forEach(([x, y], i) => {
    d += (i ? "L" : "M") + fmt(x) + " " + fmt(y)
  })
  return d + "Z"
}
