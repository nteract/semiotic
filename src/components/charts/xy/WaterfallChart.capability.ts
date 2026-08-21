import type { ChartCapability } from "../../ai/chartCapabilityTypes"

const DELTA_FIELD_HINT = /(?:delta|change|increase|decrease|impact|variance|net)/i

export const WaterfallChartCapability: ChartCapability = {
  component: "WaterfallChart",
  family: "flow",
  importPath: "semiotic/xy",
  rubric: { familiarity: 4, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric delta field"
    if (profile.rowCount < 3) return "needs a sequence of steps"
    if (!profile.primary.x) return "needs an ordered step field"
    if (profile.xProvenance === "scatter" && !profile.monotonicX) {
      return "needs an ordered step sequence, not an unordered numeric comparison"
    }

    const yValues = profile.data
      .map((row) => Number(row[profile.primary.y!]))
      .filter(Number.isFinite)
    const hasSignedDeltas = yValues.some((value) => value < 0) && yValues.some((value) => value > 0)
    const hasDeltaNamedField = Object.keys(profile.fields).some((field) => DELTA_FIELD_HINT.test(field))
    if (!hasSignedDeltas && !hasDeltaNamedField) {
      return "needs signed deltas or a delta/change-named measure; cumulative totals do not form a waterfall"
    }
    return null
  },

  intentScores: {
    "flow": 5,
    "trend": 2,
    "compare-categories": 2,
  },

  caveats: () => [
    "each row is a signed delta, not a running total — pre-summed levels will double-count",
  ],

  buildProps: (profile) => ({
    data: profile.data,
    xAccessor: profile.primary.x ?? profile.primary.category,
    yAccessor: profile.primary.y,
  }),
}
