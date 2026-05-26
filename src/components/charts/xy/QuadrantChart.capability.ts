import type { ChartCapability } from "../../ai/chartCapabilityTypes"
import { DEFAULT_QUADRANTS } from "./QuadrantChart.defaults"

export const QuadrantChartCapability: ChartCapability = {
  component: "QuadrantChart",
  family: "relationship",
  importPath: "semiotic/xy",
  rubric: { familiarity: 3, accuracy: 4, precision: 4 },

  fits: (profile) => {
    if (profile.rowCount < 4) return "needs at least 4 points"
    if (!profile.primary.x) return "needs a numeric x field"
    if (!profile.primary.y) return "needs a numeric y field"
    return null
  },

  intentScores: {
    // QuadrantChart partitions a 2D plane by thresholds — useful for
    // strategy-matrix views (BCG, Eisenhower), not for raw category comparison.
    // The two axes should both be meaningful continuous measures.
    "compare-categories": 2,
    "correlation": 3,
    "outlier-detection": 3,
  },

  buildProps: (profile) => {
    // Use the median x and y as default split points.
    const xField = profile.primary.x!
    const yField = profile.primary.y!
    const xSummary = profile.fields[xField]
    const ySummary = profile.fields[yField]
    const xCenter = xSummary?.type === "numeric" ? xSummary.median : undefined
    const yCenter = ySummary?.type === "numeric" ? ySummary.median : undefined
    return {
      data: profile.data,
      xAccessor: xField,
      yAccessor: yField,
      ...(xCenter !== undefined ? { xCenter } : {}),
      ...(yCenter !== undefined ? { yCenter } : {}),
      ...(profile.primary.series && (profile.seriesCount ?? 0) <= 6 ? { colorBy: profile.primary.series } : {}),
      quadrants: {
        topLeft: { ...DEFAULT_QUADRANTS.topLeft },
        topRight: { ...DEFAULT_QUADRANTS.topRight },
        bottomLeft: { ...DEFAULT_QUADRANTS.bottomLeft },
        bottomRight: { ...DEFAULT_QUADRANTS.bottomRight },
      }
    }
  },
}
