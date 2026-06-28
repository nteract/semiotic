/**
 * Cyclical (wrap-around) interval math for any periodic axis — day-of-year,
 * hour-of-day, compass bearing, phase. A radial/circular brush, a clock chart,
 * or a seasonal ribbon re-derives this; it lives here once.
 *
 * Pure / SSR-safe. All functions are domain-agnostic: pass the period of the
 * cycle (365 for day-of-year, 24 for hour-of-day, 360 for degrees, `2π` for
 * radians).
 */

/**
 * Wrap a value into the half-open cycle `[min, min + period)`. Handles negatives
 * and multiple wraps. `wrapValue(370, 365) → 5`, `wrapValue(-1, 365) → 364`.
 */
export function wrapValue(value: number, period: number, min = 0): number {
  if (period <= 0) return value
  return (((value - min) % period) + period) % period + min
}

/**
 * The signed shortest step from `from` to `to` around the cycle. Result is in
 * `(-period/2, period/2]`: positive goes forward (increasing), negative
 * backward, taking whichever way around is shorter. The delta a drag handler
 * applies so dragging a circular range never "unwinds" the long way round.
 */
export function shortestArcDelta(from: number, to: number, period: number): number {
  if (period <= 0) return to - from
  let raw = (to - from) % period
  if (raw > period / 2) raw -= period
  else if (raw < -period / 2) raw += period
  return raw
}

/**
 * Whether `value` falls within the inclusive cyclic range `[start, end]`. When
 * `start <= end` it's a normal interval; when `start > end` the range wraps past
 * the period boundary (e.g. a Dec→Feb winter window), so membership is
 * `value >= start || value <= end`. Values are compared as given — wrap them
 * with {@link wrapValue} first if they may be out of range.
 */
export function cyclicRangeContains(value: number, start: number, end: number): boolean {
  return start <= end ? value >= start && value <= end : value >= start || value <= end
}

/**
 * Filter items whose accessor value falls in the cyclic range `[start, end]`
 * (inclusive), handling the wrap-around case. The generic replacement for the
 * hand-rolled "if start<=end filter once, else union two filters" pattern.
 *
 * When the range wraps, items are returned in two contiguous arcs (the
 * `[start, period)` arc first, then the `[min, end]` arc) so a downstream
 * consumer reading them in order walks the selection the way the eye does.
 */
export function selectCyclicRange<T>(
  items: readonly T[],
  accessor: (item: T) => number,
  start: number,
  end: number,
): T[] {
  if (start <= end) return items.filter((item) => cyclicRangeContains(accessor(item), start, end))
  return [
    ...items.filter((item) => accessor(item) >= start),
    ...items.filter((item) => accessor(item) <= end),
  ]
}
