import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

const STAGE_HINT = /(stage|step|funnel|status|outcome|phase)/i

export const FunnelChartCapability: ChartCapability = {
  component: "FunnelChart",
  family: "flow",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 4, accuracy: 3, precision: 3 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.FunnelChart,

  fits: (profile) => {
    if (!profile.primary.y) return "needs a numeric value field"
    const stepField = Object.keys(profile.fields).find((f) => STAGE_HINT.test(f))
    if (!stepField) return "needs a stage/step/funnel-named field"
    return null
  },

  intentScores: {
    "flow": 4,
    "rank": 3,
    "part-to-whole": 2,
  },

  caveats: () => ["readers infer conversion drop-off — make sure rows actually represent sequential stages"],

  buildProps: (profile) => {
    const stepField = Object.keys(profile.fields).find((f) => STAGE_HINT.test(f))
    return {
      data: profile.data,
      stepAccessor: stepField,
      valueAccessor: profile.primary.y,
      ...(profile.primary.category && profile.primary.category !== stepField ? { categoryAccessor: profile.primary.category } : {}),
    }
  },
}
