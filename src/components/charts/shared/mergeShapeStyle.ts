import type { Datum } from "./datumTypes"
/**
 * mergeShapeStyle — overlay top-level primitive styling props on a style function.
 *
 * Phase B of the primitive-theming plan introduces three first-class props
 * on every shape-drawing chart: `stroke`, `strokeWidth`, `opacity` (joining
 * `color`, which was already there). They're resolved at the HOC layer via
 * this helper so the merge order — and precedence — lands in exactly one
 * place for every chart type.
 *
 * Precedence (highest wins):
 *   1. Top-level primitive prop (this helper's `overrides` parameter)
 *   2. User-supplied `frameProps.*Style` return value
 *   3. HOC base style (categorical color resolution, theme fallback, etc.)
 *
 * The "top-level wins over function return" rule is deliberate: explicit >
 * generic. A user writing `<BarChart stroke="red" />` expects red strokes,
 * even if they also pass `frameProps.pieceStyle = d => ({ stroke: "blue" })`
 * for per-datum customization. The top-level prop is the broad stroke, the
 * per-datum function handles the exceptions.
 *
 * When no overrides are set, returns the input function unchanged so
 * `useMemo` chains upstream preserve referential equality.
 */

export interface PrimitiveStyleOverrides {
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

type StyleFnArg = (...args: any[]) => Datum

/** Returns true when at least one override key has a non-undefined value. */
export function hasPrimitiveOverrides(overrides: PrimitiveStyleOverrides): boolean {
  return (
    overrides.stroke !== undefined ||
    overrides.strokeWidth !== undefined ||
    overrides.opacity !== undefined
  )
}

/**
 * Overlay `overrides` on the output of `styleFn`. Returns a new style
 * function that calls the underlying one (if present) and merges the
 * override fields last, so top-level props win.
 *
 * When `overrides` has no fields set, returns `styleFn` unchanged — this
 * keeps the memoization-stable identity path hot for the common case
 * where a designer has set nothing.
 */
export function mergeShapeStyle<F extends StyleFnArg>(
  styleFn: F | undefined,
  overrides: PrimitiveStyleOverrides
): F {
  if (!hasPrimitiveOverrides(overrides)) {
    // No overrides: return the input function as-is. The cast keeps TS
    // happy — returning `undefined` here would propagate the optional,
    // but callers typically want a function back for direct invocation.
    return (styleFn ?? ((() => ({})) as F)) as F
  }

  // Build the patch object once; closed-over by the returned function.
  const patch: PrimitiveStyleOverrides = {}
  if (overrides.stroke !== undefined) patch.stroke = overrides.stroke
  if (overrides.strokeWidth !== undefined) patch.strokeWidth = overrides.strokeWidth
  if (overrides.opacity !== undefined) patch.opacity = overrides.opacity

  if (!styleFn) {
    return ((..._args: Parameters<F>) => ({ ...patch })) as F
  }

  return ((...args: Parameters<F>) => {
    const base = styleFn(...args) || {}
    return { ...base, ...patch }
  }) as F
}
