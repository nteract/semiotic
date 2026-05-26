import { describe, it, expect } from "vitest"
import { suggestStreamCharts, registerStreamChartCapability, unregisterStreamChartCapability } from "./suggestStreamCharts"
import type { StreamSchema, StreamChartCapability } from "./streamingTypes"

const latencyStream: StreamSchema = {
  fields: [
    { name: "ts", kind: "date" },
    { name: "latency_ms", kind: "numeric" },
    { name: "endpoint", kind: "categorical" },
  ],
  throughput: "medium",
  retention: "windowed",
}

const highVolumeStream: StreamSchema = {
  fields: [
    { name: "ts", kind: "date" },
    { name: "value", kind: "numeric" },
  ],
  throughput: "high",
  retention: "windowed",
}

const pureValueStream: StreamSchema = {
  fields: [
    { name: "ts", kind: "date" },
    { name: "value", kind: "numeric" },
    { name: "cohort", kind: "categorical" },
  ],
}

describe("suggestStreamCharts", () => {
  it("recommends RealtimeLineChart for medium-throughput trend", () => {
    const suggestions = suggestStreamCharts(latencyStream, { intent: "trend" })
    expect(suggestions[0].component).toBe("RealtimeLineChart")
  })

  it("recommends RealtimeHeatmap / Waterfall for high throughput trend", () => {
    const suggestions = suggestStreamCharts(highVolumeStream, { intent: "trend" })
    expect(suggestions[0].component).not.toBe("RealtimeLineChart")
    expect(["RealtimeHeatmap", "RealtimeWaterfallChart"]).toContain(suggestions[0].component)
  })

  it("rejects RealtimeLineChart at high throughput", () => {
    const suggestions = suggestStreamCharts(highVolumeStream)
    expect(suggestions.find((s) => s.component === "RealtimeLineChart")).toBeUndefined()
  })

  it("recommends RealtimeHistogram for distribution", () => {
    const suggestions = suggestStreamCharts(latencyStream, { intent: "distribution" })
    expect(suggestions[0].component).toBe("RealtimeHistogram")
  })

  it("recommends RealtimeSwarmChart for outlier detection with categories", () => {
    const suggestions = suggestStreamCharts(pureValueStream, { intent: "outlier-detection" })
    expect(suggestions[0].component).toBe("RealtimeSwarmChart")
  })

  it("includes ready-to-use props", () => {
    // Realtime charts use timeAccessor / valueAccessor (not xAccessor / yAccessor).
    // The recommender's output must be spreadable directly into the chart.
    const suggestions = suggestStreamCharts(latencyStream, { intent: "trend" })
    expect(suggestions[0].props.timeAccessor).toBe("ts")
    expect(suggestions[0].props.valueAccessor).toBe("latency_ms")
  })

  it("surfaces cumulative-retention caveat for line chart", () => {
    const cumulativeStream: StreamSchema = {
      fields: [
        { name: "ts", kind: "date" },
        { name: "value", kind: "numeric" },
      ],
      throughput: "low",
      retention: "cumulative",
    }
    const suggestions = suggestStreamCharts(cumulativeStream, { intent: "trend" })
    const line = suggestions.find((s) => s.component === "RealtimeLineChart")
    expect(line?.caveats.some((c) => c.includes("buffer") || c.includes("windowSize"))).toBe(true)
  })

  it("respects user-registered capabilities", () => {
    const custom: StreamChartCapability = {
      component: "MyStreamChart",
      importPath: "semiotic/realtime",
      rubric: { familiarity: 1, accuracy: 5, precision: 5 },
      fits: () => null,
      intentScores: { "trend": 5 },
      buildProps: () => ({}),
    }
    registerStreamChartCapability(custom)
    try {
      const suggestions = suggestStreamCharts(latencyStream, { allow: ["MyStreamChart"] })
      expect(suggestions[0].component).toBe("MyStreamChart")
    } finally {
      unregisterStreamChartCapability("MyStreamChart")
    }
  })
})
