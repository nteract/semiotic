import { describe, it, expect } from "vitest"
import {
  suggestStreamCharts,
  explainStreamCapabilityFit,
  registerStreamChartCapability,
  unregisterStreamChartCapability,
} from "./suggestStreamCharts"
import type { StreamSchema, StreamChartCapability } from "./streamingTypes"
import { registerIntent } from "./intents"

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

const keyedBrandStream: StreamSchema = {
  fields: [
    { name: "brand", kind: "categorical", role: "category" },
    { name: "revenue", kind: "numeric", role: "value" },
  ],
  shape: "keyed",
  retention: "cumulative",
}

const aggregateStream: StreamSchema = {
  fields: [{ name: "revenue", kind: "numeric", role: "value" }],
  shape: "aggregate",
}

describe("suggestStreamCharts", () => {
  it("recommends RealtimeLineChart for medium-throughput trend", () => {
    const { suggestions } = suggestStreamCharts(latencyStream, { intent: "trend" })
    expect(suggestions[0].component).toBe("RealtimeLineChart")
  })

  it("recommends RealtimeHeatmap / Waterfall for high throughput trend", () => {
    const { suggestions } = suggestStreamCharts(highVolumeStream, { intent: "trend" })
    expect(suggestions[0].component).not.toBe("RealtimeLineChart")
    expect(["RealtimeHeatmap", "RealtimeWaterfallChart"]).toContain(suggestions[0].component)
  })

  it("rejects RealtimeLineChart at high throughput, including numeric rates", () => {
    const { suggestions, excluded } = suggestStreamCharts(highVolumeStream)
    expect(suggestions.find((s) => s.component === "RealtimeLineChart")).toBeUndefined()
    expect(excluded.find((e) => e.component === "RealtimeLineChart")?.reason).toMatch(/high-throughput/)

    const numeric = suggestStreamCharts({ ...highVolumeStream, throughput: 250 })
    expect(numeric.suggestions.find((s) => s.component === "RealtimeLineChart")).toBeUndefined()
    expect(numeric.excluded.find((e) => e.component === "RealtimeLineChart")).toBeDefined()
  })

  it("recommends RealtimeHistogram for distribution", () => {
    const { suggestions } = suggestStreamCharts(latencyStream, { intent: "distribution" })
    expect(suggestions[0].component).toBe("RealtimeHistogram")
  })

  it("recommends RealtimeSwarmChart for outlier detection with categories", () => {
    const { suggestions } = suggestStreamCharts(pureValueStream, { intent: "outlier-detection" })
    expect(suggestions[0].component).toBe("RealtimeSwarmChart")
  })

  it("includes ready-to-use props", () => {
    const { suggestions } = suggestStreamCharts(latencyStream, { intent: "trend" })
    expect(suggestions[0].props.timeAccessor).toBe("ts")
    expect(suggestions[0].props.valueAccessor).toBe("latency_ms")
    expect(suggestions[0].requiresLiveData).toBe(true)
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
    const { suggestions } = suggestStreamCharts(cumulativeStream, { intent: "trend" })
    const line = suggestions.find((s) => s.component === "RealtimeLineChart")
    expect(line?.caveats.some((c) => c.includes("buffer") || c.includes("windowSize"))).toBe(true)
  })

  it("respects user-registered capabilities with a custom importPath", () => {
    const custom: StreamChartCapability = {
      component: "MyStreamChart",
      family: "custom",
      importPath: "@iris/charts",
      rubric: { familiarity: 1, accuracy: 5, precision: 5 },
      fits: () => null,
      intentScores: { "trend": 5 },
      buildProps: () => ({}),
    }
    registerStreamChartCapability(custom)
    try {
      const { suggestions } = suggestStreamCharts(latencyStream, { allow: ["MyStreamChart"] })
      expect(suggestions[0].component).toBe("MyStreamChart")
      expect(suggestions[0].importPath).toBe("@iris/charts")
    } finally {
      unregisterStreamChartCapability("MyStreamChart")
    }
  })

  it("composes registered intent scores for stream capabilities", () => {
    registerIntent({
      id: "stream-momentum-test",
      label: "Stream momentum",
      description: "Track sustained trends and abrupt changes.",
      composes: ["trend", "change-detection"],
    })

    const { suggestions } = suggestStreamCharts(latencyStream, {
      allow: ["RealtimeLineChart"],
      intent: "stream-momentum-test",
    })
    expect(suggestions[0].score).toBe(4.5)
    expect(suggestions[0].intentScores["stream-momentum-test"]).toBe(4.5)
  })

  it("recommends BarChart for a keyed category/measure schema", () => {
    const { suggestions, excluded } = suggestStreamCharts(keyedBrandStream, {
      intent: "compare-categories",
    })
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].component).toBe("BarChart")
    expect(suggestions[0].family).toBe("categorical")
    expect(suggestions[0].importPath).toBe("semiotic/ordinal")
    expect(suggestions[0].props.categoryAccessor).toBe("brand")
    expect(suggestions[0].props.valueAccessor).toBe("revenue")
    expect(excluded.some((e) => e.component === "RealtimeLineChart")).toBe(true)
  })

  it("recommends BigNumber / GaugeChart for a single-row aggregate", () => {
    const { suggestions } = suggestStreamCharts(aggregateStream, { intent: "part-to-whole" })
    expect(suggestions.map((s) => s.component)).toEqual(
      expect.arrayContaining(["BigNumber", "GaugeChart"]),
    )
    expect(suggestions.find((s) => s.component === "BarChart")).toBeUndefined()
    expect(suggestions[0].props).toMatchObject({ value: 0 })
  })

  it("prefers the value role over an id-like numeric column", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "ts", kind: "date" },
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric", role: "value" },
      ],
      throughput: "low",
    }
    const { suggestions } = suggestStreamCharts(schema, {
      allow: ["RealtimeLineChart"],
    })
    expect(suggestions[0].props.valueAccessor).toBe("latency_ms")
  })

  it("skips id-like names when no value role is set", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "ts", kind: "date" },
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric" },
      ],
      throughput: "low",
    }
    const { suggestions } = suggestStreamCharts(schema, {
      allow: ["RealtimeLineChart"],
    })
    expect(suggestions[0].props.valueAccessor).toBe("latency_ms")
  })

  it("applies audience bias and returns stretch suggestions", () => {
    const { suggestions, stretchSuggestions } = suggestStreamCharts(keyedBrandStream, {
      intent: "compare-categories",
      maxResults: 1,
      audience: {
        name: "Ops",
        familiarity: { BarChart: 5, PieChart: 2 },
        targets: {
          PieChart: { direction: "increase", weight: 2, reason: "grow share encodings" },
        },
        exposureLevel: 1,
      },
    })
    expect(suggestions[0].component).toBe("BarChart")
    expect(stretchSuggestions.some((s) => s.suggestion.component === "PieChart")).toBe(true)
  })

  it("honors a zero stretch budget", () => {
    const result = suggestStreamCharts(keyedBrandStream, {
      maxResults: 0, maxStretchResults: 0,
      audience: { familiarity: { PieChart: 2 } },
    })
    expect(result.stretchSuggestions).toEqual([])
  })

  it("explainStreamCapabilityFit returns the same excluded list", () => {
    const explained = explainStreamCapabilityFit(keyedBrandStream)
    expect(explained.excluded.length).toBeGreaterThan(0)
    expect(explained.excluded.find((e) => e.component === "RealtimeLineChart")?.reason).toMatch(/time/i)
    expect(explained.suggestions.some((s) => s.component === "BarChart")).toBe(true)
  })
})
