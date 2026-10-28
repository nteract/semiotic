import type {
  PathCommand,
  PathSection,
  Point,
  Rect,
  TerminalGeometry
} from "./types"
import { pointBounds } from "./geometry"

const epsilon = 1e-8
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export function segmentBlocked(
  a: Point,
  b: Point,
  rectangles: readonly Rect[]
): boolean {
  return rectangles.some((r) => {
    if (Math.abs(a.x - b.x) < epsilon)
      return (
        a.x > r.x + epsilon &&
        a.x < r.x + r.width - epsilon &&
        Math.max(a.y, b.y) > r.y + epsilon &&
        Math.min(a.y, b.y) < r.y + r.height - epsilon
      )
    if (Math.abs(a.y - b.y) < epsilon)
      return (
        a.y > r.y + epsilon &&
        a.y < r.y + r.height - epsilon &&
        Math.max(a.x, b.x) > r.x + epsilon &&
        Math.min(a.x, b.x) < r.x + r.width - epsilon
      )
    return true
  })
}
export function compact(points: readonly Point[]): Point[] {
  const result: Point[] = []
  for (const p of points) {
    if (result.length && distance(result[result.length - 1], p) < epsilon)
      continue
    result.push(p)
  }
  return result
}
const length = (points: readonly Point[]) =>
  points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0)

/** Bounded rectilinear routing. Cheap channels first, then a capped visibility grid. */
export function orthogonalRoute(
  start: Point,
  end: Point,
  obstacles: readonly Rect[],
  lane: number,
  horizontal: boolean,
  budget = 40000
): Point[] | null {
  const clear = (points: Point[]) =>
    points.every(
      (p, i) => i === 0 || !segmentBlocked(points[i - 1], p, obstacles)
    )
  const middle = horizontal
    ? (start.x + end.x) / 2 + lane
    : (start.y + end.y) / 2 + lane
  const preferred = horizontal
    ? [start, { x: middle, y: start.y }, { x: middle, y: end.y }, end]
    : [start, { x: start.x, y: middle }, { x: end.x, y: middle }, end]
  if (clear(preferred)) return compact(preferred)
  const candidates: Point[][] = []
  const xs = [
    ...new Set([
      start.x,
      end.x,
      ...obstacles.flatMap((r) => [r.x, r.x + r.width])
    ])
  ].sort((a, b) => a - b)
  const ys = [
    ...new Set([
      start.y,
      end.y,
      ...obstacles.flatMap((r) => [r.y, r.y + r.height])
    ])
  ].sort((a, b) => a - b)
  for (const x of xs)
    candidates.push([start, { x, y: start.y }, { x, y: end.y }, end])
  for (const y of ys)
    candidates.push([start, { x: start.x, y }, { x: end.x, y }, end])
  const viable = candidates.filter(clear).sort((a, b) => length(a) - length(b))
  if (viable.length) return compact(viable[0])
  if (xs.length * ys.length > budget) return null
  const width = xs.length,
    count = width * ys.length
  const source = ys.indexOf(start.y) * width + xs.indexOf(start.x)
  const target = ys.indexOf(end.y) * width + xs.indexOf(end.x)
  const costs = new Float64Array(count).fill(Infinity),
    previous = new Int32Array(count).fill(-1)
  const point = (id: number) => ({
    x: xs[id % width],
    y: ys[Math.floor(id / width)]
  })
  // Binary heap avoids a quadratic scan of the grid frontier.
  const heap: Array<{ id: number; cost: number; priority: number }> = []
  const push = (id: number, cost: number) => {
    const entry = { id, cost, priority: cost + distance(point(id), end) }
    heap.push(entry)
    let i = heap.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (heap[parent].priority <= entry.priority) break
      heap[i] = heap[parent]
      i = parent
    }
    heap[i] = entry
  }
  const pop = () => {
    const top = heap[0],
      last = heap.pop()!
    if (heap.length) {
      let i = 0
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1
        if (
          child + 1 < heap.length &&
          heap[child + 1].priority < heap[child].priority
        )
          child++
        if (heap[child].priority >= last.priority) break
        heap[i] = heap[child]
        i = child
      }
      heap[i] = last
    }
    return top
  }
  costs[source] = 0
  push(source, 0)
  let visits = 0
  while (heap.length && visits++ < budget) {
    const { id, cost } = pop()
    if (cost !== costs[id]) continue
    if (id === target) {
      const path: Point[] = []
      for (let cursor = target; cursor >= 0; cursor = previous[cursor])
        path.push(point(cursor))
      return compact(path.reverse())
    }
    const x = id % width,
      y = Math.floor(id / width)
    const neighbors = [
      x > 0 ? id - 1 : -1,
      x + 1 < width ? id + 1 : -1,
      y > 0 ? id - width : -1,
      y + 1 < ys.length ? id + width : -1
    ]
    for (const next of neighbors) {
      if (next < 0 || segmentBlocked(point(id), point(next), obstacles))
        continue
      const nextCost = cost + distance(point(id), point(next))
      if (nextCost + epsilon < costs[next]) {
        costs[next] = nextCost
        previous[next] = id
        push(next, nextCost)
      }
    }
  }
  return null
}

