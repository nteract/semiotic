import type { StreamChartCapability } from "../../ai/streamingTypes"

export const RealtimeSwarmChartCapability: StreamChartCapability = {
  component: "RealtimeSwarmChart",
  importPath: "semiotic/realtime",
  rubric: { familiarity: 2, accuracy: 4, precision: 4 },

  fits: (schema) => {
    if (!schema.fields.some((f) => f.kind === "date" || f.role === "x")) {
      return "needs a time field (points are placed at (time, value))"
    }
    if (!schema.fields.some((f) => f.kind === "numeric" || f.role === "value")) {
      return "needs a numeric field"
    }
    if (!schema.fields.some((f) => f.kind === "categorical" || f.role === "category")) {
      return "needs a category to swarm by"
    }
    return null
  },

  intentScores: {
    "outlier-detection": 5,
    "distribution": 4,
    "compare-categories": 3,
  },

  caveats: (schema) => (schema.throughput === "high" ? ["high-throughput swarms get crowded — consider RealtimeHistogram"] : []),

  buildProps: (schema) => {
    const timeField = schema.fields.find((f) => f.role === "x" || f.kind === "date")?.name
    const valueField = schema.fields.find((f) => f.role === "value" || f.kind === "numeric")?.name
    const categoryField = schema.fields.find((f) => f.role === "category" || f.kind === "categorical")?.name
    return {
      timeAccessor: timeField,
      valueAccessor: valueField,
      categoryAccessor: categoryField,
    }
  },
}
