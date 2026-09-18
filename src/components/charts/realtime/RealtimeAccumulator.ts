import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import {
  createAccumulator,
  aggregatedRows,
  type AggregateConfig,
  type AggregatedRealtimeDatum
} from "./aggregate"
import { readRealtimeNumber } from "./realtimeAccessors"
import type { WindowAccumulator } from "../../realtime/WindowAccumulator"

export const AGG_SERIES = "__aggSeries"

/** One independent aggregation history per authored series, shared by React and SSR. */
export class RealtimeAccumulator {
  private readonly groups = new Map<string, WindowAccumulator>()

  constructor(
    private readonly config: AggregateConfig,
    private readonly seriesAccessor?: ChartAccessor<Datum, string>
  ) {}

  push(
    row: Datum,
    timeAccessor?: ChartAccessor<Datum, number>,
    valueAccessor?: ChartAccessor<Datum, number>
  ): void {
    const time = readRealtimeNumber(row, timeAccessor, "time")
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
      acc = createAccumulator(this.config)
      if (!acc) return
      this.groups.set(key, acc)
    }
    acc.push(time, value)
  }

  emit(config: AggregateConfig): AggregatedRealtimeDatum[] {
    const rows: AggregatedRealtimeDatum[] = []
    for (const [series, acc] of this.groups) {
      for (const row of aggregatedRows(acc, config)) {
        rows.push(
          this.seriesAccessor == null ? row : { ...row, [AGG_SERIES]: series }
        )
      }
    }
    // Each accumulator already emits in event-time order. Keeping each
    // series contiguous avoids sorting all windows again on every push.
    return rows
  }

  clear(): void {
    this.groups.clear()
  }
}
