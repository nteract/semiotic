import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { scaleHints } from "../../ai/dataScaleProfile"

export const BubbleChartCapability: ChartCapability = {
  component: "BubbleChart",
  family: "relationship",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 3 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 points"
    if (!profile.primary.x) return "needs a numeric x field"
    if (!profile.primary.y) return "needs a numeric y field"
    if (!profile.primary.size) return "needs a third numeric measure for bubble size"
    return null
  },

  intentScores: {
    // When a size dimension is available the dataset is genuinely 3-D and
    // BubbleChart is the honest representation. Scatterplot yields to Bubble
    // in that case (see Scatterplot.capability.ts), letting Bubble take
    // correlation outright at small-to-medium row counts.
    "correlation": 5,
    "compare-categories": 3,
    "outlier-detection": 4,
  },

  caveats: () => ["bubble area is harder to compare than length — large dynamic ranges distort"],

  buildProps: (profile) => ({
    data: profile.data,
    xAccessor: profile.primary.x,
    yAccessor: profile.primary.y,
    sizeBy: profile.primary.size,
    ...(profile.primary.series && (profile.seriesCount ?? 0) <= 6 ? { colorBy: profile.primary.series } : {}),
  }),

  // BubbleChart's edge over Scatterplot is when each point's third dimension
  // is legible — that means medium density (4–500 rows). Past ~1500 rows the
  // size circles overlap into solid color and the third dimension becomes
  // noise; at that point fall back to position-only (Scatterplot).
  scaleFit: scaleHints({
    rows: { sweetSpot: [10, 500], caveatAbove: 1500 },
  }),
}
