import type { ChartCapability } from "../../ai/chartCapabilityTypes"

/**
 * LineChart capability — declares what data shapes LineChart serves well,
 * what intents it answers, and what variants change those answers.
 *
 * Read alongside `LineChart.tsx`; this file is what makes the chart
 * "self-aware" for suggestion and interrogation flows.
 */
export const LineChartCapability: ChartCapability = {
  component: "LineChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 5, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (profile.rowCount < 2) return "needs at least 2 rows"
    if (!profile.primary.x) return "needs a numeric or time x field"
    if (!profile.primary.y) return "needs a numeric y field"
    const xKind = profile.candidates.x.find((c) => c.field === profile.primary.x)?.kind
    if (xKind && xKind !== "numeric" && xKind !== "date") return `x field "${profile.primary.x}" is ${xKind}, LineChart needs numeric or time`
    // A line chart needs an *ordered* x — connecting points across an arbitrary
    // numeric (scatter-fallback x with no monotonicity) is misleading.
    if (profile.xProvenance === "scatter" && !profile.monotonicX) {
      return "needs an ordered/temporal x — given x looks like a scatter pattern, not a sequence"
    }
    return null
  },

  intentScores: {
    "trend": (p) => {
      // A trend needs an *ordered* x — time field, monotonic numeric, or
      // an x-named numeric. Scatter-fallback x (just "the other numeric"
      // when there are two) doesn't qualify as a trend axis.
      if (p.xProvenance === "scatter" && !p.monotonicX) return 1
      return p.uniqueXCount && p.uniqueXCount >= 4 ? 5 : 3
    },
    "compare-series": (p) => {
      if (p.xProvenance === "scatter" && !p.monotonicX) return 1
      if (!p.seriesCount || p.seriesCount < 2) return 1
      if (p.seriesCount > 8) return 2
      return 4
    },
    "change-detection": (p) => (p.xProvenance === "scatter" && !p.monotonicX ? 1 : 4),
    "outlier-detection": 2,
    "correlation": 2,
  },

  caveats: (p) => {
    const out: string[] = []
    if (p.hasRepeatedX && (!p.seriesCount || p.seriesCount < 2)) {
      out.push("x values repeat — consider aggregating or adding a series field")
    }
    if (p.seriesCount && p.seriesCount > 8) {
      out.push(`${p.seriesCount} series may produce a spaghetti chart`)
    }
    return out
  },

  variants: [
    {
      key: "linear",
      label: "Linear trend",
      props: { curve: "linear", showPoints: false },
      tags: ["linear"],
    },
    {
      key: "smooth",
      label: "Smooth trend",
      description: "Monotone smoothing — emphasizes the shape over individual points.",
      props: { curve: "monotoneX", showPoints: false },
      tags: ["smooth", "narrative"],
      intentDeltas: { "trend": +1, "outlier-detection": -2 },
      rubricDeltas: { precision: -1 },
      caveats: ["smoothing hides individual outliers"],
    },
    {
      key: "stepped-with-points",
      label: "Discrete steps",
      description: "Step curve plus visible points — for state changes or discrete events.",
      props: { curve: "step", showPoints: true, pointRadius: 3 },
      tags: ["step", "discrete"],
      intentDeltas: { "change-detection": +1, "trend": -1 },
      rubricDeltas: { precision: +1 },
    },
  ],

  buildProps: (profile, variant) => {
    const base: Record<string, unknown> = {
      data: profile.data,
      xAccessor: profile.primary.x,
      yAccessor: profile.primary.y,
    }
    if (profile.seriesCount && profile.seriesCount >= 2 && profile.primary.series) {
      base.lineBy = profile.primary.series
      base.colorBy = profile.primary.series
    }
    if (profile.hasTimeAxis && profile.primary.x === profile.primary.time) {
      base.xScaleType = "time"
    }
    return { ...base, ...(variant?.props ?? {}) }
  },
}
