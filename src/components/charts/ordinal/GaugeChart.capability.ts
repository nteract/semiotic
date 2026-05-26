import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const GaugeChartCapability: ChartCapability = {
  component: "GaugeChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 2, precision: 2 },

  fits: (profile) => {
    if (profile.rowCount > 1) return "GaugeChart shows a single value — provide a 1-row dataset or use BarChart"
    if (!profile.primary.y) return "needs a numeric value"
    return null
  },

  intentScores: {
    "compare-categories": 1,
    "rank": 1,
  },

  caveats: () => ["gauges only show a single value; consider a stat card or bar instead for comparison"],

  buildProps: (profile) => {
    const yField = profile.primary.y!
    const firstRow = profile.data[0]
    const value = firstRow ? Number(firstRow[yField]) : 0
    const summary = profile.fields[yField]
    const max = summary?.type === "numeric" ? summary.max : 100
    return {
      value: Number.isFinite(value) ? value : 0,
      min: 0,
      max,
    }
  },
}
