import { describe, it, expect } from "vitest"
import { suggestStreamDashboard } from "./suggestStreamDashboard"
import type { StreamSchema } from "./streamingTypes"

const latencyStream: StreamSchema = {
  fields: [
    { name: "ts", kind: "date" },
    { name: "latency_ms", kind: "numeric", role: "value" },
    { name: "endpoint", kind: "categorical", role: "category" },
  ],
  throughput: "medium",
}

const keyedBrandStream: StreamSchema = {
  fields: [
    { name: "brand", kind: "categorical", role: "category" },
    { name: "revenue", kind: "numeric", role: "value" },
  ],
  shape: "keyed",
}

describe("suggestStreamDashboard", () => {
  it("fills complementary intents from a time+category stream", () => {
    const dashboard = suggestStreamDashboard(latencyStream)
    expect(dashboard.panels.length).toBeGreaterThan(1)
    expect(dashboard.intentsCovered).toEqual(
      expect.arrayContaining(["trend", "compare-categories"]),
    )
    expect(dashboard.schemas).toHaveLength(1)
  })

  it("honors cell budget and lead families from the audience layout policy", () => {
    const dashboard = suggestStreamDashboard(keyedBrandStream, {
      audience: {
        name: "Exec",
        dashboard: {
          cellBudget: 2,
          leadFamilies: ["categorical"],
          windowPreference: "cumulative",
        },
      },
    })
    expect(dashboard.panels.length).toBeLessThanOrEqual(2)
    expect(dashboard.panels[0]?.suggestion.family).toBe("categorical")
    expect(dashboard.schemas[0].retention).toBe("cumulative")
  })

  it("respects an explicit budget over the audience policy", () => {
    const dashboard = suggestStreamDashboard(latencyStream, {
      budget: 1,
      audience: { dashboard: { cellBudget: 6 } },
    })
    expect(dashboard.panels).toHaveLength(1)
    expect(dashboard.intentsMissing.length).toBeGreaterThan(0)
  })

  it("ranks across every schema and records schemaIndex on each panel", () => {
    const dashboard = suggestStreamDashboard([latencyStream, keyedBrandStream], {
      budget: 4,
    })
    expect(dashboard.schemas).toHaveLength(2)
    expect(dashboard.panels.some((panel) => panel.schemaIndex === 0)).toBe(true)
    expect(dashboard.panels.some((panel) => panel.schemaIndex === 1)).toBe(true)
    const keyedPanel = dashboard.panels.find((panel) => panel.schemaIndex === 1)
    expect(keyedPanel?.suggestion.props.categoryAccessor).toBe("brand")
    const livePanel = dashboard.panels.find((panel) => panel.schemaIndex === 0)
    expect(livePanel?.suggestion.props.timeAccessor).toBe("ts")
  })
})
