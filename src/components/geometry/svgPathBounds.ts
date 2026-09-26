export interface PathBox {
  x: number
  y: number
  w: number
  h: number
}
type Point = [number, number]
type Include = (x: number, y: number) => void
const TAU = Math.PI * 2
const angle = (a: number) => ((a % TAU) + TAU) % TAU

function cubic(p: number[], t: number) {
  const u = 1 - t
  return (
    u ** 3 * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t ** 3 * p[3]
  )
}

function curveBounds(points: Point[], include: Include) {
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1])
  include(xs[0], ys[0])
  include(xs[3], ys[3])
  for (const p of [xs, ys]) {
    const a = -p[0] + 3 * p[1] - 3 * p[2] + p[3]
    const b = 2 * (p[0] - 2 * p[1] + p[2])
    const c = p[1] - p[0]
    const roots =
      Math.abs(a) < 1e-12
        ? b === 0
          ? []
          : [-c / b]
        : b * b - 4 * a * c < 0
          ? []
          : [
              (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a),
              (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a)
            ]
    for (const t of roots)
      if (t > 0 && t < 1) include(cubic(xs, t), cubic(ys, t))
  }
}

/** SVG endpoint-to-center conversion and radii correction:
 * https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes */
function arcBounds(start: Point, end: Point, args: number[], include: Include) {
  let [rx, ry] = args.map(Math.abs)
  include(...start)
  include(...end)
  if (rx === 0 || ry === 0 || (start[0] === end[0] && start[1] === end[1]))
    return
  const phi = (args[2] * Math.PI) / 180,
    cp = Math.cos(phi),
    sp = Math.sin(phi)
  const dx = (start[0] - end[0]) / 2,
    dy = (start[1] - end[1]) / 2
  const xp = cp * dx + sp * dy,
    yp = -sp * dx + cp * dy
  const scale = Math.hypot(xp / rx, yp / ry)
  if (scale > 1) {
    rx *= scale
    ry *= scale
  }
  const lambda = (xp / rx) ** 2 + (yp / ry) ** 2
  const factor =
    (args[3] === args[4] ? -1 : 1) *
    Math.sqrt(Math.max(0, (1 - lambda) / lambda))
  const cxp = (factor * rx * yp) / ry,
    cyp = (-factor * ry * xp) / rx
  const cx = cp * cxp - sp * cyp + (start[0] + end[0]) / 2
  const cy = sp * cxp + cp * cyp + (start[1] + end[1]) / 2
  const first = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx)
  const last = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx)
  const sweep = args[4] ? angle(last - first) : -angle(first - last)
  const ex = Math.atan2(-ry * sp, rx * cp),
    ey = Math.atan2(ry * cp, rx * sp)
  for (const t of [ex, ex + Math.PI, ey, ey + Math.PI]) {
    const distance = sweep >= 0 ? angle(t - first) : angle(first - t)
    if (distance <= Math.abs(sweep) + 1e-12) {
      include(
        cx + rx * cp * Math.cos(t) - ry * sp * Math.sin(t),
        cy + rx * sp * Math.cos(t) + ry * cp * Math.sin(t)
      )
    }
  }
}

/** Analytic SVG path bounds, independent of the DOM. Invalid input returns null. */
export function svgPathBounds(d: string): PathBox | null {
  let offset = 0,
    command = "",
    previous = ""
  let current: Point = [0, 0],
    origin: Point = [0, 0],
    control: Point = [0, 0]
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  const include: Include = (x, y) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const skip = () => {
    while (offset < d.length && /[\s,]/.test(d[offset])) offset++
  }
  const number = (flag = false) => {
    skip()
    const token = flag
      ? /^[01]/.exec(d.slice(offset))
      : /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(d.slice(offset))
    if (!token) return NaN
    offset += token[0].length
    return Number(token[0])
  }
  while (offset < d.length) {
    skip()
    if (offset === d.length) break
    if (/[a-z]/i.test(d[offset])) command = d[offset++]
    const upper = command.toUpperCase(),
      relative = command !== upper
    if (!previous && upper !== "M") return null
    if (upper === "Z") {
      include(...current)
      include(...origin)
      current = [...origin]
      previous = "Z"
      command = ""
      continue
    }
    const count = (
      { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 } as Record<
        string,
        number
      >
    )[upper]
    if (!count) return null
    const values = Array.from({ length: count }, (_, i) =>
      number(upper === "A" && (i === 3 || i === 4))
    )
    if (!values.every(Number.isFinite)) return null
    const point = (i: number): Point => [
      values[i] + (relative ? current[0] : 0),
      values[i + 1] + (relative ? current[1] : 0)
    ]
    const end: Point =
      upper === "H"
        ? [values[0] + (relative ? current[0] : 0), current[1]]
        : upper === "V"
          ? [current[0], values[0] + (relative ? current[1] : 0)]
          : point(count - 2)
    const reflected: Point = [
      2 * current[0] - control[0],
      2 * current[1] - control[1]
    ]
    if (upper === "C" || upper === "S") {
      const first =
        upper === "C" ? point(0) : /[CS]/.test(previous) ? reflected : current
      control = point(count - 4)
      curveBounds([current, first, control, end], include)
    } else if (upper === "Q" || upper === "T") {
      control =
        upper === "Q" ? point(0) : /[QT]/.test(previous) ? reflected : current
      curveBounds(
        [
          current,
          [
            current[0] + ((control[0] - current[0]) * 2) / 3,
            current[1] + ((control[1] - current[1]) * 2) / 3
          ],
          [
            end[0] + ((control[0] - end[0]) * 2) / 3,
            end[1] + ((control[1] - end[1]) * 2) / 3
          ],
          end
        ],
        include
      )
    } else if (upper === "A") arcBounds(current, end, values, include)
    else if (upper !== "M") {
      include(...current)
      include(...end)
    }
    current = end
    if (upper === "M") {
      origin = [...end]
      command = relative ? "l" : "L"
    }
    previous = upper
  }
  return [minX, minY, maxX, maxY].every(Number.isFinite)
    ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    : null
}
