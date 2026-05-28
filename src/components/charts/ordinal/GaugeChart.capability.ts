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
    // Single-value summaries are a natural part-to-whole encoding when the
    // value sits against a known target ("at 78% of plan"). The other
    // categorical part-to-whole charts (StackedBar, Pie) technically fit at
    // rowCount = 1 too, but at single-value scale Gauge is the honest answer.
    // Gated on rowCount === 1 so this only fires at the tiny end.
    "part-to-whole": (p) => (p.rowCount === 1 ? 5 : 1),
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

  // GaugeChart is the catalog's current answer to "tiny scale" — the only
  // single-value chart. Boost it on tiny data so it shows up where the engine
  // would otherwise have no fit. The `fits()` gate already restricts row count
  // to exactly 1, so this only fires at the tiny end.
  scaleFit: (_profile, effective) => {
    if (effective.rowBand === "tiny") {
      return { delta: 0.6, reason: "designed for single-value displays" }
    }
    return null
  },
}
