import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import { finiteNumber, readAccessor } from "./physicsChartShared"
import { createPhysicsSourceState } from "./physicsSourceRows"

export interface EventDropAdmissionOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  timeAccessor: ChartAccessor<TDatum, number>
  arrivalAccessor: ChartAccessor<TDatum, number>
  windowSize: number
  watermark?:
    { delay?: number; value?: number } | ((latestEventTime: number) => number)
  /** Recorded admission thresholds; independent of the current closure watermark. */
  watermarkAtArrivalAccessor?: ChartAccessor<TDatum, number>
}

/**
 * Replay admissions in arrival order. Equal arrival times retain source order.
 * A delay/function watermark advances monotonically with the greatest event
 * time seen so far. An explicit value describes one fixed admission policy.
 * Recorded per-event thresholds take precedence over either policy, so later
 * watermark advances cannot relabel previously accepted events.
 */
export function resolveEventDropAdmissions<TDatum extends Datum>(
  options: EventDropAdmissionOptions<TDatum>
) {
  const { windowSize, watermark, watermarkAtArrivalAccessor } = options
  if (!(Number.isFinite(windowSize) && windowSize > 0)) {
    throw new RangeError(
      "EventDrop windows.size must be a finite positive number"
    )
  }
  const { rows } = createPhysicsSourceState(options.data, "event")
  const events = rows.flatMap((datum, index) => {
    const eventTime = finiteNumber(
      readAccessor(datum, index, options.timeAccessor)
    )
    if (eventTime == null) return []
    const arrivalTime =
      finiteNumber(readAccessor(datum, index, options.arrivalAccessor)) ??
      eventTime
    return [
      {
        datum,
        index,
        eventTime,
        arrivalTime,
        watermarkAtArrival: 0,
        late: false
      }
    ]
  })
  const fixedWatermark =
    typeof watermark === "function" ? null : finiteNumber(watermark?.value)
  const delay =
    typeof watermark === "function"
      ? windowSize
      : (finiteNumber(watermark?.delay) ?? windowSize)
  let latest = -Infinity
  let current = -Infinity
  for (const event of events
    .slice()
    .sort((a, b) => a.arrivalTime - b.arrivalTime || a.index - b.index)) {
    latest = Math.max(latest, event.eventTime)
    const proposed =
      typeof watermark === "function"
        ? finiteNumber(watermark(latest))
        : latest - delay
    current =
      fixedWatermark ?? Math.max(current, proposed ?? latest - windowSize)
    const recorded = watermarkAtArrivalAccessor
      ? finiteNumber(
          readAccessor(event.datum, event.index, watermarkAtArrivalAccessor)
        )
      : null
    event.watermarkAtArrival = recorded ?? current
    const windowEnd =
      (Math.floor(event.eventTime / windowSize) + 1) * windowSize
    event.late = windowEnd <= event.watermarkAtArrival
  }
  return {
    events,
    watermarkValue: events.length ? current : (fixedWatermark ?? -delay)
  }
}
