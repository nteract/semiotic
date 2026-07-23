/**
 * Screen-space geometry for magnitude-encoded bump-chart ribbons.
 *
 * A conventional area chart offsets both boundaries vertically. That makes a
 * band look artificially thin when its centerline moves sharply between
 * ranks. This helper follows the idea behind d3.svg.ribbon instead: sample the
 * centerline, calculate its local normal, then offset by the requested radius.
 * The visible thickness therefore stays perpendicular to the trajectory.
 */

export interface BumpRibbonPoint {
  x: number
  y: number
  /** Half of the desired visible ribbon thickness, in pixels. */
  radius: number
}

export interface BumpRibbonGeometry {
  topPath: [number, number][]
  bottomPath: [number, number][]
  /** Index of the nearest input datum for every sampled path vertex. */
  datumIndices: number[]
}

export interface BumpRibbonGeometryOptions {
  /** Smooth horizontal-tangent Béziers or straight segments. */
  curve?: "smooth" | "linear"
  /** Samples emitted for each interval. Stable counts enable path animation. */
  samplesPerSegment?: number
}

interface Sample {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
  datumIndex: number
}

function cubic(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const mt = 1 - t
  return mt * mt * mt * p0
    + 3 * mt * mt * t * p1
    + 3 * mt * t * t * p2
    + t * t * t * p3
}

function cubicDerivative(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const mt = 1 - t
  return 3 * mt * mt * (p1 - p0)
    + 6 * mt * t * (p2 - p1)
    + 3 * t * t * (p3 - p2)
}

function sampleInterval(
  source: BumpRibbonPoint,
  target: BumpRibbonPoint,
  sourceIndex: number,
  curve: "smooth" | "linear",
  samplesPerSegment: number,
): Sample[] {
  const out: Sample[] = []
  const midX = (source.x + target.x) / 2

  for (let step = 0; step <= samplesPerSegment; step++) {
    const t = step / samplesPerSegment
    let x: number
    let y: number
    let dx: number
    let dy: number

    if (curve === "linear") {
      x = source.x + (target.x - source.x) * t
      y = source.y + (target.y - source.y) * t
      dx = target.x - source.x
      dy = target.y - source.y
    } else {
      // Horizontal tangents at each ranking column create the traditional
      // bump-chart S-curve and make adjacent intervals meet continuously.
      x = cubic(source.x, midX, midX, target.x, t)
      y = cubic(source.y, source.y, target.y, target.y, t)
      dx = cubicDerivative(source.x, midX, midX, target.x, t)
      dy = cubicDerivative(source.y, source.y, target.y, target.y, t)
    }

    out.push({
      x,
      y,
      dx,
      dy,
      radius: source.radius + (target.radius - source.radius) * t,
      datumIndex: t < 0.5 ? sourceIndex : sourceIndex + 1,
    })
  }
  return out
}

/**
 * Build paired boundary paths around a bump-chart centerline.
 *
 * The first sample of every interval after the first is omitted because it is
 * identical to the previous interval's final sample. Every trajectory with
 * the same number of ranking columns therefore emits the same number of
 * vertices, which lets StreamXYFrame interpolate paths during data updates.
 */
export function buildBumpRibbonGeometry(
  points: BumpRibbonPoint[],
  options: BumpRibbonGeometryOptions = {},
): BumpRibbonGeometry {
  const topPath: [number, number][] = []
  const bottomPath: [number, number][] = []
  const datumIndices: number[] = []

  if (points.length < 2) return { topPath, bottomPath, datumIndices }

  const curve = options.curve ?? "smooth"
  const samplesPerSegment = Math.max(2, Math.floor(options.samplesPerSegment ?? 12))

  for (let interval = 0; interval < points.length - 1; interval++) {
    const samples = sampleInterval(
      points[interval],
      points[interval + 1],
      interval,
      curve,
      samplesPerSegment,
    )

    for (let index = interval === 0 ? 0 : 1; index < samples.length; index++) {
      const sample = samples[index]
      const length = Math.hypot(sample.dx, sample.dy) || 1
      const nx = -sample.dy / length
      const ny = sample.dx / length
      const radius = Math.max(0, sample.radius)

      topPath.push([
        sample.x + nx * radius,
        sample.y + ny * radius,
      ])
      bottomPath.push([
        sample.x - nx * radius,
        sample.y - ny * radius,
      ])
      datumIndices.push(sample.datumIndex)
    }
  }

  return { topPath, bottomPath, datumIndices }
}
