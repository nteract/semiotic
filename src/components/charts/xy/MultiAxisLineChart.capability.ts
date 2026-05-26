import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const MultiAxisLineChartCapability: ChartCapability = {
  component: "MultiAxisLineChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 rows"
    if (!profile.primary.x) return "needs an x field"
    // Needs 2+ numeric measures with different ranges
    const numericFields = Object.entries(profile.fields)
      .filter(([f, s]) => s.type === "numeric" && f !== profile.primary.x)
      .map(([f]) => f)
    if (numericFields.length < 2) return "needs at least 2 numeric measures"
    if (profile.xProvenance === "scatter" && !profile.monotonicX) {
      return "needs an ordered/temporal x — multi-axis lines need a shared sequence"
    }
    return null
  },

  intentScores: {
    "compare-series": 4,
    "trend": 3,
    "correlation": 3,
  },

  caveats: () => ["dual axes can mislead — only use when measures share interpretation"],

  buildProps: (profile) => {
    const numericFields = Object.entries(profile.fields)
      .filter(([f, s]) => s.type === "numeric" && f !== profile.primary.x)
      .slice(0, 2)
      .map(([f]) => ({ yAccessor: f, label: f }))
    return {
      data: profile.data,
      xAccessor: profile.primary.x,
      series: numericFields,
    }
  },
}
