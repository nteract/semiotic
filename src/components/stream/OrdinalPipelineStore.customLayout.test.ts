import { describe, it, expect } from "vitest"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"
import type { OrdinalLayoutContext } from "./ordinalCustomLayout"
import type { RectSceneNode } from "./types"

function baseConfig(extra: Partial<OrdinalPipelineConfig> = {}): OrdinalPipelineConfig {
  return {
    chartType: "custom",
    runtimeMode: "bounded",
    windowSize: 100,
    windowMode: "sliding",
    extentPadding: 0,
    projection: "vertical",
    categoryAccessor: "category",
    valueAccessor: "value",
    ...extra,
  }
}

describe("OrdinalPipelineStore customLayout", () => {
  it("invokes customLayout instead of chart-type dispatch", () => {
    let captured: OrdinalLayoutContext | null = null
    const layout = (ctx: OrdinalLayoutContext) => {
      captured = ctx
      return {
        nodes: [{
          type: "rect",
          x: 0, y: 0, w: 10, h: 20,
          style: { fill: "#fff" },
          datum: null,
        } satisfies RectSceneNode],
      }
    }
    const store = new OrdinalPipelineStore(baseConfig({
      customLayout: layout,
      layoutConfig: { greeting: "hi" },
    }))
    store.ingest({
      inserts: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
      bounded: true,
    })
    store.computeScene({ width: 200, height: 100 })

    expect(store.scene).toHaveLength(1)
    expect(store.scene[0].type).toBe("rect")
    expect(captured).not.toBeNull()
    expect(captured!.config).toEqual({ greeting: "hi" })
    expect(captured!.dimensions.plot).toEqual({ x: 0, y: 0, width: 200, height: 100 })
    expect(typeof captured!.resolveColor).toBe("function")
    expect(captured!.scales.o).toBeTypeOf("function")
    expect(captured!.scales.r).toBeTypeOf("function")
  })

  it("captures overlays returned by customLayout", () => {
    const sentinel = { _sentinel: true } as unknown as React.ReactNode
    const layout = () => ({ nodes: [], overlays: sentinel })
    const store = new OrdinalPipelineStore(baseConfig({ customLayout: layout }))
    store.ingest({ inserts: [{ category: "A", value: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    expect(store.customLayoutOverlays).toBe(sentinel)
  })

  it("clears overlays when customLayout is removed", () => {
    const layout = () => ({
      nodes: [],
      overlays: { _sentinel: true } as unknown as React.ReactNode,
    })
    const store = new OrdinalPipelineStore(baseConfig({ customLayout: layout }))
    store.ingest({ inserts: [{ category: "A", value: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })
    expect(store.customLayoutOverlays).not.toBeNull()

    store.updateConfig({ ...baseConfig({ chartType: "bar" }), customLayout: undefined })
    store.computeScene({ width: 100, height: 100 })
    expect(store.customLayoutOverlays).toBeNull()
  })

  it("renders empty scene when layout throws", () => {
    const layout = () => { throw new Error("boom") }
    const store = new OrdinalPipelineStore(baseConfig({ customLayout: layout }))
    store.ingest({ inserts: [{ category: "A", value: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    expect(store.scene).toEqual([])
  })

  it("resolveColor honors named d3 schemes (e.g. tableau10)", () => {
    let resolveColor: ((k: string) => string) | null = null
    const layout = (ctx: OrdinalLayoutContext) => {
      resolveColor = ctx.resolveColor
      return { nodes: [] }
    }
    const store = new OrdinalPipelineStore(baseConfig({
      customLayout: layout,
      colorScheme: "tableau10",
    }))
    store.ingest({ inserts: [{ category: "A", value: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    const colors = ["alpha", "beta", "gamma"].map((k) => resolveColor!(k))
    const tableau10 = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"]
    expect(colors.some((c) => tableau10.includes(c))).toBe(true)
  })

  it("ctx.data matches what scene builders see (passed through, not re-fetched)", () => {
    // Regression: buildLayoutContext used to call `this.buffer.toArray()`
    // independently, which would diverge from the data the scene
    // builders are dispatched with (e.g. when multiAxis expansion runs
    // before scene dispatch). Verify ctx.data is whatever buildSceneNodes
    // received.
    let captured: unknown[] = []
    const layout = (ctx: OrdinalLayoutContext) => {
      captured = ctx.data
      return { nodes: [] }
    }
    const inputs = [
      { category: "P", value: 1 },
      { category: "Q", value: 2 },
      { category: "R", value: 3 },
    ]
    const store = new OrdinalPipelineStore(baseConfig({ customLayout: layout }))
    store.ingest({ inserts: inputs, bounded: true })
    store.computeScene({ width: 200, height: 100 })

    expect(captured).toHaveLength(3)
    expect(captured.map((d) => (d as { category: string }).category).sort())
      .toEqual(["P", "Q", "R"])
  })

  it("radial projection: plot rect is center-anchored", () => {
    // Regression: the canvas context is center-translated for radial
    // projections, so dimensions.plot must describe a center-origin
    // coord space (top-left of visible plot at (-w/2, -h/2)) instead
    // of always returning {0, 0, w, h}.
    let captured: { x: number; y: number; width: number; height: number } | null = null
    const layout = (ctx: OrdinalLayoutContext) => {
      captured = ctx.dimensions.plot
      return { nodes: [] }
    }
    const store = new OrdinalPipelineStore(baseConfig({
      customLayout: layout,
      projection: "radial",
    }))
    store.ingest({ inserts: [{ category: "A", value: 1 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })

    expect(captured).toEqual({ x: -100, y: -50, width: 200, height: 100 })
  })

  it("vertical projection: plot rect is top-left-anchored", () => {
    let captured: { x: number; y: number; width: number; height: number } | null = null
    const layout = (ctx: OrdinalLayoutContext) => {
      captured = ctx.dimensions.plot
      return { nodes: [] }
    }
    const store = new OrdinalPipelineStore(baseConfig({
      customLayout: layout,
      projection: "vertical",
    }))
    store.ingest({ inserts: [{ category: "A", value: 1 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })

    expect(captured).toEqual({ x: 0, y: 0, width: 200, height: 100 })
  })

  it("o-scale domain reflects ingested categories", () => {
    let domain: string[] = []
    const layout = (ctx: OrdinalLayoutContext) => {
      domain = ctx.scales.o.domain()
      return { nodes: [] }
    }
    const store = new OrdinalPipelineStore(baseConfig({ customLayout: layout }))
    store.ingest({
      inserts: [
        { category: "X", value: 1 },
        { category: "Y", value: 2 },
        { category: "Z", value: 3 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 200, height: 100 })

    expect(new Set(domain)).toEqual(new Set(["X", "Y", "Z"]))
  })
})
