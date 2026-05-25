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
    // DifferenceChart expects two-axis-per-row, so this is a "show A vs B" pre-aggregated form.
    // We approximate by passing the raw data plus the accessor; consumers who want true A/B
    // shape will pre-pivot. The capability stays generic.
    return {
      data: profile.data,
      xAccessor: profile.primary.x,
      seriesAAccessor: profile.primary.y,
      seriesBAccessor: profile.primary.y,
    }
  },
}
