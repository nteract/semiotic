import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "line",
    windowSize: 100,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

function ingestBounded(store: PipelineStore, data: Record<string, any>[]) {
  store.ingest({ inserts: data, bounded: true })
}

describe("PipelineStore — Resize Remap", () => {
  it("does full rebuild on first computeScene", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      xAccessor: "x",
      yAccessor: "y"
    }))
    ingestBounded(store, [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 }
    ])

    store.computeScene({ width: 200, height: 100 })
    expect(store.scene.length).toBeGreaterThan(0)
    expect(store.scales).not.toBeNull()

    const v1 = store.version
    expect(v1).toBeGreaterThan(0)
  })

  it("remaps coordinates on resize without data change", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      xAccessor: "x",
      yAccessor: "y"
    }))
    ingestBounded(store, [
      { x: 0, y: 0 },
      { x: 10, y: 10 }
    ])

    // First build at 200x100
    store.computeScene({ width: 200, height: 100 })
    const firstScene = store.scene.map(n => {
      if (n.type === "point") return { x: n.x, y: n.y }
      return null
    }).filter(Boolean)

    // Resize to 400x200 (2x)
    store.computeScene({ width: 400, height: 200 })
    const secondScene = store.scene.map(n => {
      if (n.type === "point") return { x: n.x, y: n.y }
      return null
    }).filter(Boolean)

    // Coordinates should scale proportionally
    for (let i = 0; i < firstScene.length; i++) {
      expect(secondScene[i]!.x).toBeCloseTo(firstScene[i]!.x * 2, 5)
      expect(secondScene[i]!.y).toBeCloseTo(firstScene[i]!.y * 2, 5)
    }
  })

  it("remaps line paths on resize", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y"
    }))
    ingestBounded(store, [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 10 }
    ])

    store.computeScene({ width: 100, height: 100 })
    const lineNode = store.scene.find(n => n.type === "line")
    expect(lineNode).toBeDefined()
    const origPath = lineNode!.type === "line"
      ? lineNode!.path.map(p => [...p])
      : []

    // Resize to 200x50
    store.computeScene({ width: 200, height: 50 })
    const resizedNode = store.scene.find(n => n.type === "line")
    expect(resizedNode).toBeDefined()
    if (resizedNode!.type === "line") {
      for (let i = 0; i < origPath.length; i++) {
        expect(resizedNode!.path[i][0]).toBeCloseTo(origPath[i][0] * 2, 5)
        expect(resizedNode!.path[i][1]).toBeCloseTo(origPath[i][1] * 0.5, 5)
      }
    }
  })

  it("does full rebuild after new data ingestion", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      xAccessor: "x",
      yAccessor: "y"
    }))
    ingestBounded(store, [{ x: 1, y: 1 }])
    store.computeScene({ width: 100, height: 100 })

    // Ingest new data — should trigger full rebuild
    ingestBounded(store, [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])
    store.computeScene({ width: 100, height: 100 })

    // Should have 3 points now
    const points = store.scene.filter(n => n.type === "point")
    expect(points.length).toBe(3)
  })

  it("does full rebuild after config update", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      xAccessor: "x",
      yAccessor: "y"
    }))
    ingestBounded(store, [{ x: 1, y: 1 }, { x: 5, y: 5 }])
    store.computeScene({ width: 100, height: 100 })

    // Update config — should force full rebuild even with same layout
    store.updateConfig({ extentPadding: 0.5 })
    store.computeScene({ width: 100, height: 100 })

    // Should still work (no crash)
    expect(store.scene.length).toBeGreaterThan(0)
  })

  it("updates scales on remap", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y"
    }))
    ingestBounded(store, [{ x: 0, y: 0 }, { x: 10, y: 10 }])

    store.computeScene({ width: 100, height: 100 })
    const origXRange = store.scales!.x.range()

    // Resize
    store.computeScene({ width: 300, height: 150 })
    const newXRange = store.scales!.x.range()

    expect(newXRange[1]).toBeCloseTo(origXRange[1] * 3, 5)
  })

  it("does full rebuild after clear", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      xAccessor: "x",
      yAccessor: "y"
    }))
    ingestBounded(store, [{ x: 1, y: 1 }])
    store.computeScene({ width: 100, height: 100 })

    store.clear()
    ingestBounded(store, [{ x: 2, y: 2 }, { x: 3, y: 3 }])
    store.computeScene({ width: 100, height: 100 })

    const points = store.scene.filter(n => n.type === "point")
    expect(points.length).toBe(2)
  })
})
