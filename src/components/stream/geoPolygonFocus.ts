// d3 emits projected polygon rings as M/L/Z subpaths. The area-weighted
// centroid of wrapped pieces can lie in the ocean between them.
export function polygonFocusAnchor(
  path: string,
  [cx, cy]: [number, number]
): [number, number] | undefined {
  if (
    !path.endsWith("Z") ||
    !path.includes("M", 1) ||
    /[^MLZ0-9eE+.,-]/.test(path)
  )
    return
  const rings = path
    .slice(1)
    .split("M")
    .map((ring) =>
      ring
        .slice(0, -1)
        .split("L")
        .map((pair) => pair.split(",").map(Number))
    )
  const crossings: number[] = []
  for (const ring of rings) {
    let previous = ring[ring.length - 1]
    for (const point of ring) {
      if (previous[1] > cy !== point[1] > cy) {
        crossings.push(
          previous[0] +
            ((cy - previous[1]) * (point[0] - previous[0])) /
              (point[1] - previous[1])
        )
      }
      previous = point
    }
  }
  crossings.sort((a, b) => a - b)
  let widest = 0,
    mid = 0
  for (let i = 1; i < crossings.length; i += 2) {
    const left = crossings[i - 1],
      right = crossings[i]
    if (cx >= left && cx <= right) return
    if (right - left > widest) {
      widest = right - left
      mid = (left + right) / 2
    }
  }
  if (widest) return [mid, cy]
  const [x, y] = rings[0][0]
  return [x, y]
}
