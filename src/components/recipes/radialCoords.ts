/**
 * Radial coordinate kit — the angle ⟂ radius primitives a bespoke radial chart
 * needs when it encodes *two independent continuous channels* (angle = one
 * field, radius = another) and so can't use a built-in band-and-radius radial
 * scale. The radial analogue of the `bandLabel` / `roundedEnclosure` chrome kit.
 *
 * Pure / SSR-safe, dependency-free (no d3-scale / d3-shape, to keep the recipes
 * bundle lean). Complements the `radialGeometry` helpers in `semiotic/utils`
 * (`sweepToAngles` / `valueToAngle`) which target gauge-style single-value arcs.
 *
 * **Angle convention:** `0` points up (12 o'clock); angle increases **clockwise**
 * (the d3-pie / d3-arc convention). Angles are in **radians**. This matches the
 * SVG renderer and reads naturally for day-of-year / clock / compass charts.
 */

/** One full turn in radians. */
export const TAU = Math.PI * 2

export interface Point {
  x: number
  y: number
}

export interface PolarOptions {
  /** Center of the polar system in plot coordinates. @default `{ x: 0, y: 0 }`
   *  (radial ordinal layouts are already center-translated). */
  center?: Point
}

/**
 * Convert a polar `(angle, radius)` to Cartesian `(x, y)` in the kit's
 * convention (0 = up, clockwise). Inverse of {@link xyToAngle}.
 */
export function polarToXY(angle: number, radius: number, opts?: PolarOptions): Point {
  const cx = opts?.center?.x ?? 0
  const cy = opts?.center?.y ?? 0
  return { x: cx + Math.sin(angle) * radius, y: cy - Math.cos(angle) * radius }
}

/**
 * The angle (radians, 0 = up, clockwise, range `[0, TAU)`) of a point relative
 * to the center — the inverse of {@link polarToXY}, for turning a pointer
 * position into a domain value (e.g. a circular brush handle drag).
 */
export function xyToAngle(x: number, y: number, opts?: PolarOptions): number {
  const cx = opts?.center?.x ?? 0
  const cy = opts?.center?.y ?? 0
  return (Math.atan2(x - cx, -(y - cy)) + TAU) % TAU
}

export interface AngleScaleOptions {
  /** Angle (radians) at the domain start. @default 0 (up) */
  startAngle?: number
  /** Angle (radians) at the domain end. @default {@link TAU} (full clockwise turn) */
  endAngle?: number
}

/**
 * A linear scale from a data domain to angles (radians). The continuous-angle
 * companion to a band scale: `angleScale([0, 365])` maps day-of-year to a full
 * clockwise turn from the top.
 */
export function angleScale(
  domain: readonly [number, number],
  opts?: AngleScaleOptions,
): (value: number) => number {
  const [d0, d1] = domain
  const span = d1 - d0 || 1
  const start = opts?.startAngle ?? 0
  const end = opts?.endAngle ?? TAU
  return (value: number) => start + ((value - d0) / span) * (end - start)
}

/**
 * A linear scale from a data domain to a pixel radius range. The radial analogue
 * of a y-scale: `radiusScale([-10, 110], [0, 180])` maps temperature to radius.
 */
export function radiusScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0)
}

export type RingArcOptions = PolarOptions

/**
 * SVG path string for an **annular sector** (a ring arc) between two angles and
 * two radii — the radial bar / brush-arc / envelope-band primitive the radial
 * examples hand-rolled with `d3.arc`. Angles in the kit convention (0 = up,
 * clockwise, radians). Handles three cases:
 *
 *   - `innerRadius <= 0` → a pie wedge (lines to center).
 *   - a full turn (`|endAngle − startAngle| ≥ TAU`) → a complete ring/annulus
 *     (drawn as two half-arcs so SVG can render the closed loop).
 *   - otherwise → a standard annular sector.
 *
 * For a clean ring pass `startAngle < endAngle` (clockwise). A wrap-around range
 * (e.g. a brush from day 350→20) should be split into two calls by the caller.
 */
export function ringArcPath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  opts?: RingArcOptions,
): string {
  const center = opts?.center
  const p = (a: number, r: number) => {
    const { x, y } = polarToXY(a, r, { center })
    return `${round(x)},${round(y)}`
  }
  const r0 = Math.max(0, innerRadius)
  const r1 = Math.max(r0, outerRadius)
  const delta = Math.abs(endAngle - startAngle)
  const sweep = endAngle >= startAngle ? 1 : 0

  // Full ring / annulus — SVG arcs can't close a 360° loop in one command.
  if (delta >= TAU - 1e-6) {
    const cx = center?.x ?? 0
    const cy = center?.y ?? 0
    const top1 = `${round(cx)},${round(cy - r1)}`
    const bot1 = `${round(cx)},${round(cy + r1)}`
    let d = `M${top1} A${round(r1)},${round(r1)} 0 1 1 ${bot1} A${round(r1)},${round(r1)} 0 1 1 ${top1} Z`
    if (r0 > 0) {
      const top0 = `${round(cx)},${round(cy - r0)}`
      const bot0 = `${round(cx)},${round(cy + r0)}`
      // Reverse winding so the inner circle subtracts (nonzero fill rule → hole).
      d += ` M${top0} A${round(r0)},${round(r0)} 0 1 0 ${bot0} A${round(r0)},${round(r0)} 0 1 0 ${top0} Z`
    }
    return d
  }

  const largeArc = delta > Math.PI ? 1 : 0
  const outerStart = p(startAngle, r1)
  const outerEnd = p(endAngle, r1)

  if (r0 <= 0) {
    const cx = center?.x ?? 0
    const cy = center?.y ?? 0
    return `M${round(cx)},${round(cy)} L${outerStart} A${round(r1)},${round(r1)} 0 ${largeArc} ${sweep} ${outerEnd} Z`
  }

  const innerEnd = p(endAngle, r0)
  const innerStart = p(startAngle, r0)
  return (
    `M${outerStart} A${round(r1)},${round(r1)} 0 ${largeArc} ${sweep} ${outerEnd}` +
    ` L${innerEnd} A${round(r0)},${round(r0)} 0 ${largeArc} ${sweep === 1 ? 0 : 1} ${innerStart} Z`
  )
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}
