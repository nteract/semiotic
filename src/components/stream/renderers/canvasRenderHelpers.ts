/**
 * Shared canvas-rendering primitives used by `bar`/`area`/`line`/`point`
 * renderers (and any future mark renderer that paints a fill, a stroke,
 * or a linear gradient).
 *
 * These are extractions, not abstractions: every function in this module
 * was inline-duplicated across two or more renderers in byte-identical
 * (or near-identical) form. Centralizing them eliminates drift at the
 * "what does the canvas seam look like for a stream renderer" boundary
 * and keeps each renderer focused on its mark-specific path tracing.
 *
 * Anything genuinely chart-shape-specific — `buildBarGradient`'s
 * tip-vs-base coordinate computation from `node.roundedEdge`, the
 * area's strip-decay path, the line's threshold-color crossing logic —
 * stays in the renderer that owns the mark. The helpers here are the
 * mechanical bits that recur regardless of the shape being painted.
 */
import type { CurveType } from "../types"
import { resolveCSSColor } from "./resolveCSSColor"
import { parseCanvasColor } from "./colorUtils"
import { isHatchFill, resolveHatchCanvasPattern, type HatchFill } from "../../charts/shared/hatchFill"
import {
  curveMonotoneX,
  curveMonotoneY,
  curveCardinal,
  curveCatmullRom,
  curveStep,
  curveStepBefore,
  curveStepAfter,
  curveBasis,
  curveNatural,
} from "d3-shape"
import type { CurveFactory } from "d3-shape"

/**
 * Structural shapes for the gradient configs the helpers accept. Kept
 * local rather than exported from `types.ts` because today's scene-node
 * interfaces (`AreaSceneNode`, `RectSceneNode`, `LineSceneNode`) declare
 * the same shapes inline. TS structural typing means a caller passing
 * `node.fillGradient` satisfies these types without an explicit cast.
 */
type ColorStop = { offset: number; color: string }
export type ColorStopGradient = { colorStops: ColorStop[] }
export type OpacityGradient = { topOpacity: number; bottomOpacity: number }
export type FillGradient = ColorStopGradient | OpacityGradient

/**
 * Map a `CurveType` string to a d3-shape curve factory. Returns `null`
 * for `"linear"` and `undefined` so callers can branch on a single
 * "use linear fallback" sentinel instead of a separate has-curve check.
 *
 * Identical implementations previously lived in `areaCanvasRenderer.ts`
 * and `lineCanvasRenderer.ts` — every new curve token had to be added
 * to both switches in lockstep.
 */
export function resolveCurveFactory(curve: CurveType | undefined): CurveFactory | null {
  switch (curve) {
    case "monotoneX": return curveMonotoneX
    case "monotoneY": return curveMonotoneY
    case "cardinal": return curveCardinal
    case "catmullRom": return curveCatmullRom
    case "step": return curveStep
    case "stepBefore": return curveStepBefore
    case "stepAfter": return curveStepAfter
    case "basis": return curveBasis
    case "natural": return curveNatural
    case "linear":
    case undefined:
      return null
    default:
      return null
  }
}

/**
 * Resolve a node's `style.fill` (or `style.stroke`) to something the
 * canvas can accept as `fillStyle` / `strokeStyle`:
 *
 *   - Strings go through `resolveCSSColor` so `var(...)` references
 *     resolve via the canvas DOM ancestor's computed style. Without
 *     this, canvas silently rejects CSS-variable strings and falls
 *     back to `#000000`.
 *   - `CanvasPattern` values pass through untouched.
 *   - `null` / `undefined` returns the caller-provided fallback.
 *
 * The previous inline form was
 * `(typeof X === "string" ? resolveCSSColor(ctx, X) : X) || fallback`,
 * repeated once per renderer per fill/stroke site.
 */
export function resolveCanvasFill(
  ctx: CanvasRenderingContext2D,
  fill: string | HatchFill | CanvasPattern | null | undefined,
  fallback: string,
): string | CanvasPattern {
  if (fill == null) return fallback
  // Declarative hatch descriptor → CanvasPattern (cached). Fall back to the
  // descriptor's background color if the environment can't build a pattern.
  if (isHatchFill(fill)) {
    const pattern = resolveHatchCanvasPattern(fill, ctx)
    if (pattern) return pattern
    return (fill.background && resolveCSSColor(ctx, fill.background)) || fallback
  }
  if (typeof fill !== "string") return fill
  return resolveCSSColor(ctx, fill) || fallback
}

