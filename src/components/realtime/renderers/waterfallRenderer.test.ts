import { waterfallRenderer, computeWaterfallExtent } from "./waterfallRenderer"
import type { RealtimeScales, RealtimeLayout, LineStyle, RealtimeAccessors } from "../types"
import { scaleLinear } from "d3-scale"

function makeCtx() {
  return {
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    clearRect: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    setLineDash: jest.fn(),
    strokeStyle: "",
    lineWidth: 1,
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: ""
  } as unknown as CanvasRenderingContext2D
}

const getTime = (d: any) => d.time
const getValue = (d: any) => d.value
const accessors: RealtimeAccessors = { time: getTime, value: getValue }

function makeScales(timeAxis: "x" | "y"): RealtimeScales {
  if (timeAxis === "x") {
    return {
      time: scaleLinear().domain([0, 100]).range([0, 400]),
      value: scaleLinear().domain([-50, 50]).range([200, 0])
    }
  }
  return {
    time: scaleLinear().domain([0, 100]).range([0, 200]),
    value: scaleLinear().domain([-50, 50]).range([0, 400])
  }
}

const layoutX: RealtimeLayout = { width: 400, height: 200, timeAxis: "x" }
const layoutY: RealtimeLayout = { width: 400, height: 200, timeAxis: "y" }
const style: LineStyle = {}

describe("computeWaterfallExtent", () => {
  it("returns [0, 0] for empty data", () => {
    expect(computeWaterfallExtent([], getValue)).toEqual([0, 0])
  })

  it("tracks cumulative positive values", () => {
    const data = [{ value: 10 }, { value: 20 }, { value: 5 }]
    expect(computeWaterfallExtent(data, getValue)).toEqual([0, 35])
  })

  it("tracks cumulative with negatives", () => {
    const data = [{ value: 10 }, { value: -15 }, { value: 20 }]
    // cumulative: 10, -5, 15 → min=-5, max=15
    expect(computeWaterfallExtent(data, getValue)).toEqual([-5, 15])
  })

  it("skips NaN values", () => {
    const data = [{ value: 10 }, { value: NaN }, { value: 5 }]
    expect(computeWaterfallExtent(data, getValue)).toEqual([0, 15])
  })

  it("skips null values", () => {
    const data = [{ value: 10 }, { value: null }, { value: 5 }]
    expect(computeWaterfallExtent(data, getValue)).toEqual([0, 15])
  })
})

