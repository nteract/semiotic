import type { Datum } from "../shared/datumTypes"
import {
  DEFAULT_COLORS,
  resolveCategoricalPalette,
} from "../shared/colorUtils"
import {
  makeRuleValueResolver,
  type StyleRuleContext
} from "../shared/styleRules"

/** Internal unitized y field shared by the MultiAxis HOC and SSR config. */
export const MULTI_AXIS_UNITIZED_FIELD = "__ma_unitized"
/** Internal series-identity field shared by the MultiAxis HOC and SSR config. */
export const MULTI_AXIS_SERIES_FIELD = "__ma_series"

/**
 * Resolve one color per series. Per-series `color` wins, then a
 * `{ label: color }` map, then a named/array palette, then the theme.
 */
export function resolveMultiAxisSeriesColors(
  series: ReadonlyArray<{ label?: string; color?: string }>,
  colorScheme: string | string[] | Record<string, string> | undefined,
  themeCategorical: readonly string[] | undefined,
): string[] {
  const palette = resolveCategoricalPalette(colorScheme, themeCategorical, DEFAULT_COLORS)
  const mapped = colorScheme && typeof colorScheme === "object" && !Array.isArray(colorScheme)
    ? colorScheme
    : null
  return series.map((entry, index) => {
    if (typeof entry.color === "string" && entry.color.length > 0) return entry.color
    const label = entry.label || `Series ${index + 1}`
    const fromMap = mapped?.[label]
    if (typeof fromMap === "string" && fromMap.length > 0) return fromMap
    return palette[index % palette.length]
  })
}

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
