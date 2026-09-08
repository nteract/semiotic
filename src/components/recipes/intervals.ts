import type { Datum } from "../charts/shared/datumTypes"
import { FirstAvailableTrack } from "./firstAvailableTrack"

/**
 * Interval (Gantt/timeline) packing + temporal-density helpers — the generic
 * geometry behind any "events that overlap in time" view. A swimlane/Gantt
 * layout packs concurrent intervals into sub-tracks; its natural companion is a
 * concurrency line counting how many intervals are active over the domain.
 *
 * Pure / SSR-safe. Accessors may be a field name or a function.
 */

type Accessor<T> = string | ((item: T) => number)

/** Resolve a field-name-or-function accessor to a numeric getter. */
function numAccessor<T>(a: Accessor<T> | undefined, fallback: string): (item: T) => number {
  if (typeof a === "function") return a
  const key = (a ?? fallback) as string
  return (item: T) => Number((item as Record<string, unknown>)[key])
}

export interface PackedInterval<T> {
  /** The original item. */
  item: T
  /** Zero-based sub-track index the greedy packer assigned. Concurrent
   *  intervals get distinct tracks; non-overlapping intervals reuse a track. */
  track: number
}

export interface PackIntervalsResult<T> {
  /** Each input item paired with its assigned sub-track. Input order preserved
   *  unless `sort` is left on (the default), which sorts by start ascending. */
  packed: PackedInterval<T>[]
  /** Number of sub-tracks used — the lane needs this many rows. */
  trackCount: number
}

export interface PackIntervalsOptions<T> {
  /** Interval start accessor. @default `"start"` */
  start?: Accessor<T>
  /** Interval end accessor. @default `"end"` */
  end?: Accessor<T>
  /** Sort by start ascending (then longest-first) before packing — the stable,
   *  gap-minimizing order. Set `false` if the input is already ordered and you
   *  want that order preserved. @default true */
  sort?: boolean
}

/**
 * Greedy interval packing: assign each interval to the first sub-track whose
 * last interval has already ended, otherwise open a new track. The textbook
 * Gantt/swimlane packer. O(n log tracks) after sorting.
 *
 * @example
 * ```ts
 * const { packed, trackCount } = packIntervals(wars, { start: "startTime", end: "endTime" })
 * // bar y = laneTop + track * (barHeight + gap)
 * ```
 */
export function packIntervals<T = Datum>(
  items: readonly T[],
  options: PackIntervalsOptions<T> = {},
): PackIntervalsResult<T> {
  const getStart = numAccessor(options.start, "start")
  const getEnd = numAccessor(options.end, "end")

  const order =
    options.sort === false
      ? items.slice()
      : items.slice().sort((a, b) => getStart(a) - getStart(b) || getEnd(b) - getEnd(a))

  const tracks = new FirstAvailableTrack()
  const packed: PackedInterval<T>[] = order.map((item) => {
    const track = tracks.assign(getStart(item), getEnd(item))
    return { item, track }
  })

  return { packed, trackCount: Math.max(1, tracks.count) }
}

export interface ActiveCount {
  /** Domain position (e.g. a year). */
  value: number
  /** Number of intervals active at this position. */
  count: number
}

export interface ActiveCountOptions<T> {
  /** Interval start accessor. @default `"start"` */
  start?: Accessor<T>
  /** Interval end accessor. @default `"end"` */
  end?: Accessor<T>
  /** `[min, max]` domain to sample across (inclusive of both ends). */
  domain: [number, number]
  /** Sample spacing. @default 1 */
  step?: number
  /** Count an interval active at position `v` when `start <= v <= end`
   *  (`"closed"`, the default — natural for whole-unit intervals like years),
   *  or when `start <= v < end` (`"half-open"`). @default "closed" */
  bounds?: "closed" | "half-open"
}

/**
 * Count how many intervals are active at each sampled position across a domain —
 * the concurrency series you draw as a step line beneath packed interval lanes.
 *
 * @example
 * ```ts
 * const counts = activeCountOverDomain(wars, {
 *   start: "startYear", end: "endYear", domain: [1775, 2015],
 * })
 * // → [{ value: 1775, count: 1 }, { value: 1776, count: 2 }, ...]
 * ```
 */
export function activeCountOverDomain<T = Datum>(
  items: readonly T[],
  options: ActiveCountOptions<T>,
): ActiveCount[] {
  const getStart = numAccessor(options.start, "start")
  const getEnd = numAccessor(options.end, "end")
  const [min, max] = options.domain
  const step = options.step ?? 1
  const halfOpen = options.bounds === "half-open"
  if (!(min <= max)) return []

  // A sweep avoids revisiting every interval at every sample. For short
  // domains, direct counting is cheaper than sorting the endpoints.
  const sweep = (max - min) / step > Math.log2(items.length + 1)
  const starts: number[] = []
  const ends: number[] = []
  if (sweep) {
    for (const item of items) {
      const s = getStart(item)
      const e = getEnd(item)
      // Reversed and NaN intervals never contribute to the direct count.
      if (!(s <= e)) continue
      starts.push(s)
      ends.push(e)
    }
    starts.sort((a, b) => a - b)
    ends.sort((a, b) => a - b)
  }

  let started = 0
  let ended = 0
  const out: ActiveCount[] = []
  for (let v = min; v <= max; v += step) {
    let count = 0
    if (sweep) {
      while (started < starts.length && starts[started] <= v) started++
      while (ended < ends.length && (halfOpen ? ends[ended] <= v : ends[ended] < v)) ended++
      count = started - ended
    } else {
      for (const item of items) {
        const s = getStart(item)
        const e = getEnd(item)
        if (s <= v && (halfOpen ? v < e : v <= e)) count++
      }
    }
    out.push({ value: v, count })
  }
  return out
}
