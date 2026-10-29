import type { StreamChartCapability } from "../../ai/streamingTypes"
import {
  pickCategoryField,
  pickMeasureFields,
  resolveStreamShape,
  streamThroughputBand,
  streamKeyedChangelogCaveat,
} from "../../ai/streamSchema"

export const ScatterplotStreamCapability: StreamChartCapability = {
  component: "Scatterplot",
  family: "relationship",
  importPath: "semiotic/xy",
  requiresLiveData: true,
  rubric: { familiarity: 4, accuracy: 5, precision: 5 },

  fits: (schema) => {
    if (resolveStreamShape(schema) === "aggregate") {
      return "Scatterplot needs many rows — a single-row aggregate is one point"
    }
    if (pickMeasureFields(schema).length < 2) {
      return "needs two numeric measures to plot against each other"
    }
    if (streamThroughputBand(schema) === "high") {
      return "plots every event — for high-throughput streams, sample or aggregate upstream first"
    }
    return null
  },

  intentScores: {
    "correlation": 5,
    "outlier-detection": 3,
    "distribution": 2,
  },

  caveats: (schema) => [
    "push mode keeps the most recent 200 points; raise it with frameProps.windowSize",
    ...streamKeyedChangelogCaveat(schema, "pointIdAccessor"),
  ],

  buildProps: (schema) => {
    const [x, y] = pickMeasureFields(schema)
    const color = pickCategoryField(schema)
    return {
      xAccessor: x?.name,
      yAccessor: y?.name,
      ...(color ? { colorBy: color.name } : {}),
    }
  },
}
