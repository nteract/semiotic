interface SwarmPoint {
  x: number
  radius: number
}

/**
 * Find readable vertical targets without changing quantitative x or radius.
 * If this greedy packing cannot fit, disclose overlap and retain every mark.
 */
export function packSwarmLane(
  points: readonly SwarmPoint[],
  top: number,
  bottom: number,
  random: () => number
): { positions: number[]; overlapping: boolean; entryOffset: number } {
  const center = (top + bottom) / 2
  const placed: Array<SwarmPoint & { y: number }> = []
  for (const point of points) {
    const neighbors = placed.filter(
      (other) => Math.abs(point.x - other.x) < point.radius + other.radius + 0.5
    )
    const candidates = [center]
    for (const other of neighbors) {
      const distance = point.radius + other.radius + 0.5
      const dy = Math.sqrt(distance ** 2 - (point.x - other.x) ** 2)
      candidates.push(other.y - dy, other.y + dy)
    }
    const direction = random() < 0.5 ? -1 : 1
    candidates.sort(
      (a, b) =>
        Math.abs(a - center) - Math.abs(b - center) || direction * (a - b)
    )
    const y = candidates.find(
      (candidate) =>
        candidate - point.radius >= top &&
        candidate + point.radius <= bottom &&
        neighbors.every(
          (other) =>
            (point.x - other.x) ** 2 + (candidate - other.y) ** 2 >=
            (point.radius + other.radius + 0.5) ** 2 - 1e-6
        )
    )
    if (y == null) {
      const maxRadius = Math.max(...points.map((row) => row.radius))
      const span = Math.max(0, bottom - top - maxRadius * 2)
      return {
        positions: points.map(
          (_, index) =>
            center +
            (points.length === 1 ? 0 : index / (points.length - 1) - 0.5) * span
        ),
        overlapping: true,
        entryOffset: 0
      }
    }
    placed.push({ ...point, y })
  }
  return {
    positions: placed.map((point) => point.y),
    overlapping: false,
    entryOffset: Math.max(
      0,
      Math.min(36, ...placed.map((point) => point.y - point.radius - top))
    )
  }
}
