import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { PHYSICS_SAMPLE_SUGGESTION_PROP_CONTRACT } from "../../ai/suggestionPropContracts"

export const UnitPileChartCapability: ChartCapability = {
  component: "UnitPileChart",
  family: "categorical",
  importPath: "semiotic/physics",
  rubric: { familiarity: 2, accuracy: 3, precision: 2 },
  suggestionPropContract: PHYSICS_SAMPLE_SUGGESTION_PROP_CONTRACT,

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

  // `showProjection` decides whether the exact totals are stated alongside the
  // countable units, which changes what the reader can actually do.
  variants: [
    {
      key: "projected",
      label: "Piles with stated totals",
      description:
        "Countable units plus the exact per-category total, so accumulation is dramatized without losing precision.",
      props: { showProjection: true },
      tags: ["observed"],
    },
    {
      key: "units-only",
      label: "Units only",
      description:
        "Piles without the totals overlay — reads as texture, and the reader must count.",
      props: { showProjection: false },
      tags: ["narrative"],
      intentDeltas: { "compare-categories": -1, "part-to-whole": -1 },
      rubricDeltas: { precision: -1 },
    },
  ],

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
