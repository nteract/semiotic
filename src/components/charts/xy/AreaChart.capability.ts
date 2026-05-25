import type { ChartCapability } from "../../ai/chartCapabilityTypes"

/**
 * AreaChart is treated as a strictly single-series chart. Multi-series areas
 * are an occlusion nightmare — when the data has 2+ series we subselect the
 * leading series (largest cumulative y) and surface a caveat so the reader
 * knows they're looking at one slice, not the whole dataset. For full multi-
 * series comparison the engine routes callers to LineChart; for two-series
 * comparison, to DifferenceChart.
 */
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
    // Single-series trend is AreaChart's sweet spot — the gradient fill is
    // more visually arresting than a thin line. Yield to LineChart when
    // the data is genuinely multi-series; the subselected single series we
    // emit is a partial picture, so it should not outrank a full multi-line.
    "trend": (p) => {
      if (p.xProvenance === "scatter" && !p.monotonicX) return 1
      const singleSeries = !p.seriesCount || p.seriesCount < 2
      if (!singleSeries) return 3
      return p.uniqueXCount && p.uniqueXCount >= 4 ? 5 : 3
    },
    "change-detection": (p) => (p.xProvenance === "scatter" && !p.monotonicX ? 1 : 3),
  },

  caveats: (p) => {
    const out: string[] = []
    if (p.seriesCount && p.seriesCount >= 2 && p.primary.series) {
      out.push(
        `showing only the leading "${p.primary.series}" series — for multi-series comparison use LineChart or DifferenceChart`,
      )
    }
    return out
  },

  variants: [
    {
      key: "smooth",
      label: "Smooth gradient",
      props: { curve: "monotoneX" },
      tags: ["smooth", "gradient", "narrative"],
    },
    {
      key: "linear",
      label: "Linear",
      props: { curve: "linear", gradientFill: false, areaOpacity: 0.5 },
      tags: ["linear"],
    },
    {
      key: "stepped",
      label: "Stepped",
      props: { curve: "stepAfter" },
      tags: ["step"],
      intentDeltas: { "change-detection": +1 },
    },
  ],

  buildProps: (profile, variant) => {
    let data = profile.data

    // Multi-series subselection: pull out the series with the largest summed y
    // and show just that one. Same "narrow the dataset to make the chart
    // honest" pattern DifferenceChart uses when the input has more series than
    // its native two.
    if (profile.seriesCount && profile.seriesCount >= 2 && profile.primary.series) {
      const seriesKey = profile.primary.series
      const yKey = profile.primary.y as string
      const totals = new Map<unknown, number>()
      for (const row of profile.data) {
        const k = row[seriesKey]
        const v = Number(row[yKey])
        totals.set(k, (totals.get(k) ?? 0) + (Number.isFinite(v) ? v : 0))
      }
      let leading: unknown
      let max = -Infinity
      for (const [k, v] of totals) {
        if (v > max) {
          max = v
          leading = k
        }
      }
      if (leading != null) {
        data = profile.data.filter((row) => row[seriesKey] === leading)
      }
    }

    const base: Record<string, unknown> = {
      data,
      xAccessor: profile.primary.x,
      yAccessor: profile.primary.y,
      // Gradient is the default — single-series areas read better with a
      // top-to-baseline opacity ramp than a flat fill.
      gradientFill: true,
      areaOpacity: 0.55,
    }
    if (profile.hasTimeAxis && profile.primary.x === profile.primary.time) {
      base.xScaleType = "time"
    }
    return { ...base, ...(variant?.props ?? {}) }
  },
}
