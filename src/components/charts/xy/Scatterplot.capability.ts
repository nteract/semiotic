import type { ChartCapability } from "../../ai/chartCapabilityTypes"

export const ScatterplotCapability: ChartCapability = {
  component: "Scatterplot",
  family: "relationship",
  importPath: "semiotic/xy",
  rubric: { familiarity: 4, accuracy: 5, precision: 5 },

  fits: (profile) => {
    if (profile.rowCount < 3) return "needs at least 3 rows"
    if (!profile.primary.x) return "needs a numeric x field"
    if (!profile.primary.y) return "needs a numeric y field"
    const xKind = profile.candidates.x.find((c) => c.field === profile.primary.x)?.kind
    if (xKind === "date") {
      // Time-axis scatter is technically valid but usually a worse choice than a line/area
      return null
    }
    if (xKind && xKind !== "numeric") return `x field "${profile.primary.x}" is ${xKind}, Scatterplot needs numeric`
    return null
  },

  intentScores: {
    "correlation": 5,
    "outlier-detection": 5,
    "distribution": 3,
    "compare-series": (p) => (p.seriesCount && p.seriesCount >= 2 && p.seriesCount <= 6 ? 3 : 1),
    "rank": 1,
  },

  variants: [
    {
      key: "points",
      label: "Points only",
      props: {},
      tags: ["points"],
    },
    {
      key: "with-trend",
      label: "Points with regression line",
      props: { regression: "linear" },
      tags: ["regression", "trend"],
      // A regression line illuminates the correlation but doesn't make
      // Scatterplot a "trend over time" chart — keep delta modest.
      intentDeltas: { "correlation": +0, "trend": +1 },
    },
  ],

  buildProps: (profile, variant) => {
    const base: Record<string, unknown> = {
      data: profile.data,
      xAccessor: profile.primary.x,
      yAccessor: profile.primary.y,
    }
    if (profile.primary.series && profile.seriesCount && profile.seriesCount <= 6) {
      base.colorBy = profile.primary.series
    }
    if (profile.primary.size) {
      base.sizeBy = profile.primary.size
    }
    return { ...base, ...(variant?.props ?? {}) }
  },
}
