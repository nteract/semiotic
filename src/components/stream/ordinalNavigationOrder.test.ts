import { describe, expect, it } from "vitest"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { buildNavGraph, nextGraphIndex, resolvePosition, extractOrdinalNavPoints } from "./keyboardNav"
import type { OrdinalPipelineConfig } from "./ordinalTypes"

function store(config: Partial<OrdinalPipelineConfig> = {}) {
  return new OrdinalPipelineStore({ chartType: "bar", windowSize: 100,
    windowMode: "sliding", extentPadding: 0.05, projection: "vertical", oAccessor: "step",
    rAccessor: "value", ...config })
}

describe("ordinal navigation domain order", () => {
  it("retains descending integer category names", () => {
    const pipeline = store()
    pipeline.ingest({ inserts: ["2024", "2023", "2022"].map(step => ({ step, value: 10 })), bounded: true })
    pipeline.computeScene({ width: 400, height: 300 })
    expect(extractOrdinalNavPoints(pipeline.scene).map(point => point.datum?.step)).toEqual(["2024", "2023", "2022"])
  })

  it.each(["funnel", "bar-funnel"] as const)("keeps overlapping category and step names in %s groups", (chartType) => {
    const pipeline = store({ chartType, stackBy: "category", projection: chartType === "funnel" ? "horizontal" : "vertical" })
    pipeline.ingest({ inserts: ["East", "Purchase"].flatMap(step => ["East", "West"].map(category => ({ step, category, value: step === "East" ? 100 : 50 }))), bounded: true })
    pipeline.computeScene({ width: 400, height: 300 })
    const marks = extractOrdinalNavPoints(pipeline.scene).filter(point => point.shape === "rect")
    expect(marks.filter(point => point.datum?.category === "East").map(point => point.group)).toEqual(["East", "East", ...(chartType === "bar-funnel" ? ["East"] : [])])
  })

  it("ranks radar data points before connectors without removing connectors", () => {
    const pipeline = store({ chartType: "point", projection: "radial", connectorAccessor: "series", connectorStyle: { stroke: "black", strokeWidth: 1 } })
    pipeline.ingest({ inserts: ["A", "B", "C"].map((step, index) => ({ step, value: index + 1, series: "S", id: step })), bounded: true })
    pipeline.computeScene({ width: 400, height: 300 })
    expect(pipeline.scene[0].type).toBe("connector")
    const points = extractOrdinalNavPoints(pipeline.scene)
    expect(pipeline.scales!.o.domain()).toEqual(["C", "B", "A"])
    expect(points.slice(0, 3).map(point => point.datum?.id)).toEqual(["C", "B", "A"])
    expect(points.slice(0, 3).every(point => point.shape === "circle")).toBe(true)
    expect(points.some(point => point.shape === "path")).toBe(true)
    const graph = buildNavGraph(points, true)
    const next = nextGraphIndex("ArrowRight", resolvePosition(graph, 0), graph)!
    expect(graph.flat[next].datum?.id).toBe("B")
  })
})