describe("waterfallRenderer", () => {
  it("draws nothing for empty data", () => {
    const ctx = makeCtx()
    waterfallRenderer(ctx, [], makeScales("x"), layoutX, style, accessors, undefined, { waterfallStyle: {} })
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(0)
  })

  it("draws a single positive delta bar above baseline", () => {
    const ctx = makeCtx()
    const data = [{ time: 0, value: 10 }]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, { waterfallStyle: {} })

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(1)
    const [x, y, w, h] = (ctx.fillRect as jest.Mock).mock.calls[0]
    // Bar from baseline (0) to cumulative (10): y should be above the baseline
    const yBaseline = makeScales("x").value(0)
    const yTop = makeScales("x").value(10)
    expect(y).toBeCloseTo(Math.min(yBaseline, yTop), 1)
    expect(h).toBeCloseTo(Math.abs(yBaseline - yTop), 1)
  })

  it("draws a single negative delta bar below baseline", () => {
    const ctx = makeCtx()
    const data = [{ time: 0, value: -10 }]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, { waterfallStyle: {} })

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(1)
    const [x, y, w, h] = (ctx.fillRect as jest.Mock).mock.calls[0]
    const yBaseline = makeScales("x").value(0)
    const yBottom = makeScales("x").value(-10)
    expect(y).toBeCloseTo(Math.min(yBaseline, yBottom), 1)
    expect(h).toBeCloseTo(Math.abs(yBaseline - yBottom), 1)
  })

  it("positions bars cumulatively", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: 20 },
      { time: 20, value: -5 }
    ]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, { waterfallStyle: {} })

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(3)

    const scales = makeScales("x")

    // Bar 0: baseline=0, cumEnd=10
    const [, y0, , h0] = (ctx.fillRect as jest.Mock).mock.calls[0]
    expect(y0).toBeCloseTo(Math.min(scales.value(0), scales.value(10)), 1)
    expect(h0).toBeCloseTo(Math.abs(scales.value(0) - scales.value(10)), 1)

    // Bar 1: baseline=10, cumEnd=30
    const [, y1, , h1] = (ctx.fillRect as jest.Mock).mock.calls[1]
    expect(y1).toBeCloseTo(Math.min(scales.value(10), scales.value(30)), 1)
    expect(h1).toBeCloseTo(Math.abs(scales.value(10) - scales.value(30)), 1)

    // Bar 2: baseline=30, cumEnd=25 (negative delta)
    const [, y2, , h2] = (ctx.fillRect as jest.Mock).mock.calls[2]
    expect(y2).toBeCloseTo(Math.min(scales.value(30), scales.value(25)), 1)
    expect(h2).toBeCloseTo(Math.abs(scales.value(30) - scales.value(25)), 1)
  })

  it("uses correct colors for positive vs negative deltas", () => {
    const ctx = makeCtx()
    const fillStyles: string[] = []
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyles.push(v) },
      get() { return fillStyles[fillStyles.length - 1] || "" }
    })

    const data = [
      { time: 0, value: 10 },
      { time: 10, value: -5 }
    ]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, { waterfallStyle: {} })

    // Default colors: positive = "#28a745", negative = "#dc3545"
    // fillStyle is set before each fillRect call
    expect(fillStyles).toContain("#28a745")
    expect(fillStyles).toContain("#dc3545")
  })

  it("uses custom waterfallStyle colors", () => {
    const ctx = makeCtx()
    const fillStyles: string[] = []
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyles.push(v) },
      get() { return fillStyles[fillStyles.length - 1] || "" }
    })

    const data = [
      { time: 0, value: 10 },
      { time: 10, value: -5 }
    ]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, {
      waterfallStyle: { positiveColor: "blue", negativeColor: "orange" }
    })

    expect(fillStyles).toContain("blue")
    expect(fillStyles).toContain("orange")
  })

  it("draws connector lines when connectorStroke is set", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: 20 },
      { time: 20, value: -5 }
    ]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, {
      waterfallStyle: { connectorStroke: "#999" }
    })

    // Connectors drawn for bar 1 and bar 2 (not for bar 0)
    // Each connector: save, beginPath, moveTo, lineTo, stroke, restore
    expect((ctx.save as jest.Mock).mock.calls.length).toBe(2)
    expect((ctx.beginPath as jest.Mock).mock.calls.length).toBe(2)
    expect((ctx.moveTo as jest.Mock).mock.calls.length).toBe(2)
    expect((ctx.lineTo as jest.Mock).mock.calls.length).toBe(2)
    expect((ctx.stroke as jest.Mock).mock.calls.length).toBe(2)
  })

  it("does not draw connectors when connectorStroke is not set", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: 20 }
    ]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, { waterfallStyle: {} })

    // No save/restore calls from connectors
    expect((ctx.save as jest.Mock).mock.calls.length).toBe(0)
  })

  it("skips NaN values", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: NaN },
      { time: 20, value: 5 }
    ]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, { waterfallStyle: {} })

    // Only 2 bars drawn (NaN skipped)
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(2)
  })

  it("draws horizontal bars for timeAxis=y", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: -5 }
    ]
    waterfallRenderer(ctx, data, makeScales("y"), layoutY, style, accessors, undefined, { waterfallStyle: {} })

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(2)
  })

  it("handles inverted scales (arrowOfTime left)", () => {
    const ctx = makeCtx()
    const invertedScales: RealtimeScales = {
      time: scaleLinear().domain([0, 100]).range([400, 0]),
      value: scaleLinear().domain([-50, 50]).range([200, 0])
    }
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: 20 }
    ]
    waterfallRenderer(ctx, data, invertedScales, layoutX, style, accessors, undefined, { waterfallStyle: {} })

    // Should still draw — uses Math.min/Math.abs internally
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(2)
    // Bar dimensions should be positive
    const [, , w, h] = (ctx.fillRect as jest.Mock).mock.calls[0]
    expect(w).toBeGreaterThan(0)
    expect(h).toBeGreaterThan(0)
  })

  it("handles inverted scales for timeAxis=y (arrowOfTime up)", () => {
    const ctx = makeCtx()
    const invertedScales: RealtimeScales = {
      time: scaleLinear().domain([0, 100]).range([200, 0]),
      value: scaleLinear().domain([-50, 50]).range([0, 400])
    }
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: 20 }
    ]
    waterfallRenderer(ctx, data, invertedScales, layoutY, style, accessors, undefined, { waterfallStyle: {} })

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(2)
    const [, , w, h] = (ctx.fillRect as jest.Mock).mock.calls[0]
    expect(w).toBeGreaterThan(0)
    expect(h).toBeGreaterThan(0)
  })

  it("applies bar stroke when configured", () => {
    const ctx = makeCtx()
    const data = [{ time: 0, value: 10 }]
    waterfallRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, {
      waterfallStyle: { stroke: "#000", strokeWidth: 2 }
    })

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(1)
    expect((ctx.strokeRect as jest.Mock).mock.calls.length).toBe(1)
  })
})