/**
 * Narrow a possibly-`HatchFill` `style.fill` to the `string | CanvasPattern`
 * a canvas `fillStyle` accepts, resolving a hatch descriptor to a
 * `CanvasPattern` (falling back to its background color). Leaves plain string
 * / CanvasPattern fills untouched — use it to guard the direct-assign sites
 * that don't otherwise route through {@link resolveCanvasFill}, so a hatch
 * fill works on any mark, not just bars.
 */
export function coerceCanvasFill(
  ctx: CanvasRenderingContext2D,
  fill: string | HatchFill | CanvasPattern | null | undefined,
): string | CanvasPattern | undefined {
  if (isHatchFill(fill)) return resolveHatchCanvasPattern(fill, ctx) ?? fill.background ?? undefined
  return fill ?? undefined
}

/**
 * Build a linear gradient from a `FillGradient` config. Returns `null`
 * when the gradient cannot be constructed (fewer than two valid color
 * stops in the `colorStops` form, or a non-finite opacity in the
 * `topOpacity` form).
 *
 * The renderer is responsible for choosing the gradient axis (a bar
 * runs tip→base along its value axis; an area runs minTop→maxBottom
 * vertically). The opacity-form path color-normalizes through the
 * canvas via `parseCanvasColor` so named colors (`steelblue`), hsl(),
 * etc. all produce gradients that match the mark's actual fill.
 *
 * Replaces `buildBarGradient` (bar) and the inline gradient block in
 * `areaCanvasRenderer` — both implemented the same two-shape switch
 * with the same offset-clamping and the same parseCanvasColor flow.
 */
export function buildLinearFillGradient(
  ctx: CanvasRenderingContext2D,
  fillGradient: FillGradient,
  baseFill: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CanvasGradient | null {
  if ("colorStops" in fillGradient) {
    const validStops = fillGradient.colorStops
      .filter((s) => Number.isFinite(s.offset))
      .map((s) => ({ offset: Math.max(0, Math.min(1, s.offset)), color: s.color }))
    if (validStops.length < 2) return null
    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    for (const s of validStops) grad.addColorStop(s.offset, s.color)
    return grad
  }
  const { topOpacity, bottomOpacity } = fillGradient
  if (!Number.isFinite(topOpacity) || !Number.isFinite(bottomOpacity)) return null
  const top = Math.max(0, Math.min(1, topOpacity))
  const bottom = Math.max(0, Math.min(1, bottomOpacity))
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  const [r, g, b] = parseCanvasColor(ctx, baseFill)
  grad.addColorStop(0, `rgba(${r},${g},${b},${top})`)
  grad.addColorStop(1, `rgba(${r},${g},${b},${bottom})`)
  return grad
}

/**
 * Build a linear gradient from a `ColorStopGradient` (the stroke-side
 * shape — only the `colorStops` form, no opacity variant). Returns
 * `null` when there aren't enough valid stops to render a gradient.
 *
 * Caller picks the axis. Identical patterns previously lived inline in
 * `areaCanvasRenderer`'s top-stroke branch and `lineCanvasRenderer`'s
 * stroke branch.
 */
export function buildColorStopGradient(
  ctx: CanvasRenderingContext2D,
  strokeGradient: ColorStopGradient,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CanvasGradient | null {
  // Filter non-finite offsets *before* the count check — `addColorStop`
  // throws `IndexSizeError` on NaN, and `Math.max/min` propagates NaN
  // through unchanged. Mirrors `buildLinearFillGradient`'s contract:
  // `< 2` valid stops returns null rather than building a degenerate or
  // throwing gradient.
  const validStops = strokeGradient.colorStops
    .filter((stop) => Number.isFinite(stop.offset))
    .map((stop) => ({
      offset: Math.max(0, Math.min(1, stop.offset)),
      color: stop.color,
    }))
  if (validStops.length < 2) return null
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const stop of validStops) {
    grad.addColorStop(stop.offset, stop.color)
  }
  return grad
}
