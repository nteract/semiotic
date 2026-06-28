/**
 * Run-length encoding for sequential/categorical series — the "collapse a
 * per-step categorical field into drawable runs" operation that condition
 * strips, status timelines, and calendar ribbons all need. A custom layout
 * draws one rect per run instead of one per step.
 *
 * Pure / SSR-safe. Several custom charts re-derived this with three slightly
 * different signatures (value-change by index, value-change by domain coord,
 * boolean-present); this is the single form that covers all three.
 */

export interface Run<V> {
  /** The constant value over the run. */
  value: V
  /** Run start on the domain axis — the array index of the first item, or the
   *  `coord` of the first item when `coord` is supplied. Inclusive. */
  start: number
  /** Run end on the domain axis. Half-open: the run covers `[start, end)`. With
   *  `coord`, this is the next item's coord (or the last coord + `step` for the
   *  final run / a run that precedes a gap). Without `coord`, the index after
   *  the run's last item. */
  end: number
  /** Number of consecutive items in the run. */
  count: number
  /** Index of the run's first item in the input array. */
  startIndex: number
  /** Index of the run's last item in the input array (inclusive). */
  endIndex: number
}

export interface RunOptions<T, V> {
  /** Map an item to its position on the domain axis (e.g. day-of-year). When
   *  omitted, the array index is used and runs are index-based. A gap in
   *  `coord` (a jump larger than `step`) closes the current run. */
  coord?: (item: T, index: number) => number
  /** Width of one item on the domain axis — closes the final run and detects
   *  gaps when `coord` is supplied. @default 1 */
  step?: number
  /** Custom equality for grouping adjacent items. @default `Object.is` */
  equals?: (a: V, b: V) => boolean
  /** Presence mode: only items with a truthy value form runs; falsy items break
   *  the current run and are excluded entirely (the boolean condition-strip
   *  variant). @default false */
  truthyOnly?: boolean
}

/**
 * Collapse a sequential series into runs of equal adjacent values.
 *
 * @example value-change runs over a domain coordinate (a condition ring/strip)
 * ```ts
 * runs(days, (d) => d.condition, { coord: (d) => d.day, step: 1 })
 * // → [{ value: "clear", start: 0, end: 5, count: 5, ... }, ...]
 * ```
 * @example boolean present/absent runs (a "freezing days" strip)
 * ```ts
 * runs(days, (d) => d.belowFreezing, { truthyOnly: true })
 * ```
 */
export function runs<T, V = unknown>(
  items: readonly T[],
  value: (item: T, index: number) => V,
  opts: RunOptions<T, V> = {},
): Run<V>[] {
  const { coord, step = 1, equals = Object.is, truthyOnly = false } = opts
  const out: Run<V>[] = []
  const at = (i: number): number => (coord ? coord(items[i], i) : i)
  const close = (run: Run<V>, lastIdx: number, nextIdx: number | null) => {
    run.endIndex = lastIdx
    run.count = lastIdx - run.startIndex + 1
    // Half-open end: the next item's coord, or last coord + step at a gap / the end.
    run.end = coord
      ? nextIdx != null && at(nextIdx) - at(lastIdx) <= step
        ? at(nextIdx)
        : at(lastIdx) + step
      : lastIdx + 1
    out.push(run)
  }

  let current: Run<V> | null = null
  for (let i = 0; i < items.length; i++) {
    const v = value(items[i], i)
    if (truthyOnly && !v) {
      if (current) {
        close(current, current.endIndex, i)
        current = null
      }
      continue
    }
    const contiguous = coord && i > 0 ? at(i) - at(i - 1) <= step : true
    if (current && contiguous && equals(current.value, v)) {
      current.endIndex = i
    } else {
      if (current) close(current, current.endIndex, i)
      current = { value: v, start: at(i), end: at(i), count: 1, startIndex: i, endIndex: i }
    }
  }
  if (current) close(current, current.endIndex, null)
  return out
}

/** Alias for {@link runs} — the textbook name for the transform. */
export const runLengthEncode = runs