/** Final commands are shared by SVG/canvas paths, picking, culling and exports. */
export function routeSection(
  id: string,
  points: readonly Point[],
  smooth: boolean,
  obstacles: readonly Rect[]
): PathSection {
  const commands: PathCommand[] = [{ kind: "M", point: points[0] }]
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      before = points[i - 1],
      after = points[i + 1]
    const radius = Math.min(4, distance(before, p) / 3, distance(after, p) / 3)
    const move = (toward: Point) => ({
      x: p.x + ((toward.x - p.x) * radius) / distance(p, toward),
      y: p.y + ((toward.y - p.y) * radius) / distance(p, toward)
    })
    const a = move(before),
      b = move(after)
    const box = pointBounds([a, p, b])
    const blocked = obstacles.some(
      (r) =>
        box.x < r.x + r.width &&
        box.x + box.width > r.x &&
        box.y < r.y + r.height &&
        box.y + box.height > r.y
    )
    // Retain exact terminal stubs and avoid smoothing through an obstacle corner.
    if (
      smooth &&
      radius > epsilon &&
      i > 1 &&
      i < points.length - 2 &&
      !blocked
    ) {
      commands.push(
        { kind: "L", point: a },
        { kind: "C", control1: p, control2: p, point: b }
      )
    } else commands.push({ kind: "L", point: p })
  }
  commands.push({ kind: "L", point: points[points.length - 1] })
  return {
    id,
    points,
    commands,
    bounds: pointBounds(
      commands.flatMap((c) =>
        c.kind === "C" ? [c.control1, c.control2, c.point] : [c.point]
      )
    )
  }
}
export function compositionalPath(section: PathSection): string {
  return (
    section.commands?.length
      ? section.commands
      : section.points.map((point, i) => ({
          kind: i ? ("L" as const) : ("M" as const),
          point
        }))
  )
    .map((c) =>
      c.kind === "C"
        ? `C${c.control1.x},${c.control1.y} ${c.control2.x},${c.control2.y} ${c.point.x},${c.point.y}`
        : `${c.kind}${c.point.x},${c.point.y}`
    )
    .join(" ")
}

export function flattened(section: PathSection): Point[] {
  const points: Point[] = []
  for (const command of section.commands ?? []) {
    if (command.kind !== "C") {
      points.push(command.point)
      continue
    }
    const a = points[points.length - 1],
      b = command.control1,
      c = command.control2,
      d = command.point
    for (let i = 1; i <= 24; i++) {
      const t = i / 24,
        s = 1 - t
      points.push({
        x:
          s ** 3 * a.x +
          3 * s ** 2 * t * b.x +
          3 * s * t ** 2 * c.x +
          t ** 3 * d.x,
        y:
          s ** 3 * a.y +
          3 * s ** 2 * t * b.y +
          3 * s * t ** 2 * c.y +
          t ** 3 * d.y
      })
    }
  }
  return points.length ? points : [...section.points]
}

/** Direct chord or bump geometry. Terminal anchors are shared with obstacle routing. */
export function terminalSection(
  id: string,
  source: TerminalGeometry,
  target: TerminalGeometry,
  start: Point = source.escape,
  end: Point = target.escape,
  bump = false,
  horizontal = true
): PathSection {
  const points = [
    source.anchor,
    source.escape,
    ...(distance(start, source.escape) ? [start] : []),
    ...(distance(end, target.escape) ? [end] : []),
    target.escape,
    target.anchor
  ]
  if (!bump) return { id, points, bounds: pointBounds(points) }
  const midpoint = horizontal ? (start.x + end.x) / 2 : (start.y + end.y) / 2
  const control1 = horizontal
    ? { x: midpoint, y: start.y }
    : { x: start.x, y: midpoint }
  const control2 = horizontal
    ? { x: midpoint, y: end.y }
    : { x: end.x, y: midpoint }
  const commands: PathCommand[] = [
    { kind: "M", point: source.anchor },
    { kind: "L", point: source.escape },
    ...(distance(start, source.escape)
      ? [{ kind: "L" as const, point: start }]
      : []),
    { kind: "C", control1, control2, point: end },
    ...(distance(end, target.escape)
      ? [{ kind: "L" as const, point: target.escape }]
      : []),
    { kind: "L", point: target.anchor }
  ]
  return {
    id,
    points,
    commands,
    bounds: pointBounds([...points, control1, control2])
  }
}
