import type { ChartCapability } from "../../ai/chartCapabilityTypes"

/**
 * DifferenceChart needs exactly two series. Without enough series data we can't fit.
 */
export const DifferenceChartCapability: ChartCapability = {
  component: "DifferenceChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 rows"
    if (!profile.primary.x) return "needs an x field (numeric or time)"
    if (!profile.primary.series) return "needs a series field with exactly two groups"
    if (profile.seriesCount !== 2) return `needs exactly 2 series (got ${profile.seriesCount ?? 0})`
    if (!profile.primary.y) return "needs a numeric y field"
    return null
  },

  intentScores: {
    "compare-series": 5,
    "change-detection": 4,
    "trend": 3,
  },

  buildProps: (profile) => {
    // DifferenceChart wants wide-form `{x, a, b}` rows. The fits() guard above
    // ensures we're looking at long-form `{x, series, y}` with exactly two
    // series — pivot it into the expected shape so the returned props are
    // immediately runnable instead of a misleading "A=B" zero-difference.
    const xKey = profile.primary.x as string
    const yKey = profile.primary.y as string
    const seriesKey = profile.primary.series as string

    const seriesNames: string[] = []
    for (const row of profile.data) {
      const name = String(row[seriesKey])
      if (!seriesNames.includes(name)) seriesNames.push(name)
      if (seriesNames.length === 2) break
    }
    const [aName, bName] = seriesNames

    const byX = new Map<unknown, Record<string, unknown>>()
    for (const row of profile.data) {
      const x = row[xKey]
      const series = String(row[seriesKey])
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
