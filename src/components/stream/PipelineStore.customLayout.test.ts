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

  it("re-runs the layout (regenerating overlays) on a dimension-only change", () => {
    // Regression: a dimension-only change must NOT take computeScene's fast
    // remap path for custom layouts. remapScene only proportionally rescales
    // scene nodes and never regenerates customLayoutOverlays, so the overlay
    // glyphs would freeze at the previous width while the canvas scene nodes
    // moved — the "flowers offset from their stems until any other change"
    // bug on the GoFish flower demo (responsive resize).
    let invocations = 0
    const layout = (ctx: LayoutContext) => {
      invocations++
      const w = ctx.dimensions.plot.width
      const node: RectSceneNode = {
        type: "rect",
        // A fixed pixel offset that a proportional remap would get wrong.
        x: w - 24,
        y: 0,
        w: 4,
        h: 10,
        style: { fill: "#0f0" },
        datum: { tag: "stem" },
      }
      // Overlay encodes the width it was solved at so we can detect staleness.
      return { nodes: [node], overlays: { _solvedWidth: w } as unknown as React.ReactNode }
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
    store.ingest({ inserts: [{ x: 1, y: 1 }], bounded: true })

    store.computeScene({ width: 200, height: 100 })
    expect(invocations).toBe(1)
    expect((store.customLayoutOverlays as unknown as { _solvedWidth: number })._solvedWidth).toBe(200)
    expect((store.scene[0] as RectSceneNode).x).toBe(200 - 24)

    // Dimension-only change: the layout must run again at the new width.
    store.computeScene({ width: 400, height: 100 })
    expect(invocations).toBe(2)
    expect((store.customLayoutOverlays as unknown as { _solvedWidth: number })._solvedWidth).toBe(400)
    // Scene node honors the fixed offset at the new width — not a 2× remap.
    expect((store.scene[0] as RectSceneNode).x).toBe(400 - 24)
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

describe("PipelineStore custom-layout restyle + selection channel", () => {
  type Sel = { isActive: boolean; predicate: (d: { id?: string }) => boolean }
  const dimRestyle = (node: { datum: unknown }, selection: Sel | null) =>
    selection?.isActive && !selection.predicate(node.datum as { id?: string }) ? { opacity: 0.1 } : { opacity: 1 }

  function makeStore(opts: { restyle?: typeof dimRestyle; layoutSelection?: Sel } = {}) {
    let capturedSel: unknown
    const layout = (ctx: LayoutContext) => {
      capturedSel = ctx.selection
      return {
        nodes: ctx.data.map((d, i) => ({
          type: "point" as const, x: i * 10, y: 0, r: 4, style: { fill: "#abc", opacity: 1 }, datum: d, pointId: String(d.id),
        })),
        ...(opts.restyle && { restyle: opts.restyle }),
      }
    }
    const store = new PipelineStore({
      chartType: "custom", windowSize: 100, windowMode: "sliding", arrowOfTime: "right", extentPadding: 0,
      xAccessor: "x", yAccessor: "y", customLayout: layout,
      ...(opts.layoutSelection && { layoutSelection: opts.layoutSelection as never }),
    })
    store.ingest({ inserts: [{ id: "a", x: 0, y: 0 }, { id: "b", x: 1, y: 0 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })
    return { store, getCapturedSel: () => capturedSel }
  }

  it("threads ctx.selection into the layout", () => {
    const sel: Sel = { isActive: true, predicate: (d) => d.id === "a" }
    const { getCapturedSel } = makeStore({ layoutSelection: sel })
    expect(getCapturedSel()).toEqual(sel)
  })

  it("flags hasCustomRestyle and restyleScene mutates styles off base (no compounding)", () => {
    const { store } = makeStore({ restyle: dimRestyle })
    expect(store.hasCustomRestyle).toBe(true)
    store.restyleScene({ isActive: true, predicate: (d: { id?: string }) => d.id === "a" })
    const byId = new Map(store.scene.map((n) => [(n.datum as { id: string }).id, n]))
    expect(byId.get("a")!.style.opacity).toBe(1)
    expect(byId.get("b")!.style.opacity).toBe(0.1)
    // Re-restyle off base — not compounded.
    store.restyleScene({ isActive: true, predicate: (d: { id?: string }) => d.id === "b" })
    expect(byId.get("a")!.style.opacity).toBe(0.1)
    expect(byId.get("b")!.style.opacity).toBe(1)
    expect(byId.get("a")!.style.fill).toBe("#abc")
  })

  it("hasCustomRestyle is false (and restyleScene a no-op) without a restyle callback", () => {
    const { store } = makeStore()
    expect(store.hasCustomRestyle).toBe(false)
    const before = store.scene[0].style.opacity
    store.restyleScene({ isActive: true, predicate: () => false })
    expect(store.scene[0].style.opacity).toBe(before)
  })
})
