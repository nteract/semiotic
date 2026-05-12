/**
 * Equidistant tick generation for the `axisExtent="exact"` axis mode.
 *
 * The default "nice" mode (d3 scale's `.ticks(count)` algorithm)
 * returns aesthetically-rounded tick values WITHIN the data domain —
 * the first tick may sit above the data min and the last tick may
 * sit below the data max. That's the standard reading: round labels
 * win, exact data bounds lose.
 *
 * "exact" mode reverses that tradeoff. The first tick sits exactly at
 * `dataMin`, the last tick sits exactly at `dataMax`, and the
 * intermediate ticks are equidistant within the domain. Labels are
 * whatever the value formatter produces — often not round.
 *
 * Works on `scaleLinear` and `scaleTime` (operates on millisecond
 * timestamps, returns Date objects so downstream formatters receive
 * the same shape they get from `scale.ticks()`).
 *
 * `scaleLog` is supported but the ticks come out evenly spaced in
 * VALUE space, not pixel space — `[1, 250.75, 500.5, 750.25, 1000]`
 * instead of `[1, 10, 100, 1000]`. That's intentional for the
 * "endpoints must read as the actual data bounds" use case the
 * feature was added for, but it's not "equidistant on the rendered
 * axis". Users that want log-space-equidistant ticks should pass
 * explicit `tickValues` (e.g. `[1, 10, 100, 1000]`) — those bypass
 * `axisExtent` entirely.
 */
export type AxisExtentMode = "nice" | "exact"

/** A d3-style continuous scale (linear, time, log) — the bit we use.
 *  The `domain()` return type stays as `number[]` / `Date[]` rather
 *  than a strict 2-tuple because that's what d3-scale's own types
 *  declare (the runtime contract is "first and last elements are the
 *  bounds" — d3 never returns a single-element domain in practice). */
type TickableScale<T = number | Date> = {
  domain(): T[]
  ticks(count?: number): T[]
}

/**
 * Generate `count` ticks evenly spaced across the scale's domain,
 * inclusive of both endpoints. For a domain of `[lo, hi]` and a
 * count of `n`, returns `[lo, lo + step, ..., hi]` where
 * `step = (hi - lo) / (n - 1)`.
 *
 * Edge cases:
 * - `count < 2` returns just the two endpoints.
 * - Empty/zero-width domain returns the endpoints unchanged.
 * - Date-valued domain returns Date objects (preserving the shape
 *   d3-scale-time's `.ticks()` returns).
 */
export function equidistantTicks<T extends number | Date>(scale: TickableScale<T>, count: number): T[] {
  const domain = scale.domain()
  const lo = domain[0]
  const hi = domain[domain.length - 1]
  const isDate = lo instanceof Date
  const loVal = lo instanceof Date ? lo.getTime() : (lo as number)
  const hiVal = hi instanceof Date ? hi.getTime() : (hi as number)

  if (count < 2 || loVal === hiVal) {
    return (isDate
      ? [new Date(loVal), new Date(hiVal)]
      : [loVal, hiVal]) as T[]
  }

  const step = (hiVal - loVal) / (count - 1)
  const out: T[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const val = i === count - 1 ? hiVal : loVal + i * step
    out[i] = (isDate ? new Date(val) : val) as T
  }
  return out
}

/**
 * Return either equidistant ticks (when `mode === "exact"`) or the
 * scale's own d3-generated ticks (default "nice" behavior).
 *
 * Centralized so XY and ordinal overlay code paths can both call
 * one function instead of branching at every `.ticks()` site.
 */
export function ticksForMode<T extends number | Date>(
  scale: TickableScale<T>,
  count: number,
  mode: AxisExtentMode | undefined,
): T[] {
  if (mode === "exact") return equidistantTicks(scale, count)
  return scale.ticks(count)
}
