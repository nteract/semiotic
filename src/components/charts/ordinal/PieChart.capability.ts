import type { ChartCapability } from "../../ai/chartCapabilityTypes"

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
      description: "Hollow center — easier to fit a label or KPI inside.",
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
}
