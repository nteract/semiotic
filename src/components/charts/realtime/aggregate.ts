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
} from "../../realtime/WindowAccumulator"
import { parseWindowDuration } from "../../realtime/parseWindowDuration"
import type { Datum } from "../shared/datumTypes"

/**
 * Opt-in windowed-aggregation transform for realtime XY charts. With it
 * set, pushed events are reduced into event-time windows and the chart
 * draws one mark per window (mean / sum / min / max / count) plus an
 * optional ±σ or min–max envelope — bounded render cost regardless of
 * arrival rate.
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
  /** Keep at most this many most-recent windows. @default unbounded */
  retain?: number
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

/**
 * Build a `WindowAccumulator` from a config, parsing duration strings.
 * Returns `null` when the window width is unparseable, so the caller can
 * skip aggregation rather than bucket on a zero-width window.
 */
export function createAccumulator(config: AggregateConfig): WindowAccumulator | null {
  const window = config.window ?? "tumbling"
  // For session windows, `gap` is the meaningful width; `size` is unused
  // by the accumulator but still required by its config shape.
  const sizeMs =
    window === "session"
      ? parseWindowDuration(config.gap ?? config.size)
      : parseWindowDuration(config.size)
  if (sizeMs == null) return null

  const hopMs = config.hop != null ? parseWindowDuration(config.hop) : undefined
  const gapMs = config.gap != null ? parseWindowDuration(config.gap) : undefined

  return new WindowAccumulator({
    window,
    size: sizeMs,
    hop: hopMs ?? undefined,
    gap: gapMs ?? undefined,
    retain: config.retain,
  })
}

/**
 * Snapshot the accumulator into frame-ready rows. Each row carries the
 * primary stat at `value`, the window midpoint at `time`, the band
 * bounds (when a band is configured), and provenance fields (`count`,
 * partial flag, raw start/end) for tooltips and partial-window styling.
 */
export function aggregatedRows(
  acc: WindowAccumulator,
  config: AggregateConfig
): Datum[] {
  const stat: AggregateStat = config.stat ?? "mean"
  const band: AggregateBand = config.band ?? "none"
  const sigma = config.sigma ?? 1

  return acc.emit().map(w => {
    const row: Datum = {
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
    return row
  })
}

/** Whether a config requests a band envelope. */
export function hasBand(config: AggregateConfig): boolean {
  return (config.band ?? "none") !== "none"
}

export type { AggregateStat, AggregateBand, WindowType }
