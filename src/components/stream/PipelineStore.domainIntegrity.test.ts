import "../../test-utils/registerBuiltInXYPlugins"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function config(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    runtimeMode: "bounded",
    windowSize: 200,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0,
    xAccessor: "x",
    yAccessor: "y",
    ...overrides,
  }
}

function yDomain(store: PipelineStore): [number, number] {
  return store.scales!.y.domain() as [number, number]
}

function xDomain(store: PipelineStore): [number, number] {
  return (store.scales!.x.domain() as Array<number | Date>).map(Number) as [number, number]
}

describe("PipelineStore domain integrity", () => {
  afterEach(() => vi.restoreAllMocks())

  it("includes a negative stacked-area cursor and keeps an all-positive stack on zero", () => {
    const negative = new PipelineStore(config({
      chartType: "stackedarea",
      extentPadding: 0.1,
      baseline: "zero",
      stackOrder: "key",
      groupAccessor: "g",
    }))
    negative.ingest({
      inserts: [
        { x: 0, g: "a", y: -5 },
        { x: 0, g: "b", y: 10 },
      ],
      bounded: true,
    })
    negative.computeScene({ width: 400, height: 200 })
    expect(yDomain(negative)).toEqual([-6, 6])

    const positive = new PipelineStore(config({
      chartType: "stackedarea",
      extentPadding: 0.1,
      baseline: "zero",
      stackOrder: "key",
      groupAccessor: "g",
    }))
    positive.ingest({
      inserts: [
        { x: 0, g: "a", y: 4 },
        { x: 0, g: "b", y: 6 },
      ],
      bounded: true,
    })
    positive.computeScene({ width: 400, height: 200 })
    expect(yDomain(positive)).toEqual([0, 11])
  })

  it("follows stack input order when a later negative layer never crosses zero", () => {
    const store = new PipelineStore(config({
      chartType: "stackedarea",
      extentPadding: 0.1,
      baseline: "zero",
      stackOrder: "input",
      groupAccessor: "g",
    }))
    store.ingest({
      inserts: [
        { x: 0, g: "b", y: 10 },
        { x: 0, g: "a", y: -5 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([0, 11])
  })

  it("pads an all-zero stack to [0, 1]", () => {
    const store = new PipelineStore(config({
      chartType: "stackedarea",
      baseline: "zero",
      groupAccessor: "g",
    }))
    store.ingest({
      inserts: [
        { x: 0, g: "a", y: 0 },
        { x: 0, g: "b", y: 0 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([0, 1])
  })

  it("includes a negative bar bin and the separate category sums", () => {
    const unstacked = new PipelineStore(config({
      chartType: "bar",
      binSize: 10,
    }))
    unstacked.ingest({
      inserts: [{ x: 1, y: -4 }],
      bounded: true,
    })
    unstacked.computeScene({ width: 400, height: 200 })
    expect(yDomain(unstacked)).toEqual([-4, 0])

    const stacked = new PipelineStore(config({
      chartType: "bar",
      binSize: 10,
      categoryAccessor: "cat",
    }))
    stacked.ingest({
      inserts: [
        { x: 1, y: -5, cat: "a" },
        { x: 2, y: 10, cat: "b" },
      ],
      bounded: true,
    })
    stacked.computeScene({ width: 400, height: 200 })
    expect(yDomain(stacked)).toEqual([-5, 10])
  })

  it("starts a log scale at the smallest positive value", () => {
    const store = new PipelineStore(config({
      yScaleType: "log",
    }))
    store.ingest({
      inserts: [
        { x: 1, y: 0 },
        { x: 2, y: 100 },
        { x: 3, y: 1000 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([100, 1000])
  })

  it("keeps a positive log domain below 1e-6", () => {
    const store = new PipelineStore(config({ yScaleType: "log" }))
    store.ingest({
      inserts: [
        { x: 1, y: 1e-8 },
        { x: 2, y: 1e-4 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([1e-8, 1e-4])
  })

  it("keeps an inverted log domain inverted around the smallest positive value", () => {
    const store = new PipelineStore(config({
      yScaleType: "log",
      invertY: true,
    }))
    store.ingest({
      inserts: [
        { x: 1, y: 0 },
        { x: 2, y: 2 },
        { x: 3, y: 11 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([11, 2])
  })

  it("clamps a log x scale the same way and warns once per axis", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const store = new PipelineStore(config({
      xScaleType: "log",
      yScaleType: "log",
    }))
    store.ingest({
      inserts: [
        { x: 0, y: -2 },
        { x: 4, y: 8 },
        { x: 16, y: 32 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    store.computeScene({ width: 400, height: 200 })
    expect(xDomain(store)).toEqual([4, 16])
    expect(yDomain(store)).toEqual([8, 32])
    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages.filter((message) => message.includes("log x scale"))).toHaveLength(1)
    expect(messages.filter((message) => message.includes("log y scale"))).toHaveLength(1)
  })

  it("uses one positive decade when a log scale has no positive data", () => {
    const store = new PipelineStore(config({ yScaleType: "log" }))
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([1, 10])
  })

  it("uses one decade when padding leaves a positive end and no positive sample", () => {
    const store = new PipelineStore(config({
      yScaleType: "log",
      extentPadding: 0.1,
    }))
    store.ingest({
      inserts: [
        { x: 0, y: -1000 },
        { x: 1, y: 0 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([1, 10])
  })

  it("keeps a non-positive point and clamps it to the positive edge", () => {
    const store = new PipelineStore(config({ yScaleType: "log" }))
    store.ingest({
      inserts: [
        { x: 0, y: 0 },
        { x: 1, y: 100 },
        { x: 2, y: 1000 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const points = store.scene.flatMap((node) => node.type === "point" ? [node] : [])
    const zero = points.find((node) => (node.datum as { y: number }).y === 0)
    const hundred = points.find((node) => (node.datum as { y: number }).y === 100)
    expect(zero).toBeTruthy()
    expect(hundred).toBeTruthy()
    expect(zero!.y).toBeCloseTo(hundred!.y)
    expect(yDomain(store)).toEqual([100, 1000])
  })

  it("derives a log bar domain from bin totals", () => {
    const store = new PipelineStore(config({
      chartType: "bar",
      binSize: 10,
      yScaleType: "log",
    }))
    store.ingest({
      inserts: [
        { x: 0, y: -9 },
        { x: 1, y: 10 },
        { x: 10, y: 10 },
        { x: 20, y: 100 },
        { x: 29, y: 0 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([1, 100])
    const bars = store.scene.flatMap((node) => node.type === "rect" ? [node] : [])
    const bar = (total: number) => bars.find((node) =>
      (node.datum as { total: number }).total === total
    )
    expect(bar(1)!.h).toBeCloseTo(0)
    expect(bar(10)!.h).toBeCloseTo(100)
    expect(bar(100)!.h).toBeCloseTo(200)
  })

  it("derives a log stacked-area domain from stack boundaries", () => {
    const store = new PipelineStore(config({
      chartType: "stackedarea",
      yScaleType: "log",
      baseline: "zero",
      stackOrder: "key",
      groupAccessor: "g",
    }))
    store.ingest({
      inserts: [
        { x: 0, g: "a", y: 20 },
        { x: 0, g: "b", y: -15 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    expect(yDomain(store)).toEqual([5, 20])
  })

  it("recalculates extents after eviction without waiting for computeScene", () => {
    const store = new PipelineStore(config({ pointIdAccessor: "id" }))
    store.ingest({
      inserts: [
        { id: "a", x: 1, y: 10 },
        { id: "b", x: 5, y: 50 },
        { id: "c", x: 3, y: 30 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 200, height: 100 })
    store.remove("b")
    expect(store.getExtents()).toEqual({ x: [1, 3], y: [10, 30] })
    store.remove("a")
    expect(store.getExtents()).toEqual({ x: [3, 3], y: [30, 30] })
  })
})
