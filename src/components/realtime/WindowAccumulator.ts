// Windowed aggregation over event-time — the streaming-aggregation spine.
//
// Generalizes `BinAccumulator` (fixed tumbling sum-only bins) into the
// Kafka Streams window taxonomy — **tumbling**, **hopping/sliding**,
// **session** — holding a full `RunningStats` per window rather than a
// bare sum. One configuration can therefore render mean / sum / min /
// max / count plus a ±σ or min–max envelope, all from the same pass.
//
// Buckets by **event-time** (the datum's time field), never arrival
// order: pushing the same events in any order yields the same windows.
// An event touches one tumbling window, up to ceil(size/hop) hopping
// windows, or one session unless it bridges sessions. Fixed retention
// adds O(log retained-windows) work on creation/eviction. Ordered session
// lookup is O(1); late lookup is O(log sessions), plus adjacent merges.
// Rendering consumes window summaries instead of individual events.
//
// NAMING: this is the **aggregation window**. The codebase's existing
// "sliding window" (`WindowMode = "sliding" | "growing"`) is RingBuffer
// *eviction*, a different concept. Keep the terms distinct.

import { RunningStats } from "./RunningStats"
import { HyperLogLog } from "./HyperLogLog"
import { percentileKey, TDigest } from "./TDigest"
import { heapPop, heapPush } from "./minHeap"

const compareStarts = (a: number, b: number) => a - b

/** The Kafka Streams window taxonomy. */
export type WindowType = "tumbling" | "hopping" | "session"

/** Which statistic the aggregated series carries as its primary value. */
export type AggregateStat =
  "mean" | "sum" | "min" | "max" | "count" | "p50" | "p95" | "p99" | "distinct"

/** Envelope drawn around the aggregated series. */
export type AggregateBand = "stddev" | "minmax" | "none"

export interface WindowAccumulatorConfig {
  /** Window kind. Defaults to `"tumbling"`. */
  window?: WindowType
  /**
   * Window width in **milliseconds** (already parsed from any duration
   * string by the caller). For session windows this is unused; pass
   * `gap` instead.
   */
  size: number
  /**
   * Advance between consecutive hopping windows, in ms. Only meaningful
   * for `window: "hopping"`; must satisfy `0 < hop ≤ size`. Defaults to
   * `size`, which makes hopping degenerate to tumbling.
   */
  hop?: number
  /**
   * Inactivity gap in ms that closes a session. Only meaningful for
   * `window: "session"`. Two events within `gap` of each other (in
   * event-time) share a session; an event bridging two sessions merges
   * them.
   */
  gap?: number
  /**
   * Keep at most this many most-recent windows; older windows are
   * pruned on push. Bounds memory for an unbounded stream. Defaults to
   * unbounded (`Infinity`).
   */
  retain?: number
  /**
   * Quantiles to emit per window (e.g. `[0.5, 0.95, 0.99]`). Opt-in so
   * the default path keeps a cheap `RunningStats` only.
   */
  percentiles?: ReadonlyArray<number>
  /** Track an approximate distinct count (HyperLogLog) per window. */
  distinct?: boolean
}

/** A closed or still-filling aggregation window. */
export interface AggregatedWindow {
  /** Inclusive window start (event-time ms). */
  start: number
  /** Exclusive window end (event-time ms). */
  end: number
  /** Number of events in the window. */
  count: number
  mean: number
  sum: number
  min: number
  max: number
  /** Population standard deviation. */
  stddev: number
  /**
   * `true` while the window may still receive events — the trailing,
   * still-filling window(s) up to the latest watermark. Render these
   * distinctly (the partial-bin convention) so a viewer doesn't read a
   * half-filled aggregate as final.
   */
  partial: boolean
  /** Present when `percentiles` was configured. Keys like `p50`, `p95`. */
  percentiles?: Readonly<Record<string, number>>
  /** Present when `distinct` was configured. */
  distinct?: number
}

class WindowBucket {
  readonly stats = new RunningStats()
  readonly digest: TDigest | null
  readonly hll: HyperLogLog | null

  constructor(wantPercentiles: boolean, wantDistinct: boolean) {
    this.digest = wantPercentiles ? new TDigest() : null
    this.hll = wantDistinct ? new HyperLogLog() : null
  }

