export function convexHull(points) {
  if (points.length <= 2) return [...points]

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (origin, first, second) =>
    (first.x - origin.x) * (second.y - origin.y) - (first.y - origin.y) * (second.x - origin.x)
  const lower = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop()
    lower.push(point)
  }
  const upper = []
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop()
    upper.push(point)
  }

  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

export function paddedHull(points, padding = 20) {
  const hull = convexHull(points)
  if (hull.length < 3) return hull

  const center = hull.reduce(
    (total, point) => ({ x: total.x + point.x / hull.length, y: total.y + point.y / hull.length }),
    { x: 0, y: 0 },
  )

  return hull.map((point) => {
    const dx = point.x - center.x
    const dy = point.y - center.y
    const distance = Math.hypot(dx, dy) || 1
    return {
      x: point.x + (dx / distance) * padding,
      y: point.y + (dy / distance) * padding,
    }
  })
}

export function tracePolygon(context, points) {
  if (!points.length) return
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) context.lineTo(point.x, point.y)
  if (points.length > 2) context.closePath()
}
