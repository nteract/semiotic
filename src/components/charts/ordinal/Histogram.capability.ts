import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const HistogramCapability: ChartCapability = {
  component: "Histogram",
  family: "distribution",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 4, precision: 3 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.Histogram,

  fits: (profile) => {
    if (profile.rowCount < 10) return "histograms need at least ~10 observations"
    if (!profile.primary.y) return "needs a numeric field to bin"
    // Distinct values must be > a handful — otherwise a bar chart of counts is better
    const yField = profile.primary.y
    const yCandidate = profile.candidates.y.find((c) => c.field === yField)
    if (yCandidate?.distinctCount !== undefined && yCandidate.distinctCount < 6) {
      return "too few distinct numeric values; a bar chart of counts is a better fit"
    }
    return null
  },

  intentScores: {
    "distribution": 5,
    "outlier-detection": 3,
    "compare-categories": 1,
  },

  variants: [
    {
      key: "count-bins",
      label: "Count bins",
      props: { bins: 10, relative: false },
      tags: ["count"],
    },
    {
      key: "share-bins",
      label: "Share bins (relative)",
      props: { bins: 10, relative: true },
      tags: ["share"],
      intentDeltas: { "distribution": +0 },
    },
  ],

  buildProps: (profile, variant) => ({
    data: profile.data,
    valueAccessor: profile.primary.y,
    ...(variant?.props ?? {}),
  }),
}
