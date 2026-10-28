// HOC-layer glue for windowed aggregation on realtime XY charts.
//
// Turns an `aggregate={…}` prop into a live `WindowAccumulator` plus a
// transform that emits frame-ready rows. The realtime chart intercepts
// its push API, feeds raw events to the accumulator, and renders the
// emitted rows as a controlled `data` array — so render cost is
// O(visible windows), not O(events). See WindowAccumulator for the
// data-structure rationale and the "aggregation window" vs RingBuffer
// "sliding window" naming caveat.

import {
  WindowAccumulator,
  statValue,
  bandBounds,
  type WindowType,
  type AggregateStat,
  type AggregateBand,
  type AggregatedWindow,
} from "../../realtime/WindowAccumulator"
import { parseWindowDuration } from "../../realtime/parseWindowDuration"
import type { Datum } from "../shared/datumTypes"

/**
 * Opt-in windowed-aggregation transform for realtime XY charts. With it
 * set, pushed events are reduced into event-time windows and the chart
 * draws one mark per window (mean / sum / min / max / count) plus an
 * optional ±σ or min–max envelope — bounded render cost regardless of
 * arrival rate. Structural window changes start a new accumulator epoch:
 * controlled `data` is replayed, while push-only history resets because the
 * transform does not retain every raw event. `stat`, `band`,
 * and `sigma` update existing windows in place when the required sketches are
 * already enabled. Selecting a percentile or distinct stat enables its sketch
 * automatically; enabling a new sketch starts a new epoch.
 */
export interface AggregateConfig {
  /** Window kind. @default "tumbling" */
  window?: WindowType
  /** Window width — ms or a duration string (`"1m"`, `"10s"`, `"500ms"`). */
  size: number | string
  /** Hop between hopping windows — ms or duration string. @default = size */
  hop?: number | string
  /** Session inactivity gap — ms or duration string (session windows only). */
  gap?: number | string
  /** Statistic rendered as the primary series. @default "mean" */
  stat?: AggregateStat
  /** Envelope drawn around the series. @default "none" */
  band?: AggregateBand
  /** Multiplier for the `stddev` band (drawn as value ± sigma·σ). @default 1 */
  sigma?: number
  /** Keep at most this many recent windows per series. Push charts default to windowSize (200); bounded data defaults to unbounded. Use Infinity to opt out. */
  retain?: number
  /**
   * Quantiles to emit per window (e.g. `[0.5, 0.95, 0.99]`). Percentile stats
   * automatically enable p50/p95/p99. Structural:
   * changing this rebuilds the accumulator (same as `window` / `size`).
   */
  percentiles?: ReadonlyArray<number>
  /**
   * Track an approximate distinct count per window (automatic for stat="distinct"). Structural: changing
   * this rebuilds the accumulator.
   */
  distinct?: boolean
  /** Advance partial windows with elapsed wall time during idle periods. Default false. */
  idleAdvance?: boolean
}

// Field names on the emitted frame rows. Underscored synthetic keys are
// filtered out of the default tooltip; `time`/`value` are the visible
// ones the user's formatters and accessors read.
export const AGG_TIME = "time"
export const AGG_VALUE = "value"
export const AGG_LOWER = "__aggLower"
export const AGG_UPPER = "__aggUpper"
export const AGG_PARTIAL = "__aggPartial"
export const AGG_COUNT = "count"
export const AGG_START = "__aggStart"
export const AGG_END = "__aggEnd"

/** Materialized row returned by RealtimeLineChart in aggregate mode. */
export interface AggregatedRealtimeDatum extends Datum {
  time: number
  value: number
  count: number
  __aggPartial: boolean
  __aggStart: number
  __aggEnd: number
  __aggLower?: number
  __aggUpper?: number
}

/**
 * Build a `WindowAccumulator` from a config, parsing duration strings.
 * Returns `null` with a development warning for unparseable durations. Numeric
 * configuration violations (including excessive hopping fanout) throw RangeError.
 */
export function createAccumulator(config: AggregateConfig): WindowAccumulator | null {
  const window = config.window ?? "tumbling"
  // For session windows, `gap` is the meaningful width; `size` is unused
  // by the accumulator but still required by its config shape.
  const sizeMs =
    window === "session"
      ? parseWindowDuration(config.gap ?? config.size)
      : parseWindowDuration(config.size)
  const hopMs = config.hop != null ? parseWindowDuration(config.hop) : undefined
  const gapMs = config.gap != null ? parseWindowDuration(config.gap) : undefined
  if (sizeMs == null || hopMs === null || gapMs === null) {
    if (process.env.NODE_ENV !== "production") console.warn("[Semiotic] Invalid aggregate duration; use positive milliseconds or strings such as '1m 30s'.")
    return null
  }
  const percentileStat = config.stat?.startsWith("p") === true || !!config.percentiles?.length

  return new WindowAccumulator({
    window,
    size: sizeMs,
    hop: hopMs ?? undefined,
    gap: gapMs ?? undefined,
    retain: config.retain,
    percentiles: percentileStat ? [...new Set([...(config.percentiles ?? []), 0.5, 0.95, 0.99])] : config.percentiles,
    distinct: config.distinct || config.stat === "distinct",
  })
}

/**
 * Snapshot the accumulator into frame-ready rows. Each row carries the
 * primary stat at `value`, the window midpoint at `time`, the band
 * bounds (when a band is configured), and provenance fields (`count`,
 * partial flag, raw start/end) for tooltips and partial-window styling.
 */
const rowCache = new WeakMap<AggregatedWindow, { key: string; row: AggregatedRealtimeDatum }>()

export function aggregatedRows(
  acc: WindowAccumulator,
  config: AggregateConfig
): AggregatedRealtimeDatum[] {
  const stat: AggregateStat = config.stat ?? "mean"
  const band: AggregateBand = config.band ?? "none"
  const sigma = config.sigma ?? 1

  const key = `${stat}|${band}|${sigma}`
  return acc.emit().map((w) => {
    const cached = rowCache.get(w)
    if (cached?.key === key) return cached.row
    const row: AggregatedRealtimeDatum = {
      [AGG_TIME]: (w.start + w.end) / 2,
      [AGG_VALUE]: statValue(w, stat),
      [AGG_COUNT]: w.count,
      [AGG_PARTIAL]: w.partial,
      [AGG_START]: w.start,
      [AGG_END]: w.end,
    }
    const bounds = bandBounds(w, band, stat, sigma)
    if (bounds) {
      row[AGG_LOWER] = bounds[0]
      row[AGG_UPPER] = bounds[1]
    }
    rowCache.set(w, { key, row })
    return row
  })
}

/** Whether a config requests a band envelope. */
export function hasBand(config: AggregateConfig): boolean {
  return (config.band ?? "none") !== "none"
}

export type { AggregateStat, AggregateBand, WindowType }
