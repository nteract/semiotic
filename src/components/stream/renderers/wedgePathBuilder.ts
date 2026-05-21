/**
 * Annular sector path builder with selective per-end corner rounding.
 *
 * d3-shape's `arc().cornerRadius()` rounds ALL FOUR corners of an
 * annular sector uniformly — there's no built-in per-corner control.
 * For gauges with multiple zones we want the gauge's OUTER endpoints
 * rounded (the swimlane convention applied radially) but internal zone
 * seams to stay square. This helper builds the path manually so each
 * end can be opted in independently.
 *
 * The geometry mirrors d3's algorithm: a corner circle of radius `cr`
 * is inscribed tangent to both walls (the outer/inner arc and the
 * radial line at the relevant angle). The angular setback from the
 * radial line is `asin(cr / (R ± cr))` — `R - cr` for outer corners
 * (corner centers sit `cr` inward of the outer arc), `R + cr` for
 * inner corners.
 *
 * Returned shape is an SVG path `d` attribute, equivalently consumable
 * by Path2D in canvas. Coordinates are wedge-local (centered at
 * origin); the renderer translates to `(cx, cy)`.
 *
 * Inputs use the **canvas angle convention** (0 = 3 o'clock, positive
 * clockwise) — same as `WedgeSceneNode.startAngle/endAngle`. d3-shape
 * uses 0 = 12 o'clock, so callers that pre-rotated by `+π/2` to call
 * d3-arc should NOT pre-rotate when calling this helper.
 */

export interface AnnularPathOptions {
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  cornerRadius?: number
  /** Round the side at startAngle (both inner + outer corners there). */
  roundStart?: boolean
  /** Round the side at endAngle (both inner + outer corners there). */
  roundEnd?: boolean
}

interface XY { x: number; y: number }

const polar = (r: number, a: number): XY => ({ x: r * Math.cos(a), y: r * Math.sin(a) })

/**
 * Build the SVG path for an annular sector with per-end rounding.
 *
 * When `cornerRadius` is 0 or unset, OR neither `roundStart` nor
 * `roundEnd` is true, the result is a plain unrounded sector — same
 * shape `drawWedgeManual` would emit. When both ends are rounded with
 * a single cornerRadius value, the output matches what d3-arc would
 * produce. The novel case is mixed rounding: e.g. `roundStart: true,
 * roundEnd: false` rounds only the gauge's leading edge.
 *
 * Defensive clamps:
 *   - `cornerRadius` is clamped to `(outerRadius - innerRadius) / 2`
 *     so the corner circles can't cross the ring's centerline (which
 *     would invert the inner radial line).
 *   - If the angular sweep is too small to fit two corner radii
 *     end-to-end on the requested side, that side falls back to
 *     unrounded so the path stays well-formed.
 */
