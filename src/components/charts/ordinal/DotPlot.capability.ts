import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const DotPlotCapability: ChartCapability = {
  component: "DotPlot",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 3, accuracy: 5, precision: 5 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.DotPlot,

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.y) return "needs a numeric value field"
    if ((profile.categoryCount ?? 0) > 30) return "too many categories for a dot plot"
    return null
  },

  intentScores: {
    // Like BarChart, DotPlot implicitly aggregates — yield to distribution
    // charts when each category has many observations.
    "compare-categories": (p) => {
      if (!p.categoryCount) return 0
      const obsPerCategory = p.rowCount / p.categoryCount
      if (obsPerCategory >= 10) return 3
      return 5
    },
    "rank": 5,
    "outlier-detection": 3,
  },

  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
  }),

  // DotPlot's edge over BarChart is when the category count is in the awkward
  // "more than fits comfortably as bars" range (15–30) — dots compress denser
  // along the value axis. Below 15 categories BarChart is the more familiar
  // choice and DotPlot's accuracy advantage isn't decisive.
  scaleFit: scaleHints({
    cardinality: { sweetSpot: [10, 30], caveatAbove: 40 },
    rows: { sweetSpot: [5, 300] },
  }),
}
