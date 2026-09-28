import type { Datum } from "../shared/datumTypes"
import {
  attachSelectionCoverage,
  attachSelectionProvenance,
  getSelectionProvenance
} from "../../store/selectionProvenance"
import { realtimeTimeNumber } from "./realtimeAccessors"

/**
 * Selection datum for a histogram bar: a copy that keeps the bin's source rows
 * and covers `[binStart, binEnd)` on `timeField`, so a point selection on any
 * time inside the bin matches it, including a time no row carries exactly
 * (for example one picked on a linked line chart). Selected times may be
 * numbers, Dates, or date strings.
 *
 * RealtimeHistogram and TemporalHistogram match their bars through this with
 * `timeField` set to a string `timeAccessor`, else `"time"`. Code outside the
 * chart can pass the same field and a bin (`{ binStart, binEnd, ... }`) to
 * `useSelection().predicate` to find the bins a selection matches, the way
 * the chart does. A datum without numeric `binStart`/`binEnd` passes through.
 */
export function histogramBinSelectionDatum(timeField: string): (datum: Datum) => Datum {
  return (datum) => {
    if (typeof datum.binStart !== "number" || typeof datum.binEnd !== "number") return datum
    return attachSelectionCoverage(
      attachSelectionProvenance({ ...datum }, getSelectionProvenance(datum)),
      { ranges: { [timeField]: [datum.binStart, datum.binEnd] }, toNumber: realtimeTimeNumber }
    )
  }
}
