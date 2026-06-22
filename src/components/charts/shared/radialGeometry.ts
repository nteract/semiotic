/**
 * radialGeometry — pure math helpers for radial chart authoring.
 *
 * The original consumer is `GaugeChart`, which needs to:
 *   - Convert a sweep angle (degrees) into start-angle + radian
 *     forms that align with the convention pieScene.ts uses
 *     (0° = 12 o'clock, positive = clockwise, gap centered at the
 *     6 o'clock position).
 *   - Map a value in `[min, max]` to its angle along the arc.
 *   - Compute the arc's visible bounding box in unit-circle coords
 *     so a container can fit the arc and pick a maximum radius.
 *
 * Custom radial chart authors using `XYCustomChart` or building a
 * bespoke radial layout can reach for the same primitives without
 * reimplementing the trigonometry. Surface intentionally tight —
 * each function is a few lines of math with a documented input
 * convention.
 */
import { getMinMax } from "./minMax"

/** Result of `sweepToAngles`. All angles are in the
 *  12-o'clock-zero, clockwise-positive convention used by pieScene
 *  and the underlying gauge implementation. */
export interface SweepAngles {
  /** Full sweep angle in radians. */
  sweepRad: number
  /** Gap angle (the unfilled portion) in degrees. */
  gapDeg: number
  /** Starting angle of the arc, measured in degrees clockwise from
   *  12 o'clock. The gap is centered at 6 o'clock (180°), so the
   *  arc starts at `180° + gapDeg / 2`. */
  startAngleDeg: number
  /** Same as `startAngleDeg`, in radians (12 o'clock = 0). */
  startAngleRad: number
  /** Offset angle in radians measured from +X (3 o'clock, the
   *  trigonometric convention). Useful for direct `Math.cos` /
   *  `Math.sin` calls when projecting points onto the arc. */
  offsetRad: number
}

/**
 * Convert a sweep angle (degrees) into the four angle forms a
 * radial chart layout typically needs. Defaults to a 240° sweep
 * (gauge-style: gap of 120° centered at the bottom).
 *
 * @example
 * ```ts
 * const { sweepRad, startAngleRad } = sweepToAngles(180) // half-circle
 * ```
 */
export function sweepToAngles(sweepDegrees: number = 240): SweepAngles {
  const sweepRad = (sweepDegrees * Math.PI) / 180
  const gapDeg = 360 - sweepDegrees
  const startAngleDeg = 180 + gapDeg / 2
  const startAngleRad = (startAngleDeg * Math.PI) / 180
  // pieScene treats 0° as 12 o'clock; trig convention treats 0 as
  // 3 o'clock. The offset converts between them so a caller can
  // feed the result into Math.cos / Math.sin directly.
  const offsetRad = -Math.PI / 2 + startAngleRad
  return { sweepRad, gapDeg, startAngleDeg, startAngleRad, offsetRad }
}

/**
 * Map a numeric value in `[min, max]` to its angle along the arc.
 * Returned angles are in trig-convention radians (suitable for
 * `Math.cos` / `Math.sin` to project to unit-circle x/y).
 *
 * Values outside `[min, max]` are clamped.
 *
 * @example
 * ```ts
 * const { offsetRad, sweepRad } = sweepToAngles(240)
 * const θ = valueToAngle(75, 0, 100, sweepRad, offsetRad)
 * // x = Math.cos(θ), y = Math.sin(θ)
 * ```
 */
export function valueToAngle(
  value: number,
  min: number,
  max: number,
  sweepRad: number,
  offsetRad: number,
): number {
  const range = max - min || 1
  const clamped = Math.max(min, Math.min(max, value))
  const pct = (clamped - min) / range
  return offsetRad + pct * sweepRad
}

/** Bounding box of the visible arc in unit-circle coordinates
 *  (radius = 1 around the origin). Multiply by the chosen radius
 *  to get pixel-space extents. */
export interface ArcBoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  /** `maxX - minX`. Multiply by radius for pixel width. */
  width: number
  /** `maxY - minY`. Multiply by radius for pixel height. */
  height: number
  /** Center of the bbox in unit-circle coords. */
  cx: number
  cy: number
}

/**
 * Compute the bounding box of an arc with the given sweep, in
 * unit-circle coordinates. Useful for centering the arc within a
 * container and picking a maximum radius that keeps the arc inside
 * the available width/height.
 *
 * The bbox includes:
 *   - The two arc endpoints.
 *   - The arc's center point `(0, 0)`.
 *   - Any of the cardinal points `(±1, 0)`, `(0, ±1)` that fall
 *     within the swept range.
 *
 * @example
 * ```ts
 * const bbox = computeArcBoundingBox(240)
 * // Maximize radius so the arc fits in a (W × H) container:
 * const radius = Math.min((W - 2 * pad) / bbox.width, (H - 2 * pad) / bbox.height)
 * ```
 */
export function computeArcBoundingBox(sweepDegrees: number = 240): ArcBoundingBox {
  const { sweepRad, offsetRad } = sweepToAngles(sweepDegrees)
  const points: [number, number][] = [
    [Math.cos(offsetRad), Math.sin(offsetRad)],
    [Math.cos(offsetRad + sweepRad), Math.sin(offsetRad + sweepRad)],
    [0, 0],
  ]
  // Include any of the four cardinal points that fall within the
  // swept arc — they're often extrema, e.g. (0, -1) is the top of a
  // full half-circle.
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
    const norm = (((a - offsetRad) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    if (norm <= sweepRad + 1e-3) points.push([Math.cos(a), Math.sin(a)])
  }
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const [minX, maxX] = getMinMax(xs)
  const [minY, maxY] = getMinMax(ys)
  return {
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  }
}
