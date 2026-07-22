import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const CandlestickChartCapability: ChartCapability = {
  component: "CandlestickChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.CandlestickChart,

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 rows"
    if (!profile.primary.x) return "needs an x field (typically date)"
    const fieldNames = new Set(Object.keys(profile.fields).map((f) => f.toLowerCase()))
    const haveHigh = fieldNames.has("high")
    const haveLow = fieldNames.has("low")
    if (!haveHigh || !haveLow) return "needs at minimum high/low fields (open/close optional)"
    return null
  },

  intentScores: {
    "change-detection": 4,
    "trend": 3,
    "outlier-detection": 3,
  },

  buildProps: (profile) => {
    const fields = Object.keys(profile.fields)
    const find = (target: string) => fields.find((f) => f.toLowerCase() === target)
    return {
      data: profile.data,
      xAccessor: profile.primary.x,
      highAccessor: find("high"),
      lowAccessor: find("low"),
      openAccessor: find("open"),
      closeAccessor: find("close"),
    }
  },
}
