/** Shared canvas primitives for fills, strokes, curves, and gradients. */
import type { CurveType, Style } from "../types"
import type { GradientConfig, GradientStop } from "../../charts/shared/gradient"
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
 * Map a `CurveType` string to a d3-shape curve factory. Returns `null`
 * for `"linear"` and `undefined` so callers can branch on a single
 * "use linear fallback" sentinel instead of a separate has-curve check.
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
 *     resolve via the canvas DOM ancestor's computed style.
 *   - `CanvasPattern` values pass through untouched.
 *   - `null` / `undefined` returns the caller-provided fallback.
 *
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
 * Resolve a fill or stroke into a value that Canvas can actually paint.
 *
 * This is the strict counterpart to the compatibility-preserving
 * `resolveCanvasFill`: an undefined custom property without a CSS fallback
 * (`var(--missing)`) is not a valid Canvas paint and therefore uses the
 * caller's fallback instead of being assigned verbatim. New direct-paint
 * renderers should prefer this helper for both `fillStyle` and `strokeStyle`.
 */
export function resolveCanvasPaint(
  ctx: CanvasRenderingContext2D,
  paint: string | HatchFill | CanvasPattern | null | undefined,
  fallback: string,
): string | CanvasPattern {
  const resolved = resolveCanvasFill(ctx, paint, fallback)
  if (
    typeof resolved === "string" &&
    resolved.trim().startsWith("var(")
  ) {
    const resolvedFallback = resolveCSSColor(ctx, fallback)
    return resolvedFallback && !resolvedFallback.trim().startsWith("var(")
      ? resolvedFallback
      : fallback
  }
  return resolved
}

/**
 * Narrow a possibly-`HatchFill` `style.fill` to the `string | CanvasPattern`
 * a canvas `fillStyle` accepts, for the direct-assign sites that don't
 * otherwise route through {@link resolveCanvasFill}. Returns `undefined` for a
 * nullish fill. For backward compatibility an unresolved `var(--missing)` is
 * preserved; new renderers that require a guaranteed-valid paint should use
 * {@link resolveCanvasPaint} with an explicit fallback.
 *
 * Delegates to {@link resolveCanvasFill} so behavior stays consistent: string
 * fills (including `var(--…)`) resolve through `resolveCSSColor` — a raw CSS
 * variable written straight to `fillStyle` would silently paint black — and a
 * `HatchFill` resolves to its `CanvasPattern` (or its resolved background).
 */
export function coerceCanvasFill(
  ctx: CanvasRenderingContext2D,
  fill: string | HatchFill | CanvasPattern | null | undefined,
): string | CanvasPattern | undefined {
  if (fill == null) return undefined
  const resolved = resolveCanvasFill(ctx, fill, "")
  return resolved === "" ? undefined : resolved
}

/**
 * Build a linear gradient from a normalized gradient config. Stops without a
 * color inherit the resolved mark color. Used for both fill gradients (bar,
 * area fill) and stroke gradients (line, area stroke) — a canvas gradient
 * object is equally valid as `fillStyle` or `strokeStyle`.
 *
 * The renderer is responsible for choosing the gradient axis (a bar
 * runs tip→base along its value axis; an area runs minTop→maxBottom
 * vertically).
 */
export function buildLinearFillGradient(
  ctx: CanvasRenderingContext2D,
  fillGradient: GradientConfig,
  baseFill: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CanvasGradient | null {
  const validStops = fillGradient.stops.filter((stop) =>
    Number.isFinite(stop.offset)
    && (stop.opacity == null || Number.isFinite(stop.opacity)),
  )
  if (validStops.length < 2) return null
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const stop of validStops) {
    grad.addColorStop(
      Math.max(0, Math.min(1, stop.offset)),
      canvasGradientStopColor(ctx, stop, baseFill),
    )
  }
  return grad
}

function canvasGradientStopColor(
  ctx: CanvasRenderingContext2D,
  stop: GradientStop,
  baseColor: string,
): string {
  const rawColor = stop.color ?? baseColor
  const color = resolveCSSColor(ctx, rawColor) || rawColor
  if (stop.opacity == null) return color
  const opacity = Math.max(0, Math.min(1, stop.opacity))
  const [r, g, b] = parseCanvasColor(ctx, color)
  return `rgba(${r},${g},${b},${opacity})`
}

/**
 * Resolve and apply a network node's fill, then invoke `paint` (the
 * renderer's own `fill()`/`fillRect()` call — the path or rect traced
 * differs per shape, so painting stays with the caller).
 */
export function paintNetworkFill(
  ctx: CanvasRenderingContext2D,
  style: Style,
  fallback: string,
  paint: () => void,
): void {
  if (!style.fill) return
  ctx.fillStyle = resolveCanvasFill(ctx, style.fill, fallback)
  if (style.fillOpacity !== undefined) {
    ctx.globalAlpha = (style.opacity ?? 1) * style.fillOpacity
  }
  paint()
}

/**
 * Resolve and apply a network node's stroke, then invoke `paint`. `"none"`
 * is truthy as a string, so this guards it explicitly — canvas otherwise
 * rejects `strokeStyle = "none"`, keeps the default black, and still strokes.
 */
export function paintNetworkStroke(
  ctx: CanvasRenderingContext2D,
  style: Style,
  paint: () => void,
): void {
  if (!style.stroke || style.stroke === "none") return
  ctx.strokeStyle = resolveCSSColor(ctx, style.stroke) || style.stroke
  ctx.lineWidth = style.strokeWidth ?? 1
  ctx.globalAlpha = (style.opacity ?? 1) * (style.strokeOpacity ?? 1)
  paint()
}
