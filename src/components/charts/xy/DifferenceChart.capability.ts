import type { ChartCapability } from "../../ai/chartCapabilityTypes"

/**
 * DifferenceChart's native shape is two series. When the input has 2+ series
 * we subselect the top two by total y and pivot them into the wide form the
 * chart expects — same "narrow the dataset to make the chart honest" pattern
 * AreaChart uses for its single-series fallback.
 */
export const DifferenceChartCapability: ChartCapability = {
  component: "DifferenceChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 rows"
    if (!profile.primary.x) return "needs an x field (numeric or time)"
    if (!profile.primary.series) return "needs a series field with at least two groups"
    if (!profile.seriesCount || profile.seriesCount < 2) return `needs 2+ series (got ${profile.seriesCount ?? 0})`
    if (!profile.primary.y) return "needs a numeric y field"
    // Same ordered-x guard LineChart/AreaChart use — a difference between two
    // series only reads as "change over a sequence" if the x is actually a
    // sequence. Scatter-fallback x with no monotonicity is meaningless here.
    if (profile.xProvenance === "scatter" && !profile.monotonicX) {
      return "needs an ordered/temporal x — given x looks like a scatter pattern, not a sequence"
    }
    return null
  },

  intentScores: {
    "compare-series": 5,
    "change-detection": 4,
    "trend": 3,
  },

  caveats: (p) => {
    const out: string[] = []
    if (p.seriesCount && p.seriesCount > 2) {
      out.push(`showing the top 2 of ${p.seriesCount} series — for full multi-series comparison use LineChart`)
    }
    return out
  },

  buildProps: (profile) => {
    // DifferenceChart wants wide-form `{x, a, b}` rows. Pivot long-form
    // `{x, series, y}` into that shape — and when there are more than two
    // series, pick the top two by cumulative y so the comparison surfaces
    // the most significant pair rather than insertion-order accidents.
    const xKey = profile.primary.x as string
    const yKey = profile.primary.y as string
    const seriesKey = profile.primary.series as string

    const totals = new Map<string, number>()
    for (const row of profile.data) {
      const name = String(row[seriesKey])
      const v = Number(row[yKey])
      totals.set(name, (totals.get(name) ?? 0) + (Number.isFinite(v) ? v : 0))
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const aName = ranked[0]?.[0]
    const bName = ranked[1]?.[0]

    const byX = new Map<unknown, Record<string, unknown>>()
    for (const row of profile.data) {
      const series = String(row[seriesKey])
      if (series !== aName && series !== bName) continue
      const x = row[xKey]
      const y = row[yKey]
      let entry = byX.get(x)
      if (!entry) {
        entry = { [xKey]: x }
        byX.set(x, entry)
      }
      if (series === aName) entry.a = y
      else if (series === bName) entry.b = y
    }
    const wide = Array.from(byX.values()).filter((r) => r.a != null && r.b != null)

    return {
      data: wide,
      xAccessor: xKey,
      seriesAAccessor: "a",
      seriesBAccessor: "b",
      seriesALabel: aName,
      seriesBLabel: bName,
    }
  },
}
