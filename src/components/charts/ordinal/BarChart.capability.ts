import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"

export const BarChartCapability: ChartCapability = {
  component: "BarChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 5, accuracy: 5, precision: 4 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.y) return "needs a numeric value field"
    if ((profile.categoryCount ?? 0) < 1) return "needs at least 1 category"
    if ((profile.categoryCount ?? 0) > 50) return "too many categories — consider aggregating or use a different chart"
    return null
  },

  intentScores: {
    // BarChart compares pre-aggregated category totals. When each category has
    // many raw observations, a BoxPlot / ViolinPlot / SwarmPlot is more honest —
    // BarChart's implicit aggregation hides the within-category distribution.
    "compare-categories": (p) => {
      if (!p.categoryCount) return 0
      // A second crossed categorical (service × weekday, region × product)
      // means flat bars silently aggregate one dimension away — the honest
      // answers are GroupedBar/StackedBar/Heatmap, which show the matrix.
      if (p.candidates.category.length >= 2) return 3
      const obsPerCategory = p.rowCount / p.categoryCount
      // Raw-observation data (many rows per category, continuous y) makes a
      // bar per row overdraw into noise — a distribution-chart shape, not a
      // bar-chart shape. Score it as a poor fit, not a near-miss.
      if (obsPerCategory >= 10) return 2
      return 5
    },
    "rank": 5,
    "part-to-whole": (p) => ((p.categoryCount ?? 0) <= 8 ? 3 : 2),
    "distribution": 1,
  },

  variants: [
    {
      key: "sorted-desc",
      label: "Ranked",
      props: { sort: "desc" },
      tags: ["sorted", "ranked"],
      intentDeltas: { "rank": +0, "compare-categories": +0 },
    },
    {
      key: "source-order",
      label: "Source order",
      props: { sort: false },
      tags: ["source-order"],
      intentDeltas: { "rank": -2 },
    },
    {
      key: "horizontal",
      label: "Horizontal bars",
      props: { orientation: "horizontal", sort: "desc" },
      tags: ["horizontal", "ranked"],
      intentDeltas: { "rank": +1 },
      rubricDeltas: { precision: +1 },
    },
  ],

  buildProps: (profile, variant) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    ...(variant?.props ?? {}),
  }),

  // Bars are about category totals, not row density. The decisive scale axis
  // is cardinality of the category field (Miller 1956: ~7 is the comfort zone;
  // ~25 is the legibility ceiling). Below 3 categories a bar chart feels thin.
  scaleFit: scaleHints({
    cardinality: { sweetSpot: [3, 15], caveatAbove: 25 },
    rows: { sweetSpot: [3, 200] },
  }),
}
