import { describe, expect, it } from "vitest"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { extractOrdinalNavPoints } from "./keyboardNav"
import type { OrdinalPipelineConfig, OrdinalSceneNode } from "./ordinalTypes"

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
    const scene = [
      { type: "connector", x1: 0, y1: 0, x2: 10, y2: 10, style: {}, datum: { id: "edge" }, group: "series" },
      { type: "point", x: 10, y: 10, datum: { id: "point" } }
    ] as OrdinalSceneNode[]
    expect(extractOrdinalNavPoints(scene).map(point => point.datum?.id)).toEqual(["point", "edge"])
  })
})
