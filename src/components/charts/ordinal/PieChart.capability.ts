import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"

export const PieChartCapability: ChartCapability = {
  component: "PieChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 5, accuracy: 3, precision: 2 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category field"
    if (!profile.primary.y) return "needs a numeric value field"
    const count = profile.categoryCount ?? 0
    if (count < 2) return "needs 2+ categories"
    if (count > 8) return `${count} slices is too many for a pie chart`
    return null
  },

  intentScores: {
    "part-to-whole": 4,
    "compare-categories": 2,
    "rank": 1,
  },

  caveats: () => [
    "angle comparisons are less accurate than length — prefer a bar chart unless part-to-whole is the explicit message",
  ],

  variants: [
    {
      key: "pie",
      label: "Pie",
      props: {},
      tags: ["pie"],
    },
    {
      key: "donut",
      label: "Donut",
      description: "Hollow center — easier to fit a label or KPI inside. Switches to DonutChart (PieChart ignores innerRadius).",
      // Prefer the real DonutChart component — PieChart has no innerRadius prop.
      component: "DonutChart",
      props: { innerRadius: 60 },
      tags: ["donut"],
    },
  ],

  buildProps: (profile, variant) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
    ...(variant?.props ?? {}),
  }),

  // Pie comparison via angle is perceptually weak above ~7 slices (Cleveland-McGill
  // rank position vs angle); the descriptor `fits()` caps at 8 already, but in
  // the 5–8 range we still bias against to nudge toward bar-style alternatives.
  scaleFit: scaleHints({
    cardinality: { sweetSpot: [2, 5], caveatAbove: 6 },
  }),
}
