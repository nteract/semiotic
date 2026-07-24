import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../../data/numericContracts"

/**
 * BumpChart capability — the ranking-over-x chart. Its canonical job is the
 * `rank` intent: several series ranked against each other at each x-column,
 * with rank as vertical position and the crossings telling the "who overtook
 * whom" story. The `ribbon` variant additionally encodes magnitude.
 *
 * Read alongside `BumpChart.tsx`; this is what makes the chart discoverable
 * through `suggestCharts` and self-describing through `describeChart` (L4).
 */
export const BumpChartCapability: ChartCapability = {
  component: "BumpChart",
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },
  numericContracts: BUILT_IN_NUMERIC_CONTRACTS.BumpChart,

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 rows"
    if (!profile.primary.series || (profile.seriesCount ?? 0) < 2) {
      return "needs a series field with at least 2 series to rank against each other"
    }
    if (!profile.primary.y) return "needs a numeric value to rank by"
    // The ranking axis can be a numeric/time x OR a categorical column (e.g.
    // string-labeled periods like "Q1".."Q3" — BumpChart maps values to ordinal
    // columns). There must be one, with ≥2 distinct columns to show movement.
    const orderedX = !!(profile.primary.x || profile.primary.time)
    if (!orderedX && !profile.primary.category) {
      return "needs an ordered x (time or sequence) or a categorical ranking column"
    }
    const columns = orderedX ? (profile.uniqueXCount ?? 0) : (profile.categoryCount ?? 0)
    if (columns < 2) return "needs at least 2 ranking columns to show rank movement"
    return null
  },

  intentScores: {
    // The canonical bump-chart job. Strong when a handful of series are tracked
    // across several columns; weaker as the series count climbs into spaghetti.
    "rank": (p) => {
      if (!p.seriesCount || p.seriesCount < 2) return 1
      const orderedX = !!(p.primary.x || p.primary.time)
      const columns = orderedX ? (p.uniqueXCount ?? 0) : (p.categoryCount ?? 0)
      if (columns < 2) return 2
      if (p.seriesCount > 12) return 3
      // A true ordered (time/numeric) axis is the canonical bump chart; a
      // categorical ranking column relies on insertion order, so score it a
      // notch lower.
      return orderedX ? 5 : 4
    },
    // Bump compares series *ranks*, not their values — LineChart / GroupedBar /
    // DifferenceChart own value comparison, so keep this modest and let `rank`
    // stay BumpChart's headline intent instead of displacing the value charts.
    "compare-series": (p) => (p.seriesCount && p.seriesCount >= 2 ? 2 : 1),
    // Rank crossings are a genuine change signal along an ordered axis; over
    // categorical columns there's no temporal change to detect.
    "change-detection": (p) =>
      (p.primary.x || p.primary.time) && p.seriesCount && p.seriesCount >= 2 ? 3 : 1,
    // Shows the trend of *rank*, not of value, and only along a genuine
    // ordered/temporal axis. LineChart / AreaChart own value-trend; a
    // scatter-fallback numeric x ("just the other measure") or a purely
    // categorical ranking column is NOT a trend axis (same scatter guard
    // LineChart uses), so score those 0 so they can't falsely "cover" trend.
    "trend": (p) => {
      if (p.primary.time) return 2
      if (p.primary.x && !(p.xProvenance === "scatter" && !p.monotonicX)) return 2
      return 0
    },
  },

  caveats: (p) => {
    const out: string[] = []
    if (p.seriesCount && p.seriesCount > 12) {
      out.push(
        `${p.seriesCount} series will cross into a hard-to-follow tangle — use highlightTop to foreground the leaders`,
      )
    }
    // Inherent to the encoding: order is shown, absolute magnitude is not.
    out.push("rank position hides absolute magnitude — use ribbon to also encode value, or pair with a value chart")
    return out
  },

  variants: [
    {
      key: "ribbon",
      label: "Magnitude ribbons",
      description:
        "Encodes the ranked value as ribbon width, so the chart shows both order and magnitude instead of order alone.",
      props: { ribbon: true },
      tags: ["ribbon", "magnitude"],
      // Magnitude ribbons are a precision refinement; they must not push
      // BumpChart above the value charts on compare-series/trend, so no
      // intent deltas here (see qualityScorecard canonical set).
      rubricDeltas: { precision: +1 },
    },
  ],

  buildProps: (profile, variant) => {
    const base: Record<string, unknown> = {
      data: profile.data,
      xAccessor: profile.primary.x ?? profile.primary.time ?? profile.primary.category,
      yAccessor: profile.primary.y,
      lineBy: profile.primary.series,
    }
    // With many series, foreground the leaders rather than draw every crossing.
    if (profile.seriesCount && profile.seriesCount > 6) {
      base.highlightTop = 5
    }
    return { ...base, ...(variant?.props ?? {}) }
  },

  // A bump chart reads well with a few series over a few columns; a handful of
  // rows is too little to rank, and thousands of series/columns collapse into
  // an unreadable tangle. Rows here are total observations (series × columns).
  scaleFit: scaleHints({
    rows: { sweetSpot: [8, 200], caveatBelow: 4, caveatAbove: 1500 },
  }),
}
