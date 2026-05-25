import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const StackedBarChartCapability: ChartCapability = {
  component: "StackedBarChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.y) return "needs a numeric value field"
    if (!profile.primary.series) return "needs a series field to stack by"
    if ((profile.seriesCount ?? 0) < 2) return "needs 2+ stack groups"
    if ((profile.seriesCount ?? 0) > 8) return `${profile.seriesCount} stacked groups is too many`
    return null
  },

  intentScores: {
    "part-to-whole": 4,
    "compare-categories": 4,
    "composition-over-time": (p) => (p.hasTimeAxis ? 3 : 1),
    "compare-series": 2,
  },

  caveats: () => ["only the bottom segment shares a baseline; others are harder to compare across categories"],

  variants: [
    {
      key: "absolute",
      label: "Absolute stacks",
      props: { normalize: false },
      tags: ["absolute"],
    },
    {
      key: "normalized",
      label: "100% stacked",
      description: "Each bar normalized to 1 — emphasizes composition, hides totals.",
      props: { normalize: true },
      tags: ["normalized", "part-to-whole"],
      intentDeltas: { "part-to-whole": +1, "compare-categories": -1 },
      caveats: ["absolute magnitudes are no longer comparable across bars"],
    },
  ],

  buildProps: (profile, variant) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    stackBy: profile.primary.series,
    colorBy: profile.primary.series,
    ...(variant?.props ?? {}),
  }),
}
