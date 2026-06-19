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
// Cost per push is O(windows-touched) — one for tumbling, `size/hop`
// for hopping, amortized O(1) for session — and render cost is
// O(visible windows), independent of arrival rate. That bounded render
// work is the backpressure answer: a firehose aggregates the same as a
// trickle.
//
// NAMING: this is the **aggregation window**. The codebase's existing
// "sliding window" (`WindowMode = "sliding" | "growing"`) is RingBuffer
// *eviction*, a different concept. Keep the terms distinct.

import { RunningStats } from "./RunningStats"

/** The Kafka Streams window taxonomy. */
export type WindowType = "tumbling" | "hopping" | "session"

/** Which statistic the aggregated series carries as its primary value. */
export type AggregateStat = "mean" | "sum" | "min" | "max" | "count"

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
}

interface SessionEntry {
  start: number
  end: number
  stats: RunningStats
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

  // Tumbling / hopping: window-start (ms) → stats.
  private windows = new Map<number, RunningStats>()
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
    this.retain = config.retain != null && config.retain > 0 ? config.retain : Infinity
  }

  /** Incorporate one event. Non-finite time/value are ignored. */
  push(time: number, value: number): void {
    if (!Number.isFinite(time) || !Number.isFinite(value)) return
    if (time > this.latest) this.latest = time

    if (this.type === "session") {
      this.pushSession(time, value)
    } else {
      this.pushFixed(time, value)
    }
    this.prune()
  }

  private pushFixed(time: number, value: number): void {
    if (this.type === "tumbling" || this.hop >= this.size) {
      const start = Math.floor(time / this.size) * this.size
      this.bump(start, value)
      return
    }
    // Hopping: event belongs to every window whose [start, start+size)
    // contains it. Window starts are multiples of `hop`, with
    //   t - size < start ≤ t   ⇒   k in (floor((t-size)/hop), floor(t/hop)]
    const hop = this.hop
    const kMax = Math.floor(time / hop)
    const kMin = Math.floor((time - this.size) / hop) + 1
    for (let k = kMin; k <= kMax; k++) {
      this.bump(k * hop, value)
    }
  }

  private bump(start: number, value: number): void {
    let stats = this.windows.get(start)
    if (!stats) {
      stats = new RunningStats()
      this.windows.set(start, stats)
    }
    stats.push(value)
  }

  private pushSession(time: number, value: number): void {
    const gap = this.gap
    // The new event's provisional bounds.
    const newStats = new RunningStats()
    newStats.push(value)
    let lo = time
    let hi = time

    // Find every existing session within `gap` of [time, time]; merge
    // them all (plus the new event) into one. Sessions are kept sorted
    // by start, so the survivors form a contiguous run.
    const survivors: SessionEntry[] = []
    const merged: SessionEntry = { start: lo, end: hi, stats: newStats }
    for (const s of this.sessions) {
      const within = s.end >= time - gap && s.start <= time + gap
      if (within) {
        merged.stats.merge(s.stats)
        if (s.start < lo) lo = s.start
        if (s.end > hi) hi = s.end
      } else {
        survivors.push(s)
      }
    }
    merged.start = lo
    merged.end = hi
    survivors.push(merged)
    survivors.sort((a, b) => a.start - b.start)
    this.sessions = survivors
  }

  private prune(): void {
    if (this.retain === Infinity) return
    if (this.type === "session") {
      if (this.sessions.length > this.retain) {
        this.sessions = this.sessions.slice(this.sessions.length - this.retain)
      }
      return
    }
    if (this.windows.size <= this.retain) return
    // Keep the `retain` windows with the largest start.
    const starts = [...this.windows.keys()].sort((a, b) => a - b)
    const drop = starts.length - this.retain
    for (let i = 0; i < drop; i++) {
      this.windows.delete(starts[i])
    }
  }

  /**
   * Snapshot the current windows as aggregated rows, sorted by start.
   * For tumbling/hopping a window is `partial` while the watermark has
   * not yet passed its end; for session windows the most recent session
   * is `partial` while within `gap` of the watermark.
   */
  emit(): AggregatedWindow[] {
    if (this.type === "session") return this.emitSessions()
    return this.emitFixed()
  }

  private emitFixed(): AggregatedWindow[] {
    const rows: AggregatedWindow[] = []
    for (const [start, stats] of this.windows) {
      const end = start + this.size
      rows.push(this.row(start, end, stats, this.latest < end))
    }
    rows.sort((a, b) => a.start - b.start)
    return rows
  }

  private emitSessions(): AggregatedWindow[] {
    return this.sessions.map(s => {
      // A session is still open if the watermark sits within `gap` of
      // its end — another close-by event could still extend it.
      const partial = this.latest - s.end < this.gap
      return this.row(s.start, s.end, s.stats, partial)
    })
  }

  private row(
    start: number,
    end: number,
    stats: RunningStats,
    partial: boolean
  ): AggregatedWindow {
    return {
      start,
      end,
      count: stats.count,
      mean: stats.mean,
      sum: stats.sum,
      min: stats.min,
      max: stats.max,
      stddev: stats.stddev,
      partial,
    }
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
    case "sum":
      return w.sum
    case "min":
      return w.min
    case "max":
      return w.max
    case "count":
      return w.count
    case "mean":
    default:
      return w.mean
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