export function annularSectorPath(opts: AnnularPathOptions): string {
  const { innerRadius, outerRadius, startAngle, endAngle } = opts
  const isPie = innerRadius <= 0
  const wantsRound = (opts.cornerRadius ?? 0) > 0 && (opts.roundStart || opts.roundEnd)

  if (!wantsRound) {
    // Fast path — unrounded sector / pie.
    if (isPie) {
      const a = polar(outerRadius, startAngle)
      const b = polar(outerRadius, endAngle)
      const sweep = endAngle - startAngle
      const large = sweep > Math.PI ? 1 : 0
      return `M0,0 L${a.x},${a.y} A${outerRadius},${outerRadius} 0 ${large} 1 ${b.x},${b.y} Z`
    }
    const a = polar(outerRadius, startAngle)
    const b = polar(outerRadius, endAngle)
    const c = polar(innerRadius, endAngle)
    const d = polar(innerRadius, startAngle)
    const sweep = endAngle - startAngle
    const large = sweep > Math.PI ? 1 : 0
    // M A L A→C inner-arc backward L close
    return `M${a.x},${a.y} A${outerRadius},${outerRadius} 0 ${large} 1 ${b.x},${b.y} L${c.x},${c.y} A${innerRadius},${innerRadius} 0 ${large} 0 ${d.x},${d.y} Z`
  }

  // Rounded path. Clamp cornerRadius so corner circles can't cross the
  // ring's mid-line; cornerRadius > ringWidth/2 produces broken
  // geometry where the inner corner sits outside the outer corner.
  const ringWidth = outerRadius - innerRadius
  const cr = Math.max(0, Math.min(opts.cornerRadius ?? 0, ringWidth / 2))
  if (cr === 0) {
    return annularSectorPath({ ...opts, cornerRadius: 0, roundStart: false, roundEnd: false })
  }

  // Angular setback at each radius. `(R - cr)` is the corner-circle
  // center distance from origin for outer corners; `(R + cr)` for
  // inner. asin(cr / (R±cr)) is the angle between the radial line and
  // the line from origin to the corner-circle center.
  const phiOuter = Math.asin(Math.min(1, cr / Math.max(1e-9, outerRadius - cr)))
  const phiInner = isPie ? 0 : Math.asin(Math.min(1, cr / Math.max(1e-9, innerRadius + cr)))

  // If the wedge is too thin angularly to fit the requested rounded
  // side(s), fall back to no rounding on the side that overruns. One
  // rounded end only needs one angular setback; two rounded ends need
  // room for both.
  const angularSweep = endAngle - startAngle
  const maxPhiPerEnd = opts.roundStart && opts.roundEnd ? angularSweep / 2 : angularSweep
  const roundStart = !!opts.roundStart && phiOuter < maxPhiPerEnd
  const roundEnd = !!opts.roundEnd && phiOuter < maxPhiPerEnd

  if (!roundStart && !roundEnd) {
    return annularSectorPath({ ...opts, cornerRadius: 0, roundStart: false, roundEnd: false })
  }

  // Effective inner/outer arc endpoints after accounting for rounded
  // setbacks on each side.
  const aOuter = startAngle + (roundStart ? phiOuter : 0)
  const bOuter = endAngle - (roundEnd ? phiOuter : 0)
  const aInner = startAngle + (roundStart ? phiInner : 0)
  const bInner = endAngle - (roundEnd ? phiInner : 0)

  // Tangent points where corner circles meet the arcs / radial lines.
  // For each rounded corner we use four points:
  //   p_arcTan  — on the arc itself (outer or inner) at angle ±phi
  //   p_lineTan — on the radial line, at distance (R∓cr)*cos(phi)
  // The corner is traced as an SVG `A cr cr 0 0 sweep px py` segment
  // between those points.

  // Outer arc endpoints (after corner setbacks).
  const A = polar(outerRadius, aOuter)            // outer-start point on the arc
  const B = polar(outerRadius, bOuter)             // outer-end point on the arc

  // Radial-line tangent points (outer side). Distance from origin to
  // the foot of perpendicular from the corner circle's center to the
  // radial line: (R - cr) * cos(phi).
  const outerCornerDist = (outerRadius - cr) * Math.cos(phiOuter)
  const tStartOuter = polar(outerCornerDist, startAngle)
  const tEndOuter = polar(outerCornerDist, endAngle)

  // Inner arc endpoints + radial-line tangent points.
  const C = isPie ? null : polar(innerRadius, bInner)
  const D = isPie ? null : polar(innerRadius, aInner)
  const innerCornerDist = isPie ? 0 : (innerRadius + cr) * Math.cos(phiInner)
  const tStartInner = isPie ? null : polar(innerCornerDist, startAngle)
  const tEndInner = isPie ? null : polar(innerCornerDist, endAngle)

  // Outer arc sweep flag.
  const outerSweepLarge = (bOuter - aOuter) > Math.PI ? 1 : 0
  const innerSweepLarge = isPie ? 0 : (bInner - aInner) > Math.PI ? 1 : 0

  // Build the path. CCW around the wedge: start at start-side radial,
  // outer arc to end-side, end-side radial, inner arc back to start.
  let d = ""

  // ── Start: outer corner or hard radial point ──
  if (roundStart) {
    // Begin at the outer tangent point on the start radial.
    d += `M${tStartOuter.x},${tStartOuter.y}`
    // Quarter-arc up to the outer-arc tangent point at angle (start + phi).
    d += ` A${cr},${cr} 0 0 1 ${A.x},${A.y}`
  } else {
    // Begin at the hard corner (outerRadius, startAngle).
    const Araw = polar(outerRadius, startAngle)
    d += `M${Araw.x},${Araw.y}`
  }

  // ── Outer arc to end side (set back if roundEnd, else to the hard corner) ──
  if (roundEnd) {
    d += ` A${outerRadius},${outerRadius} 0 ${outerSweepLarge} 1 ${B.x},${B.y}`
    // Rounded outer→radial corner at end side.
    d += ` A${cr},${cr} 0 0 1 ${tEndOuter.x},${tEndOuter.y}`
  } else {
    const Braw = polar(outerRadius, endAngle)
    d += ` A${outerRadius},${outerRadius} 0 ${outerSweepLarge} 1 ${Braw.x},${Braw.y}`
  }

  // ── End-side radial line + inner end-side corner ──
  if (isPie) {
    // Pie: the inner radius is 0, so we go straight to origin and back.
    d += ` L0,0`
  } else {
    if (roundEnd) {
      // From tEndOuter, draw radial line inward to tEndInner.
      d += ` L${tEndInner!.x},${tEndInner!.y}`
      // Rounded inner corner at end side.
      d += ` A${cr},${cr} 0 0 1 ${C!.x},${C!.y}`
    } else {
      // Straight radial all the way to the inner endpoint (hard corner).
      const Craw = polar(innerRadius, endAngle)
      d += ` L${Craw.x},${Craw.y}`
    }

    // ── Inner arc backward to start side ──
    if (roundStart) {
      d += ` A${innerRadius},${innerRadius} 0 ${innerSweepLarge} 0 ${D!.x},${D!.y}`
      // Rounded inner corner at start side.
      d += ` A${cr},${cr} 0 0 1 ${tStartInner!.x},${tStartInner!.y}`
    } else {
      const Draw = polar(innerRadius, startAngle)
      d += ` A${innerRadius},${innerRadius} 0 ${innerSweepLarge} 0 ${Draw.x},${Draw.y}`
    }
  }

  // ── Close back to the start point ──
  // If roundStart, the start tangent on inner-side is followed by a
  // straight radial line back to the outer-side start tangent — the
  // path closes that gap automatically with `Z`. If not roundStart,
  // we go from the inner hard corner straight up to the outer hard
  // corner via Z (the implicit closing line).
  d += ` Z`
  return d
}

