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

type StyleArgument = Datum | string | number | boolean | Date | null | undefined
type StyleFn<TArgs extends StyleArgument[]> = (...args: TArgs) => Datum

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
export function mergeShapeStyle<TArgs extends StyleArgument[] = []>(
  styleFn: StyleFn<TArgs> | undefined,
  overrides: PrimitiveStyleOverrides
): StyleFn<TArgs> {
  if (!hasPrimitiveOverrides(overrides)) {
    return styleFn ?? ((..._args: TArgs) => ({}))
  }

  // Build the patch object once; closed-over by the returned function.
  const patch: PrimitiveStyleOverrides = {}
  if (overrides.stroke !== undefined) patch.stroke = overrides.stroke
  if (overrides.strokeWidth !== undefined) patch.strokeWidth = overrides.strokeWidth
  if (overrides.opacity !== undefined) patch.opacity = overrides.opacity

  if (!styleFn) {
    return (..._args: TArgs) => ({ ...patch })
  }

  return (...args: TArgs) => {
    const base = styleFn(...args) || {}
    return { ...base, ...patch }
  }
}
