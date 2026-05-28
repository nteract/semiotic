import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"

export const StackedAreaChartCapability: ChartCapability = {
  component: "StackedAreaChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 4, accuracy: 3, precision: 3 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 rows"
    if (!profile.primary.x) return "needs an ordered x field"
    if (!profile.primary.y) return "needs a numeric y field"
    if (!profile.seriesCount || profile.seriesCount < 2) return "needs 2+ stack groups (series field)"
    if (profile.seriesCount > 10) return `${profile.seriesCount} series is too many to stack legibly`
    if (profile.xProvenance === "scatter" && !profile.monotonicX) {
      return "needs an ordered/temporal x — stacking only makes sense across a sequence"
    }
    return null
  },

  intentScores: {
    "composition-over-time": 5,
    "part-to-whole": (p) => (p.hasTimeAxis ? 4 : 3),
    "trend": 3,
    "compare-series": 2,
  },

  caveats: () => ["readability of individual layers degrades below the baseline"],

  variants: [
    {
      key: "baseline-zero",
      label: "Zero baseline",
      props: { baseline: "zero", stackOrder: "key" },
      tags: ["zero-baseline"],
    },
    {
      key: "streamgraph",
      label: "Streamgraph",
      description: "Wiggle baseline + inside-out ordering — emphasizes momentum over precise totals.",
      props: { baseline: "wiggle", stackOrder: "insideOut", showLine: false },
      tags: ["streamgraph", "narrative"],
      intentDeltas: { "composition-over-time": +0, "trend": +1, "part-to-whole": -2 },
      rubricDeltas: { accuracy: -1, precision: -1 },
      caveats: ["streamgraph hides absolute totals; precise reads not possible"],
    },
    {
      key: "centered",
      label: "Centered baseline",
      props: { baseline: "silhouette", stackOrder: "insideOut" },
      tags: ["silhouette"],
      intentDeltas: { "part-to-whole": -1 },
    },
  ],

  buildProps: (profile, variant) => {
    const base: Record<string, unknown> = {
      data: profile.data,
      xAccessor: profile.primary.x,
      yAccessor: profile.primary.y,
      areaBy: profile.primary.series,
      colorBy: profile.primary.series,
    }
    if (profile.hasTimeAxis && profile.primary.x === profile.primary.time) {
      base.xScaleType = "time"
    }
    return { ...base, ...(variant?.props ?? {}) }
  },

  // Stacked areas read well at medium density with a small-to-mid series count.
  // High series counts produce a striped band where individual layers blur —
  // the `streamgraph` variant is the workaround at the upper end. Few series
  // and few rows produce too little signal to stack.
  scaleFit: scaleHints({
    rows: { sweetSpot: [30, 1500], caveatBelow: 12, caveatAbove: 10000 },
  }),
}
