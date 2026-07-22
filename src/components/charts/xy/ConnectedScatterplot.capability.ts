import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

export const ConnectedScatterplotCapability: ChartCapability = {
  component: "ConnectedScatterplot",
  family: "relationship",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.ConnectedScatterplot,

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 ordered points"
    if (!profile.primary.x) return "needs an x field"
    if (!profile.primary.y) return "needs a y field"
    if (!profile.monotonicX && !profile.hasTimeAxis) return "needs an ordered x sequence"
    return null
  },

  intentScores: {
    "trend": 3,
    // "Correlation over time" is the canonical job: two numerics plotted
    // against each other while the path traces a temporal sequence. Bump to 5
    // when the canonical form is available (sequence + 2+ other numerics);
    // otherwise it's just an ordered scatter, which is weaker correlation
    // evidence than a plain Scatterplot.
    "correlation": (p) => {
      const seq = p.xProvenance === "time" || p.xProvenance === "named" ? p.primary.x : p.primary.time
      const others = seq ? p.candidates.y.filter((c) => c.field !== seq).map((c) => c.field) : []
      return seq && others.length >= 2 ? 5 : 4
    },
    "change-detection": 3,
  },

  caveats: () => ["readers can confuse path direction without explicit start/end markers"],

  buildProps: (profile) => {
    const base: Record<string, unknown> = { data: profile.data }

    // Canonical form — sequence-as-order, two numerics for x/y. Hans Rosling's
    // "income vs life expectancy over years" shape. When the data shape doesn't
    // support it (only one numeric besides the sequence), fall back to plotting
    // the sequence on x with primary.y on y.
    const seq = profile.xProvenance === "time" || profile.xProvenance === "named"
      ? profile.primary.x
      : profile.primary.time
    const otherNumerics = seq
      ? profile.candidates.y.filter((c) => c.field !== seq).map((c) => c.field)
      : []
    const canonical = !!(seq && otherNumerics.length >= 2)

    if (canonical) {
      base.xAccessor = otherNumerics[0]
      base.yAccessor = otherNumerics[1]
      base.orderAccessor = seq
    } else {
      base.xAccessor = profile.primary.x
      base.yAccessor = profile.primary.y
      base.orderAccessor = profile.primary.time ?? profile.primary.x
    }
    if (profile.primary.series && (profile.seriesCount ?? 0) <= 6) {
      base.colorBy = profile.primary.series
    }
    return base
  },
}
