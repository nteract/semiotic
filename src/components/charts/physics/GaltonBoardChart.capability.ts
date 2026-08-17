import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { PHYSICS_SAMPLE_SUGGESTION_PROP_CONTRACT } from "../../ai/suggestionPropContracts"

export const GaltonBoardChartCapability: ChartCapability = {
  component: "GaltonBoardChart",
  family: "distribution",
  importPath: "semiotic/physics",
  rubric: { familiarity: 3, accuracy: 3, precision: 2 },
  suggestionPropContract: PHYSICS_SAMPLE_SUGGESTION_PROP_CONTRACT,

  fits: (profile) => {
    if (profile.rowCount < 20) return "Galton boards need enough observations for a distribution to form"
    if (!profile.primary.y) return "needs a numeric field to drop into bins"
    return null
  },

  intentScores: {
    distribution: 4,
    "outlier-detection": 1,
  },

  // Settings change what this chart is for: showing an observed distribution is
  // a different communicative act from demonstrating how sampling produces one.
  variants: [
    {
      key: "observed",
      label: "Observed samples",
      description: "Drop the supplied rows through the board and read the settled bins.",
      props: { simulationMode: "sample" },
      tags: ["observed"],
    },
    {
      key: "mechanical",
      label: "Mechanical demonstration",
      description:
        "Seeded Bernoulli draws with no input data — explains where a bell curve comes from rather than reporting one.",
      props: { simulationMode: "mechanical" },
      tags: ["explainer", "no-data"],
      intentDeltas: { distribution: -2, "outlier-detection": -1 },
      rubricDeltas: { accuracy: -2, precision: -1 },
    },
  ],

  caveats: () => [
    "The settled projection is the chart; motion is explanatory context and should not be used for exact value reading",
  ],

  buildProps: (profile) => ({
    data: profile.data,
    valueAccessor: profile.primary.y,
    bins: Math.max(8, Math.min(24, Math.round(Math.sqrt(profile.rowCount)))),
  }),
}
