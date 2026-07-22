import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const RidgelinePlotCapability: ChartCapability = {
  component: "RidgelinePlot",
  family: "distribution",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 2, accuracy: 3, precision: 3 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.RidgelinePlot,

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric field"
    if (!profile.primary.category) return "needs a category dimension to stack distributions"
    if ((profile.categoryCount ?? 0) < 3) return "needs 3+ categories to make a ridgeline meaningful"
    if (profile.rowCount / Math.max(profile.categoryCount ?? 1, 1) < 6) return "needs 6+ observations per category"
    return null
  },

  intentScores: {
    "distribution": 4,
    "compare-categories": 3,
    "composition-over-time": 2,
  },

  caveats: () => ["readers can confuse overlapping ridges — limit categories or use small multiples"],

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
  }),
}