/**
 * Build the clip outline + slice paths for a gauge gradient band.
 *
 * The band is rendered as one rounded annular sector used as a clip
 * mask, with N unrounded slice sectors painted inside. Each slice
 * extends from its own start angle out to the band's full end angle,
 * so adjacent colors overpaint each other's trailing edge — eliminates
 * subpixel AA gaps between slices without an explicit overlap epsilon
 * and means the staircase reveals one color per `sliceAngle` of arc.
 *
 * Canvas and SVG renderers both consume this: canvas builds Path2D
 * objects from the strings, SVG drops them straight into `<path d="…"/>`.
 */
export interface GaugeGradientGeometryOptions {
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  cornerRadius?: number
  roundStart?: boolean
  roundEnd?: boolean
  colors: string[]
}

export interface GaugeGradientGeometry {
  clipPath: string
  slices: { d: string; color: string }[]
}

export function buildGaugeGradientGeometry(opts: GaugeGradientGeometryOptions): GaugeGradientGeometry {
  const clipPath = annularSectorPath({
    innerRadius: opts.innerRadius,
    outerRadius: opts.outerRadius,
    startAngle: opts.startAngle,
    endAngle: opts.endAngle,
    cornerRadius: opts.cornerRadius,
    roundStart: opts.roundStart,
    roundEnd: opts.roundEnd,
  })

  const slices: { d: string; color: string }[] = []
  const colors = opts.colors
  if (colors.length > 0) {
    const span = opts.endAngle - opts.startAngle
    const sliceAngle = span / colors.length
    for (let i = 0; i < colors.length; i++) {
      const sliceStart = opts.startAngle + i * sliceAngle
      slices.push({
        d: annularSectorPath({
          innerRadius: opts.innerRadius,
          outerRadius: opts.outerRadius,
          startAngle: sliceStart,
          endAngle: opts.endAngle,
        }),
        color: colors[i],
      })
    }
  }

  return { clipPath, slices }
}
