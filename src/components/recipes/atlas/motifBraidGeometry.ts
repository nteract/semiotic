import {
  offsetTransitPath,
  type TransitDiagramPoint as Point
} from "../transitDiagramGeometry"

const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t
})
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

/** Round the two bends of a stepped route before taking its variable offsets. */
function sampleRoundedRoute(points: readonly Point[]): Point[] {
  const samples = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1]
    const corner = points[i]
    const next = points[i + 1]
    const incoming = distance(previous, corner)
    const outgoing = distance(corner, next)
    const r = Math.min(8, incoming / 2, outgoing / 2)
    if (r === 0) continue
    const enter = mix(corner, previous, r / incoming)
    const exit = mix(corner, next, r / outgoing)
    samples.push(enter)
    for (let sample = 1; sample <= 12; sample++) {
      const t = sample / 12
      samples.push(mix(mix(enter, corner, t), mix(corner, exit, t), t))
    }
  }
  samples.push(points[points.length - 1])
  return samples.filter(
    (point, i) => i === 0 || distance(samples[i - 1], point) > 1e-8
  )
}

/** A filled outline whose width interpolates along the rounded centerline. */
export function taperedBraidPath(
  points: readonly Point[],
  startWidth: number,
  endWidth: number
): string {
  if (points.length < 2) return ""
  const samples = sampleRoundedRoute(points)
  if (samples.length < 2) return ""
  const lengths = [0]
  for (let i = 1; i < samples.length; i++) {
    lengths.push(lengths[i - 1] + distance(samples[i - 1], samples[i]))
  }
  const total = lengths[lengths.length - 1]
  const offsets = offsetTransitPath(samples, 1)
  const sides = [1, -1].map((side) =>
    samples.map((point, i) => {
      const width = startWidth + ((endWidth - startWidth) * lengths[i]) / total
      return mix(point, offsets[i], (side * width) / 2)
    })
  )
  const outline = [...sides[0], ...sides[1].reverse()]
  return (
    outline
      .map((point, i) => `${i === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ") + " Z"
  )
}

/** Allocate stable lanes from peak widths so loss alone never bends a strand. */
export function packBraidLanes(widths: number[]): number[] {
  const total =
    widths.reduce((sum, width) => sum + width, 0) + 3 * (widths.length - 1)
  let cursor = -total / 2
  return widths.map((width) => {
    const center = cursor + width / 2
    cursor += width + 3
    return center
  })
}
