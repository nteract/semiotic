import type { ChartCapability, ChartDataProfile } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"

// Field names that signal the category axis is really a time bin. Matched at
// token boundaries (not substrings) so ordinary words that merely contain a
// temporal token — "candidate" (date), "holiday"/"payday" (day), "runtime"
// (time), "yearly"/"monthly" (year/month + suffix) — don't false-positive.
const TEMPORAL_NAME = /(^|[^a-z])(date|time|timestamp|month|week|day|year|quarter|qtr|hour|minute)(?=[^a-z]|$)/i
// Month / weekday names (full + common abbreviations).
const MONTH_OR_WEEKDAY = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
// Period-style bin labels: ISO date / year-month, "2026", "Q3", "Week 12".
const PERIOD_LABEL = /^(\d{4}(-\d{1,2}(-\d{1,2})?)?|q[1-4]|week\s*\d+|wk\s*\d+|\d{1,2}:\d{2})$/i

/**
 * Heuristic: does BarChart's category axis actually hold ordered time bins?
 * The data profiler classes string labels like "Jan" or "2026-01" as plain
 * categories (date *typing* only happens for real Date/parsable values, which
 * would be picked as an x-axis and reject BarChart outright). So a bar chart
 * over string time bins — the temporal-histogram case — is invisible to the
 * profiler. Detect it from the field name or the shape of the labels so we can
 * surface an honest caveat. Conservative on values (needs a majority match) to
 * avoid false positives on ordinary categories.
 */
function looksTemporalCategory(profile: ChartDataProfile): boolean {
  const field = profile.primary.category
  if (!field) return false
  // Split camelCase ("saleMonth" → "sale Month") so the boundary regex sees the
  // temporal token as its own word.
  const tokenizedField = field.replace(/([a-z])([A-Z])/g, "$1 $2")
  if (TEMPORAL_NAME.test(tokenizedField)) return true

  const rows = profile.data
  if (!rows || rows.length === 0) return false
  let matches = 0
  let seen = 0
  for (const row of rows) {
    const raw = (row as Record<string, unknown>)[field]
    if (raw == null) continue
    seen++
    const label = String(raw).trim()
    if (MONTH_OR_WEEKDAY.test(label) || PERIOD_LABEL.test(label)) matches++
  }
  return seen > 0 && matches / seen >= 0.6
}

export const BarChartCapability: ChartCapability = {
  component: "BarChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 5, accuracy: 5, precision: 4 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.y) return "needs a numeric value field"
    if ((profile.categoryCount ?? 0) < 1) return "needs at least 1 category"
    if ((profile.categoryCount ?? 0) > 50) return "too many categories — consider aggregating or use a different chart"
    return null
  },

  intentScores: {
    // BarChart compares pre-aggregated category totals. When each category has
    // many raw observations, a BoxPlot / ViolinPlot / SwarmPlot is more honest —
    // BarChart's implicit aggregation hides the within-category distribution.
    "compare-categories": (p) => {
      if (!p.categoryCount) return 0
      // A second crossed categorical (service × weekday, region × product)
      // means flat bars silently aggregate one dimension away — the honest
      // answers are GroupedBar/StackedBar/Heatmap, which show the matrix.
      if (p.candidates.category.length >= 2) return 3
      const obsPerCategory = p.rowCount / p.categoryCount
      // Raw-observation data (many rows per category, continuous y) makes a
      // bar per row overdraw into noise — a distribution-chart shape, not a
      // bar-chart shape. Score it as a poor fit, not a near-miss.
      if (obsPerCategory >= 10) return 2
      return 5
    },
    "rank": 5,
    "part-to-whole": (p) => ((p.categoryCount ?? 0) <= 8 ? 3 : 2),
    "distribution": 1,
  },

  caveats: (profile) => {
    const out: string[] = []
    if (looksTemporalCategory(profile)) {
      out.push(
        "category axis looks like time bins — for a time series, supply real dates and use LineChart/AreaChart (reads trend, scales the time axis); for streaming counts use a temporal histogram"
      )
    }
    return out
  },

  variants: [
    {
      key: "sorted-desc",
      label: "Ranked",
      props: { sort: "desc" },
      tags: ["sorted", "ranked"],
      intentDeltas: { "rank": +0, "compare-categories": +0 },
    },
    {
      key: "source-order",
      label: "Source order",
      props: { sort: false },
      tags: ["source-order"],
      intentDeltas: { "rank": -2 },
    },
    {
      key: "horizontal",
      label: "Horizontal bars",
      props: { orientation: "horizontal", sort: "desc" },
      tags: ["horizontal", "ranked"],
      intentDeltas: { "rank": +1 },
      rubricDeltas: { precision: +1 },
    },
    {
      key: "annotated-threshold",
      label: "With alert threshold",
      description:
        "A target/threshold reference turns the bars into an alert — read for which categories breach. Pair with a provenanced annotation (e.g. from the data-quality bridge) and the communicative act becomes \"alerting\".",
      props: { showGrid: true },
      tags: ["alert", "annotated-threshold", "monitoring"],
      intentDeltas: { "outlier-detection": +2 },
    },
  ],

  buildProps: (profile, variant) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    ...(variant?.props ?? {}),
  }),

  // Bars are about category totals, not row density. The decisive scale axis
  // is cardinality of the category field (Miller 1956: ~7 is the comfort zone;
  // ~25 is the legibility ceiling). Below 3 categories a bar chart feels thin.
  scaleFit: scaleHints({
    cardinality: { sweetSpot: [3, 15], caveatAbove: 25 },
    rows: { sweetSpot: [3, 200] },
  }),
}
