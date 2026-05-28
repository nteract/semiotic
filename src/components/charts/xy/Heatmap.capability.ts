import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"

/**
 * Heatmap is a matrix: categorical × categorical (or temporal × categorical),
 * with a numeric encoded as color. Without two genuine discrete dimensions
 * for the axes, a heatmap of raw rows is sparse and unreadable. Tuned in
 * Phase 2.1 after the scorecard surfaced Heatmap winning unsuitable
 * compare-categories rankings.
 */
export const HeatmapCapability: ChartCapability = {
  component: "Heatmap",
  family: "relationship",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 cells"
    if (!profile.primary.y) return "needs a numeric value to encode in cell color"
    // Heatmap needs two discrete axes. Acceptable shapes:
    //   • 2+ distinct categorical fields (category × category)
    //   • 1 categorical + 1 time field (category × time)
    //   • 1 categorical + low-cardinality numeric (≤ 30 distinct values)
    const categoricalCount = profile.candidates.category.length
    const hasTime = profile.hasTimeAxis
    if (categoricalCount < 2 && !(categoricalCount >= 1 && hasTime)) {
      return "needs two categorical-or-time dimensions for the axes"
    }
    const xUnique = profile.uniqueXCount ?? 0
    if (xUnique > 50) return "too many x cells for a legible heatmap"
    return null
  },

  intentScores: {
    "correlation": 3,
    "distribution": 2,
    // compare-categories only works when we have a *matrix*, not a 1D categorical comparison
    "compare-categories": (p) => {
      const catCount = p.candidates.category.length
      return catCount >= 2 ? 4 : 1
    },
    "composition-over-time": (p) => (p.hasTimeAxis && p.candidates.category.length >= 1 ? 4 : 1),
  },

  caveats: (p) => {
    const out: string[] = []
    if ((p.uniqueXCount ?? 0) > 30) out.push("many x values — cells will be narrow")
    return out
  },

  variants: [
    {
      key: "default",
      label: "Sequential color",
      props: {},
      tags: ["sequential"],
    },
    {
      key: "show-values",
      label: "With cell labels",
      props: { showValues: true },
      tags: ["labeled"],
      intentDeltas: { "compare-categories": +1 },
      rubricDeltas: { precision: +1 },
      caveats: ["cell labels crowd dense matrices"],
    },
  ],

  buildProps: (profile, variant) => {
    // Prefer category × category if available, else category × time.
    const categoricalFields = profile.candidates.category.map((c) => c.field)
    const xField = profile.primary.time ?? categoricalFields[0]
    const yField =
      categoricalFields.find((f) => f !== xField) ??
      categoricalFields[0] ??
      profile.primary.series
    const valueField = profile.primary.y

    return {
      data: profile.data,
      xAccessor: xField,
      yAccessor: yField,
      valueAccessor: valueField,
      ...(variant?.props ?? {}),
    }
  },

  // Heatmap wants density — sparse cells dominate noise. Below ~50 rows the
  // matrix feels under-baked; above ~50k the cells become 1 pixel each and
  // sequential color stops conveying useful difference. Sweet spot is the
  // wide band where individual cell color is legible AND there are enough
  // cells to read a pattern (Munzner ch. 10: sequential colormap density).
  scaleFit: scaleHints({
    rows: { sweetSpot: [100, 10000], caveatBelow: 25, caveatAbove: 50000 },
  }),
}
