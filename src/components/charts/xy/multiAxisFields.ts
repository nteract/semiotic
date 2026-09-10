import type { Datum } from "../shared/datumTypes"
import {
  makeRuleValueResolver,
  type StyleRuleContext
} from "../shared/styleRules"

/** Internal unitized y field shared by the MultiAxis HOC and SSR config. */
export const MULTI_AXIS_UNITIZED_FIELD = "__ma_unitized"
/** Internal series-identity field shared by the MultiAxis HOC and SSR config. */
export const MULTI_AXIS_SERIES_FIELD = "__ma_series"

/**
 * Style-rule context for dual-axis rows. Thresholds read the original series
 * y (not the unitized [0, 1] plot value) so `{ axis: "y", gt: 10 }` matches
 * the authored metric rather than the normalized display scale.
 */
export function makeMultiAxisRuleContext(
  xAccessor: string | ((d: Datum) => unknown) | undefined,
  series: ReadonlyArray<{
    yAccessor?: string | ((d: Datum) => unknown)
    label?: string
  }>
): (d: Datum, group?: string) => StyleRuleContext {
  const readX = makeRuleValueResolver(xAccessor)
  const readers = series.map((entry, index) => ({
    label: entry.label || `Series ${index + 1}`,
    readY: makeRuleValueResolver(entry.yAccessor)
  }))
  return (d, group) => {
    const seriesName = String(d[MULTI_AXIS_SERIES_FIELD] ?? group ?? "")
    const reader = readers.find((item) => item.label === seriesName) ?? readers[0]
    const y = reader?.readY(d)
    return { value: y, x: readX(d), y, category: seriesName || undefined }
  }
}
