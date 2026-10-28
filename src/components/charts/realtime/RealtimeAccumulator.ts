import type { CoercibleNumber } from "../../stream/accessorUtils"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import {
  createAccumulator,
  aggregatedRows,
  type AggregateConfig,
  type AggregatedRealtimeDatum
} from "./aggregate"
import { readRealtimeNumber, readRealtimeTime } from "./realtimeAccessors"
import type { WindowAccumulator } from "../../realtime/WindowAccumulator"

export const AGG_SERIES = "__aggSeries"

/** One independent aggregation history per authored series, shared by React and SSR. */
export class RealtimeAccumulator {
  private readonly seriesRows = new WeakMap<AggregatedRealtimeDatum, AggregatedRealtimeDatum>()
  private readonly groups = new Map<string, WindowAccumulator>()

  private retention: number
  private seed: WindowAccumulator | null

  constructor(
    private readonly config: AggregateConfig,
    private readonly seriesAccessor?: ChartAccessor<Datum, string>
  ) {
    this.retention = config.retain ?? Infinity
    this.seed = createAccumulator(config)
  }

  push<TDatum extends Datum>(
    row: Datum,
    timeAccessor?: ChartAccessor<TDatum, CoercibleNumber>,
    valueAccessor?: ChartAccessor<TDatum, number>
  ): void {
    const time = readRealtimeTime(row, timeAccessor, "time")
    const value = readRealtimeNumber(row, valueAccessor, "value")
    if (time == null || value == null) return
    const key =
      this.seriesAccessor == null
        ? ""
        : String(
            typeof this.seriesAccessor === "function"
              ? this.seriesAccessor(row)
              : row[this.seriesAccessor]
          )
    let acc: WindowAccumulator | null | undefined = this.groups.get(key)
    if (!acc) {
      if (!this.seed) return
      acc = this.groups.size === 0 ? this.seed : createAccumulator({ ...this.config, retain: this.retention })
      if (!acc) return
      this.groups.set(key, acc)
    }
    acc.push(+time, value)
  }

  emit(config: AggregateConfig): AggregatedRealtimeDatum[] {
    const rows: AggregatedRealtimeDatum[] = []
    for (const [series, acc] of this.groups) {
      for (const row of aggregatedRows(acc, config)) {
        if (this.seriesAccessor == null) rows.push(row)
        else {
          let mapped = this.seriesRows.get(row)
          if (!mapped) {
            mapped = { ...row, [AGG_SERIES]: series }
            this.seriesRows.set(row, mapped)
          }
          rows.push(mapped)
        }
      }
    }
    // Each accumulator already emits in event-time order. Keeping each
    // series contiguous avoids sorting all windows again on every push.
    return rows
  }

  setRetention(retain: number): void {
    this.retention = retain
    this.seed?.setRetention(retain)
    for (const acc of this.groups.values()) acc.setRetention(retain)
  }

  /** Move all series toward closed windows without adding fake samples. */
  advanceIdle(elapsed: number): void {
    for (const acc of this.groups.values()) acc.advanceWatermark(acc.watermark + elapsed)
  }

  advanceWatermark(time: number): void {
    for (const acc of this.groups.values()) acc.advanceWatermark(time)
  }

  clear(): void {
    this.seed?.clear()
    this.groups.clear()
  }
}