  push(value: number, distinctKey?: string | number): void {
    this.stats.push(value)
    this.digest?.push(value)
    if (this.hll) {
      this.hll.add(distinctKey ?? value)
    }
  }

  merge(other: WindowBucket): void {
    this.stats.merge(other.stats)
    // Only buckets from the same accumulator merge, so sketch options match.
    this.digest?.merge(other.digest!)
    this.hll?.merge(other.hll!)
  }
}

interface SessionEntry {
  start: number
  end: number
  bucket: WindowBucket
}

/**
 * Accumulates event-time windowed statistics. Stateful and mutable —
 * one instance per streaming series. Pure with respect to event order.
 */
export class WindowAccumulator {
  private readonly type: WindowType
  private readonly size: number
  private readonly hop: number
  private readonly gap: number
  private readonly retain: number
  private readonly percentiles: ReadonlyArray<number>
  private readonly wantDistinct: boolean

  // Tumbling / hopping: window-start (ms) → bucket.
  private windows = new Map<number, WindowBucket>()
  private starts: number[] = []
  // Session: sorted-by-start list of live sessions.
  private sessions: SessionEntry[] = []

  // Watermark — the largest event-time seen. Drives the partial flag.
  private latest: number = -Infinity

  constructor(config: WindowAccumulatorConfig) {
    this.type = config.window ?? "tumbling"
    this.size = config.size
    // hop defaults to size (tumbling); clamp to (0, size].
    const hop = config.hop ?? config.size
    this.hop = hop > 0 && hop <= config.size ? hop : config.size
    this.gap = config.gap ?? config.size
    this.retain =
      config.retain != null && config.retain > 0 ? config.retain : Infinity
    this.percentiles = config.percentiles ?? []
    this.wantDistinct = config.distinct === true
  }

  private newBucket(): WindowBucket {
    return new WindowBucket(this.percentiles.length > 0, this.wantDistinct)
  }

  /**
   * Incorporate one event. Non-finite time/value are ignored.
   * `distinctKey` is hashed into the optional HyperLogLog so a latency
   * series can still count distinct customers.
   */
  push(time: number, value: number, distinctKey?: string | number): void {
    if (!Number.isFinite(time) || !Number.isFinite(value)) return
    if (time > this.latest) this.latest = time

    if (this.type === "session") {
      this.pushSession(time, value, distinctKey)
    } else {
      this.pushFixed(time, value, distinctKey)
    }
    this.prune()
  }

  private pushFixed(
    time: number,
    value: number,
    distinctKey?: string | number
  ): void {
    if (this.type === "tumbling" || this.hop >= this.size) {
      const start = Math.floor(time / this.size) * this.size
      this.bump(start, value, distinctKey)
      return
    }
    // Hopping: event belongs to every window whose [start, start+size)
    // contains it. Window starts are multiples of `hop`, with
    //   t - size < start ≤ t   ⇒   k in (floor((t-size)/hop), floor(t/hop)]
    const hop = this.hop
    const kMax = Math.floor(time / hop)
    const kMin = Math.floor((time - this.size) / hop) + 1
    for (let k = kMin; k <= kMax; k++) {
      this.bump(k * hop, value, distinctKey)
    }
  }

  private bump(
    start: number,
    value: number,
    distinctKey?: string | number
  ): void {
    let bucket = this.windows.get(start)
    if (!bucket) {
      // A backdated window older than the retained frontier would be
      // immediately evicted. Avoid allocating its sketches at all.
      if (this.windows.size >= this.retain && start < this.starts[0]) return
      bucket = this.newBucket()
      this.windows.set(start, bucket)
      if (this.retain !== Infinity) heapPush(this.starts, start, compareStarts)
    }
    bucket.push(value, distinctKey)
  }

