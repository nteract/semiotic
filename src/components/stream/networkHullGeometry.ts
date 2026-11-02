interface HullPoint {
  x: number
  y: number
}

function cross(origin: HullPoint, a: HullPoint, b: HullPoint): number {
  return (
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
  )
}

/** Andrew's monotone chain with a stable lower-left start. */
export function convexHull(points: HullPoint[]): HullPoint[] {
  const sorted = points
    .slice()
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter(
      (point, index, all) =>
        index === 0 ||
        point.x !== all[index - 1].x ||
        point.y !== all[index - 1].y
    )
  if (sorted.length <= 2) return sorted

  const lower: HullPoint[] = []
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop()
    }
    lower.push(point)
  }
  const upper: HullPoint[] = []
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop()
    }
    upper.push(point)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Offset each edge of a convex polygon outwards and intersect adjacent offsets. */
export function expandConvexHull(
  points: HullPoint[],
  padding: number
): HullPoint[] {
  if (padding === 0 || points.length < 3) return points
  const areaTwice = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0)
  const orientation = areaTwice >= 0 ? 1 : -1

  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const previousLength =
      Math.hypot(point.x - previous.x, point.y - previous.y) || 1
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y) || 1
    const previousNormal =
      orientation > 0
        ? {
            x: (point.y - previous.y) / previousLength,
            y: -(point.x - previous.x) / previousLength
          }
        : {
            x: -(point.y - previous.y) / previousLength,
            y: (point.x - previous.x) / previousLength
          }
    const nextNormal =
      orientation > 0
        ? {
            x: (next.y - point.y) / nextLength,
            y: -(next.x - point.x) / nextLength
          }
        : {
            x: -(next.y - point.y) / nextLength,
            y: (next.x - point.x) / nextLength
          }
    const bisector = {
      x: previousNormal.x + nextNormal.x,
      y: previousNormal.y + nextNormal.y
    }
    const bisectorLength = Math.hypot(bisector.x, bisector.y)
    if (bisectorLength < 1e-9) {
      return {
        x: point.x + nextNormal.x * padding,
        y: point.y + nextNormal.y * padding
      }
    }
    const unit = {
      x: bisector.x / bisectorLength,
      y: bisector.y / bisectorLength
    }
    const projection = Math.max(
      1e-6,
      unit.x * nextNormal.x + unit.y * nextNormal.y
    )
    const distance = padding / projection
    return { x: point.x + unit.x * distance, y: point.y + unit.y * distance }
  })
}

function pathNumber(value: number): string {
  return String(Math.abs(value) < 1e-12 ? 0 : value)
}

export function roundedHullPath(points: HullPoint[], radius: number): string {
  if (points.length === 0) return ""
  if (points.length < 3 || radius === 0) {
    return `${points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${pathNumber(point.x)},${pathNumber(point.y)}`
      )
      .join(" ")} Z`
  }

  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const previousLength =
      Math.hypot(previous.x - point.x, previous.y - point.y) || 1
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y) || 1
    const cornerRadius = Math.min(radius, previousLength / 2, nextLength / 2)
    return {
      point,
      incoming: {
        x: point.x + ((previous.x - point.x) / previousLength) * cornerRadius,
        y: point.y + ((previous.y - point.y) / previousLength) * cornerRadius
      },
      outgoing: {
        x: point.x + ((next.x - point.x) / nextLength) * cornerRadius,
        y: point.y + ((next.y - point.y) / nextLength) * cornerRadius
      }
    }
  })

  const start = corners[0].outgoing
  let path = `M${pathNumber(start.x)},${pathNumber(start.y)}`
  for (let index = 1; index < corners.length; index++) {
    const corner = corners[index]
    path += ` L${pathNumber(corner.incoming.x)},${pathNumber(corner.incoming.y)}`
    path += ` Q${pathNumber(corner.point.x)},${pathNumber(corner.point.y)} ${pathNumber(corner.outgoing.x)},${pathNumber(corner.outgoing.y)}`
  }
  const first = corners[0]
  path += ` L${pathNumber(first.incoming.x)},${pathNumber(first.incoming.y)}`
  path += ` Q${pathNumber(first.point.x)},${pathNumber(first.point.y)} ${pathNumber(first.outgoing.x)},${pathNumber(first.outgoing.y)} Z`
  return path
}
