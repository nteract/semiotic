import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const ViolinPlotCapability: ChartCapability = {
  component: "ViolinPlot",
  family: "distribution",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.ViolinPlot,

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric field"
    if (!profile.primary.category) return "needs a category to split distributions"
    if (profile.rowCount / Math.max(profile.categoryCount ?? 1, 1) < 6) return "needs 6+ observations per category"
    return null
  },

  intentScores: {
    "distribution": 5,
    "compare-categories": 4,
  },

  variants: [
    { key: "density", label: "Density only", props: { showIQR: false }, tags: ["density"] },
    {
      key: "density-iqr",
      label: "Density with IQR",
      props: { showIQR: true },
      tags: ["density", "iqr"],
      intentDeltas: { "distribution": +0 },
      rubricDeltas: { precision: +1 },
    },
  ],

  buildProps: (profile, variant) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    ...(variant?.props ?? {}),
  }),
}
