import type { ChartCapability } from "../../ai/chartCapabilityTypes"

const RATING_HINT = /(rating|score|likert|satisfaction|nps|agree|sentiment|level)/i

export const LikertChartCapability: ChartCapability = {
  component: "LikertChart",
  family: "categorical",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (!profile.primary.category) return "needs a category (question) field"
    if (!profile.primary.y) return "needs a numeric rating/count field"
    const ratingField = Object.keys(profile.fields).find((f) => RATING_HINT.test(f))
    if (!ratingField) return "needs an ordinal rating/level field (rating, score, level...)"
    return null
  },

  intentScores: {
    "compare-categories": 4,
    "distribution": 3,
    "part-to-whole": 3,
  },

  buildProps: (profile) => {
    const ratingField = Object.keys(profile.fields).find((f) => RATING_HINT.test(f))!
    return {
      data: profile.data,
      categoryAccessor: profile.primary.category,
      valueAccessor: profile.primary.y,
      levelAccessor: ratingField,
    }
  },
}
