import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "bar",
    runtimeMode: "streaming",
    windowSize: 200,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    binSize: 10,
    timeAccessor: "time",
    valueAccessor: "value",
    ...overrides
  }
}

describe("PipelineStore — Bar category cache", () => {
  it("renders all categories even when they appear after the first scene build", () => {
    const store = new PipelineStore(makeConfig({
      categoryAccessor: "category",
      barColors: { errors: "#ef4444", warnings: "#f97316", info: "#6366f1" }
    }))

    // First ingest: only "errors" category
    store.ingest({
      inserts: [
        { time: 1, value: 5, category: "errors" },
        { time: 2, value: 3, category: "errors" },
      ],
      bounded: false
    })
    store.computeScene({ width: 400, height: 300 })

    const firstScene = store.scene.filter(n => n.type === "rect")
    // Only errors bars should exist
    const firstGroups = new Set(firstScene.map(n => (n as any).group))
    expect(firstGroups.has("errors")).toBe(true)
    expect(firstGroups.has("warnings")).toBe(false)

    // Second ingest: add warnings and info
    store.ingest({
      inserts: [
        { time: 3, value: 10, category: "warnings" },
        { time: 4, value: 15, category: "info" },
        { time: 5, value: 7, category: "errors" },
        { time: 6, value: 12, category: "warnings" },
        { time: 7, value: 8, category: "info" },
      ],
      bounded: false
    })
    store.computeScene({ width: 400, height: 300 })

    const secondScene = store.scene.filter(n => n.type === "rect")
    const secondGroups = new Set(secondScene.map(n => (n as any).group))

    // All three categories must now render
    expect(secondGroups.has("errors")).toBe(true)
    expect(secondGroups.has("warnings")).toBe(true)
    expect(secondGroups.has("info")).toBe(true)
  })

  it("renders categories without barColors", () => {
    const store = new PipelineStore(makeConfig({
      categoryAccessor: "category"
    }))

    store.ingest({
      inserts: [
        { time: 1, value: 5, category: "A" },
        { time: 2, value: 3, category: "B" },
      ],
      bounded: false
    })
    store.computeScene({ width: 400, height: 300 })

    const groups = new Set(store.scene.filter(n => n.type === "rect").map(n => (n as any).group))
    expect(groups.has("A")).toBe(true)
    expect(groups.has("B")).toBe(true)
  })
})