  private pushSession(
    time: number,
    value: number,
    distinctKey?: string | number
  ): void {
    const earliest = time - this.gap
    const latest = time + this.gap
    let lo = 0
    let hi = this.sessions.length
    // Ordered arrivals can only extend the newest session or append one.
    // Use the same mutation path for ordered and late input after locating it.
    const tail = this.sessions[hi - 1]
    if (!tail || time >= tail.end) {
      lo = hi
      if (tail && tail.end >= earliest && tail.start <= latest) lo--
    } else {
      // Disjoint sessions are ordered by both start and end. Find the first
      // possible match in O(log sessions), then merge only its adjacent run.
      while (lo < hi) {
        const mid = (lo + hi) >>> 1
        if (this.sessions[mid].end < earliest) lo = mid + 1
        else hi = mid
      }
    }
    const first = this.sessions[lo]
    if (!first || first.start > latest) {
      const incoming = this.newBucket()
      incoming.push(value, distinctKey)
      this.sessions.splice(lo, 0, { start: time, end: time, bucket: incoming })
      return
    }
    first.bucket.push(value, distinctKey)
    first.start = Math.min(first.start, time)
    first.end = Math.max(first.end, time)
    let next = lo + 1
    while (
      next < this.sessions.length &&
      this.sessions[next].start <= latest
    ) {
      const session = this.sessions[next++]
      first.bucket.merge(session.bucket)
      first.end = Math.max(first.end, session.end)
    }
    if (next > lo + 1) this.sessions.splice(lo + 1, next - lo - 1)
  }

  private prune(): void {
    if (this.retain === Infinity) return
    if (this.type === "session") {
      if (this.sessions.length > this.retain) {
        this.sessions.splice(0, this.sessions.length - this.retain)
      }
      return
    }
    while (this.windows.size > this.retain) {
      this.windows.delete(heapPop(this.starts, compareStarts)!)
    }
  }

  /**
   * Snapshot the current windows as aggregated rows, sorted by start.
   * For tumbling/hopping a window is `partial` while the watermark has
   * not yet passed its end; for session windows the most recent session
   * is `partial` while within `gap` of the watermark.
   */
  emit(): AggregatedWindow[] {
    if (this.type === "session") {
      return this.sessions.map((s) => {
        // A session is still open if the watermark sits within `gap` of
        // its end — another close-by event could still extend it.
        const partial = this.latest - s.end < this.gap
        return this.row(s.start, s.end, s.bucket, partial)
      })
    }
    const rows: AggregatedWindow[] = []
    for (const [start, bucket] of this.windows) {
      const end = start + this.size
      rows.push(this.row(start, end, bucket, this.latest < end))
    }
    rows.sort((a, b) => a.start - b.start)
    return rows
  }

  private row(
    start: number,
    end: number,
    bucket: WindowBucket,
    partial: boolean
  ): AggregatedWindow {
    const stats = bucket.stats
    const row: AggregatedWindow = {
      start,
      end,
      count: stats.count,
      mean: stats.mean,
      sum: stats.sum,
      min: stats.min,
      max: stats.max,
      stddev: stats.stddev,
      partial
    }
    if (bucket.digest) {
      const percentiles: Record<string, number> = {}
      for (const q of this.percentiles) {
        percentiles[percentileKey(q)] = bucket.digest.quantile(q)
      }
      row.percentiles = percentiles
    }
    if (bucket.hll) row.distinct = bucket.hll.count()
    return row
  }

  /** Number of live windows (or sessions). */
  get windowCount(): number {
    return this.type === "session" ? this.sessions.length : this.windows.size
  }

  /** The watermark — largest event-time seen, or `-Infinity` if empty. */
  get watermark(): number {
    return this.latest
  }

  clear(): void {
    this.windows.clear()
    this.starts = []
    this.sessions = []
    this.latest = -Infinity
  }
}

/**
 * Pull the primary value for a stat off an aggregated window. `count`
 * reads the event count; the rest read the matching `RunningStats`
 * field.
 */
export function statValue(w: AggregatedWindow, stat: AggregateStat): number {
  switch (stat) {
    case "distinct":
      return w.distinct ?? 0
    case "p50":
    case "p95":
    case "p99":
      return w.percentiles?.[stat] ?? Number.NaN
    default:
      return w[stat] ?? w.mean
  }
}

/**
 * Compute the [lower, upper] band bounds for an aggregated window.
 * `stddev` draws `value ± k·σ` around the chosen stat; `minmax` draws
 * the observed range. Returns `null` for `none`.
 */
export function bandBounds(
  w: AggregatedWindow,
  band: AggregateBand,
  stat: AggregateStat,
  sigma = 1
): [number, number] | null {
  if (band === "none") return null
  if (band === "minmax") return [w.min, w.max]
  // stddev band centered on the primary value.
  const center = statValue(w, stat)
  const half = w.stddev * sigma
  return [center - half, center + half]
}
