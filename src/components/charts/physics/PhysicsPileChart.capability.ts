import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const PhysicsPileChartCapability: ChartCapability = {
  component: "PhysicsPileChart",
  family: "categorical",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a categorical field for piles"
    if (!profile.primary.y) return "needs a numeric value to unitize into bodies"
    if ((profile.categoryCount ?? 0) > 12) return "too many categories for readable physics piles"
    return null
  },

  intentScores: {
    "compare-categories": 3,
    "part-to-whole": 2,
    distribution: 1,
  },

  caveats: () => [
    "Physics piles dramatize accumulation; use bars or dots when exact rank or precise value comparison is the task",
  ],

  buildProps: (profile) => {
    const yField = profile.primary.y
    const values = yField
      ? profile.data
          .map((datum) => Number(datum?.[yField]))
          .filter((value) => Number.isFinite(value))
      : []
    const maxValue = values.length ? Math.max(...values) : 1
    return {
      data: profile.data,
      categoryAccessor: profile.primary.category,
      valueAccessor: yField,
      unitValue: Math.max(1, Math.ceil(maxValue / 40)),
    }
  },
}
