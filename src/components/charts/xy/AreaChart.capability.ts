import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const AreaChartCapability: ChartCapability = {
  component: "AreaChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 4, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (profile.rowCount < 3) return "needs at least 3 rows"
    if (!profile.primary.x) return "needs a numeric or time x field"
    if (!profile.primary.y) return "needs a numeric y field"
    if (profile.xProvenance === "scatter" && !profile.monotonicX) {
      return "needs an ordered/temporal x — given x looks like a scatter pattern, not a sequence"
    }
    return null
  },

  intentScores: {
    "trend": (p) => (p.xProvenance === "scatter" && !p.monotonicX ? 1 : 4),
    "composition-over-time": (p) => (p.seriesCount && p.seriesCount >= 2 ? 3 : 1),
    "change-detection": (p) => (p.xProvenance === "scatter" && !p.monotonicX ? 1 : 3),
    "compare-series": 2,
  },

  variants: [
    {
      key: "smooth-gradient",
      label: "Smooth gradient area",
      props: { curve: "monotoneX", areaOpacity: 0.55, gradientFill: true },
      tags: ["smooth", "gradient", "narrative"],
      intentDeltas: { "trend": +1 },
      rubricDeltas: { precision: -1 },
    },
    {
      key: "linear",
      label: "Linear area",
      props: { curve: "linear", areaOpacity: 0.5 },
      tags: ["linear"],
    },
    {
      key: "stepped",
      label: "Stepped area",
      props: { curve: "stepAfter", areaOpacity: 0.55 },
      tags: ["step"],
      intentDeltas: { "change-detection": +1 },
    },
  ],

  buildProps: (profile, variant) => {
    const base: Record<string, unknown> = {
      data: profile.data,
      xAccessor: profile.primary.x,
      yAccessor: profile.primary.y,
    }
    if (profile.hasTimeAxis && profile.primary.x === profile.primary.time) {
      base.xScaleType = "time"
    }
    return { ...base, ...(variant?.props ?? {}) }
  },
}
