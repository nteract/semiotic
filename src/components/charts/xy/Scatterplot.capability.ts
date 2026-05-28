import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"

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
    // Yield to richer correlation charts when the data supports them:
    //   • ConnectedScatterplot when a sequence axis + 2+ other numerics exist
    //     (same x/y plus temporal progression — strictly more informative).
    //   • BubbleChart when a size dimension is available (genuinely 3-D data
    //     — bubble is the honest representation, scatter drops one dimension).
    // Otherwise position-only scatter is the right answer.
    "correlation": (p) => {
      const seq = p.xProvenance === "time" || p.xProvenance === "named" ? p.primary.x : p.primary.time
      const others = seq ? p.candidates.y.filter((c) => c.field !== seq).map((c) => c.field) : []
      if (seq && others.length >= 2) return 4
      if (p.primary.size) return 4
      return 5
    },
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
    const base: Record<string, unknown> = { data: profile.data }

    // Canonical "X vs Y" form: when there's a strong sequence axis (time or
    // named — month, quarter, year...) AND 2+ other numerics, prefer plotting
    // the two numerics against each other. Otherwise the scatterplot just
    // recapitulates a line chart on the sequence axis.
    const seq = profile.xProvenance === "time" || profile.xProvenance === "named"
      ? profile.primary.x
      : undefined
    const otherNumerics = seq
      ? profile.candidates.y.filter((c) => c.field !== seq).map((c) => c.field)
      : []
    const canonical = !!(seq && otherNumerics.length >= 2)

    if (canonical) {
      base.xAccessor = otherNumerics[0]
      base.yAccessor = otherNumerics[1]
    } else {
      base.xAccessor = profile.primary.x
      base.yAccessor = profile.primary.y
      if (profile.primary.size) base.sizeBy = profile.primary.size
    }
    if (profile.primary.series && profile.seriesCount && profile.seriesCount <= 6) {
      base.colorBy = profile.primary.series
    }
    return { ...base, ...(variant?.props ?? {}) }
  },

  // Scatter benefits from many points (visual density reveals clusters), but
  // overdraw past ~10k points hides structure unless paired with alpha or
  // hexbin treatment. Below 20 points patterns are anecdotes, not signal.
  scaleFit: scaleHints({
    rows: { sweetSpot: [50, 5000], caveatBelow: 20, caveatAbove: 10000 },
  }),
}
