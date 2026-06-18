import { afterEach, describe, it, expect, vi } from "vitest"
import { PipelineStore } from "./PipelineStore"
import type { LayoutContext } from "./customLayout"
import type { RectSceneNode, AreaSceneNode } from "./types"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("PipelineStore customLayout integration", () => {
  it("invokes customLayout instead of chart-type dispatch", () => {
    let invokedWith: LayoutContext | null = null
    const layout = (ctx: LayoutContext) => {
      invokedWith = ctx
      const node: RectSceneNode = {
        type: "rect",
        x: 1,
        y: 2,
        w: 3,
        h: 4,
        style: { fill: "#ff0" },
        datum: { tag: "from-layout" },
      }
      return { nodes: [node] }
    }
    const store = new PipelineStore({
      chartType: "custom",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      customLayout: layout,
      layoutConfig: { greeting: "hi" },
      layoutMargin: { top: 10, right: 20, bottom: 30, left: 40 },
    })
    store.ingest({ inserts: [{ x: 1, y: 2 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })

    expect(store.scene).toHaveLength(1)
    expect(store.scene[0].type).toBe("rect")
    expect(invokedWith).not.toBeNull()
    expect(invokedWith!.config).toEqual({ greeting: "hi" })
    expect(invokedWith!.dimensions.plot).toEqual({ x: 0, y: 0, width: 200, height: 100 })
    expect(invokedWith!.dimensions.margin).toEqual({ top: 10, right: 20, bottom: 30, left: 40 })
    expect(invokedWith!.scales).toBeTruthy()
    expect(typeof invokedWith!.resolveColor).toBe("function")
  })

  it("captures overlays returned by customLayout", () => {
    const sentinel = { _sentinel: true } as unknown as React.ReactNode
    const layout = () => ({ nodes: [], overlays: sentinel })
    const store = new PipelineStore({
      chartType: "custom",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      customLayout: layout,
    })
    store.ingest({ inserts: [{ x: 1, y: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    expect(store.customLayoutOverlays).toBe(sentinel)
  })

  it("warns when customLayout returns overlays without scene nodes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const sentinel = { _sentinel: true } as unknown as React.ReactNode
    const layout = () => ({ nodes: [], overlays: sentinel })
    const store = new PipelineStore({
      chartType: "custom",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      customLayout: layout,
    })
    store.ingest({ inserts: [{ x: 1, y: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("returned overlays but no data-bearing scene nodes"))
  })

  it("warns when customLayout scene nodes all have null datums", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const layout = () => ({
      nodes: [{
        type: "rect",
        x: 0,
        y: 0,
        w: 10,
        h: 10,
        style: { fill: "#000" },
        datum: null,
      } satisfies RectSceneNode],
    })
    const store = new PipelineStore({
      chartType: "custom",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      customLayout: layout,
    })
    store.ingest({ inserts: [{ x: 1, y: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("every scene-node datum is null"))
  })

  it("renders empty scene when layout throws", () => {
    const layout = () => { throw new Error("boom") }
    const store = new PipelineStore({
      chartType: "custom",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      customLayout: layout,
    })
    store.ingest({ inserts: [{ x: 1, y: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    expect(store.scene).toEqual([])
  })

  it("runs customLayout even with empty data", () => {
    let invoked = 0
    const layout = (ctx: LayoutContext) => {
      invoked++
      return {
        nodes: [
          {
            type: "rect",
            x: 0, y: 0,
            w: ctx.dimensions.plot.width,
            h: ctx.dimensions.plot.height,
            style: { fill: "#000" },
            datum: null,
          } satisfies RectSceneNode,
        ],
      }
    }
    const store = new PipelineStore({
      chartType: "custom",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      customLayout: layout,
    })
    store.ingest({ inserts: [], bounded: true })
    store.computeScene({ width: 50, height: 25 })

    expect(invoked).toBe(1)
    expect(store.scene).toHaveLength(1)
  })

  it("honors AreaSceneNode.clipRect (passes through scene)", () => {
    const layout = () => ({
      nodes: [
        {
          type: "area",
          topPath: [[0, 0], [10, 0]],
          bottomPath: [[0, 10], [10, 10]],
          style: { fill: "#abc" },
          datum: null,
          clipRect: { x: 1, y: 2, width: 3, height: 4 },
        } satisfies AreaSceneNode,
      ],
    })
    const store = new PipelineStore({
      chartType: "custom",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      customLayout: layout,
    })
    store.ingest({ inserts: [{ x: 1, y: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    const area = store.scene[0] as AreaSceneNode
    expect(area.clipRect).toEqual({ x: 1, y: 2, width: 3, height: 4 })
  })
})
