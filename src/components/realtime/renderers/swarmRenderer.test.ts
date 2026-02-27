import { swarmRenderer } from "./swarmRenderer"
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
    textBaseline: "",
    globalAlpha: 1
  } as unknown as CanvasRenderingContext2D
}

const getTime = (d: any) => d.time
const getValue = (d: any) => d.value
const accessors: RealtimeAccessors = { time: getTime, value: getValue }

function makeScales(timeAxis: "x" | "y"): RealtimeScales {
  if (timeAxis === "x") {
    return {
      time: scaleLinear().domain([0, 100]).range([0, 400]),
      value: scaleLinear().domain([0, 100]).range([200, 0])
    }
  }
  return {
    time: scaleLinear().domain([0, 100]).range([0, 200]),
    value: scaleLinear().domain([0, 100]).range([0, 400])
  }
}

const layoutX: RealtimeLayout = { width: 400, height: 200, timeAxis: "x" }
const layoutY: RealtimeLayout = { width: 400, height: 200, timeAxis: "y" }
const style: LineStyle = {}

describe("swarmRenderer", () => {
  it("draws a single point at correct coordinates", () => {
    const ctx = makeCtx()
    const data = [{ time: 50, value: 50 }]
    const scales = makeScales("x")
    swarmRenderer(ctx, data, scales, layoutX, style, accessors)

    expect((ctx.arc as jest.Mock).mock.calls.length).toBe(1)
    expect((ctx.fill as jest.Mock).mock.calls.length).toBe(1)

    const [x, y, r] = (ctx.arc as jest.Mock).mock.calls[0]
    expect(x).toBeCloseTo(scales.time(50), 1)
    expect(y).toBeCloseTo(scales.value(50), 1)
    expect(r).toBe(3) // default radius
  })

  it("draws correct number of arcs for multiple points", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 25, value: 50 },
      { time: 50, value: 30 },
      { time: 75, value: 80 },
      { time: 100, value: 20 }
    ]
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors)

    expect((ctx.arc as jest.Mock).mock.calls.length).toBe(5)
    expect((ctx.fill as jest.Mock).mock.calls.length).toBe(5)
  })

  it("uses barColors map when categoryAccessor is set", () => {
    const ctx = makeCtx()
    const fillStyles: string[] = []
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyles.push(v) },
      get() { return fillStyles[fillStyles.length - 1] || "" }
    })

    const data = [
      { time: 0, value: 10, cat: "errors" },
      { time: 10, value: 20, cat: "warnings" },
      { time: 20, value: 30, cat: "errors" }
    ]
    const catAccessors: RealtimeAccessors = {
      time: getTime,
      value: getValue,
      category: (d: any) => d.cat
    }
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, catAccessors, undefined, {
      barColors: { errors: "red", warnings: "orange" }
    })

    expect(fillStyles).toContain("red")
    expect(fillStyles).toContain("orange")
    // errors appears twice
    expect(fillStyles.filter(c => c === "red").length).toBe(2)
  })

  it("falls back to default palette for unlisted categories", () => {
    const ctx = makeCtx()
    const fillStyles: string[] = []
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyles.push(v) },
      get() { return fillStyles[fillStyles.length - 1] || "" }
    })

    const data = [
      { time: 0, value: 10, cat: "unknown_cat" }
    ]
    const catAccessors: RealtimeAccessors = {
      time: getTime,
      value: getValue,
      category: (d: any) => d.cat
    }
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, catAccessors, undefined, {
      barColors: { errors: "red" }
    })

    // Should use first color from default palette, not "red"
    expect(fillStyles).not.toContain("red")
    expect(fillStyles.length).toBe(1)
    // First default palette color
    expect(fillStyles[0]).toBe("#007bff")
  })

  it("applies custom swarmStyle overrides", () => {
    const ctx = makeCtx()
    const fillStyles: string[] = []
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyles.push(v) },
      get() { return fillStyles[fillStyles.length - 1] || "" }
    })
    const alphas: number[] = []
    Object.defineProperty(ctx, "globalAlpha", {
      set(v: number) { alphas.push(v) },
      get() { return alphas[alphas.length - 1] ?? 1 }
    })

    const data = [{ time: 50, value: 50 }]
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, {
      swarmStyle: { radius: 8, fill: "purple", opacity: 0.5, stroke: "#000", strokeWidth: 2 }
    })

    const [, , r] = (ctx.arc as jest.Mock).mock.calls[0]
    expect(r).toBe(8)
    expect(fillStyles).toContain("purple")
    expect(alphas).toContain(0.5)
    // Stroke should be called
    expect((ctx.stroke as jest.Mock).mock.calls.length).toBe(1)
  })

  it("draws nothing for empty data", () => {
    const ctx = makeCtx()
    swarmRenderer(ctx, [], makeScales("x"), layoutX, style, accessors)

    expect((ctx.arc as jest.Mock).mock.calls.length).toBe(0)
    expect((ctx.fill as jest.Mock).mock.calls.length).toBe(0)
  })

  it("skips NaN values", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: NaN },
      { time: 20, value: 30 }
    ]
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors)

    expect((ctx.arc as jest.Mock).mock.calls.length).toBe(2)
  })

  it("skips null values", () => {
    const ctx = makeCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 10, value: null },
      { time: 20, value: 30 }
    ]
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors)

    expect((ctx.arc as jest.Mock).mock.calls.length).toBe(2)
  })

  it("handles timeAxis=y orientation", () => {
    const ctx = makeCtx()
    const data = [{ time: 50, value: 50 }]
    const scales = makeScales("y")
    swarmRenderer(ctx, data, scales, layoutY, style, accessors)

    expect((ctx.arc as jest.Mock).mock.calls.length).toBe(1)
    const [x, y] = (ctx.arc as jest.Mock).mock.calls[0]
    // timeAxis=y: x = valueScale(v), y = timeScale(t)
    expect(x).toBeCloseTo(scales.value(50), 1)
    expect(y).toBeCloseTo(scales.time(50), 1)
  })

  it("handles inverted scales", () => {
    const ctx = makeCtx()
    const invertedScales: RealtimeScales = {
      time: scaleLinear().domain([0, 100]).range([400, 0]),
      value: scaleLinear().domain([0, 100]).range([200, 0])
    }
    const data = [{ time: 25, value: 75 }]
    swarmRenderer(ctx, data, invertedScales, layoutX, style, accessors)

    expect((ctx.arc as jest.Mock).mock.calls.length).toBe(1)
    const [x, y] = (ctx.arc as jest.Mock).mock.calls[0]
    expect(x).toBeCloseTo(invertedScales.time(25), 1)
    expect(y).toBeCloseTo(invertedScales.value(75), 1)
  })

  it("does not stroke when no stroke configured", () => {
    const ctx = makeCtx()
    const data = [{ time: 50, value: 50 }]
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors)

    expect((ctx.stroke as jest.Mock).mock.calls.length).toBe(0)
  })

  it("uses lineStyle.stroke as default fill", () => {
    const ctx = makeCtx()
    const fillStyles: string[] = []
    Object.defineProperty(ctx, "fillStyle", {
      set(v: string) { fillStyles.push(v) },
      get() { return fillStyles[fillStyles.length - 1] || "" }
    })

    const data = [{ time: 50, value: 50 }]
    swarmRenderer(ctx, data, makeScales("x"), layoutX, { stroke: "#ff0000" }, accessors)

    expect(fillStyles).toContain("#ff0000")
  })

  describe("threshold coloring", () => {
    it("no color thresholds → uses default fill", () => {
      const ctx = makeCtx()
      const fillStyles: string[] = []
      Object.defineProperty(ctx, "fillStyle", {
        set(v: string) { fillStyles.push(v) },
        get() { return fillStyles[fillStyles.length - 1] || "" }
      })

      const data = [{ time: 50, value: 50 }]
      swarmRenderer(ctx, data, makeScales("x"), layoutX, { stroke: "#007bff" }, accessors, [
        { type: "threshold", value: 80 }  // no color → not a color threshold
      ])

      expect(fillStyles).toEqual(["#007bff"])
    })

    it("greater threshold colors points above", () => {
      const ctx = makeCtx()
      const fillStyles: string[] = []
      Object.defineProperty(ctx, "fillStyle", {
        set(v: string) { fillStyles.push(v) },
        get() { return fillStyles[fillStyles.length - 1] || "" }
      })

      const data = [
        { time: 0, value: 30 },  // below threshold
        { time: 10, value: 70 }, // above threshold
        { time: 20, value: 50 }, // at threshold (not greater)
        { time: 30, value: 90 }  // above threshold
      ]
      swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, [
        { type: "threshold", value: 50, color: "red" }
      ])

      expect(fillStyles[0]).toBe("#007bff") // below → default
      expect(fillStyles[1]).toBe("red")     // above → red
      expect(fillStyles[2]).toBe("#007bff") // at 50, not > 50 → default
      expect(fillStyles[3]).toBe("red")     // above → red
    })

    it("lesser threshold colors points below", () => {
      const ctx = makeCtx()
      const fillStyles: string[] = []
      Object.defineProperty(ctx, "fillStyle", {
        set(v: string) { fillStyles.push(v) },
        get() { return fillStyles[fillStyles.length - 1] || "" }
      })

      const data = [
        { time: 0, value: 30 },  // below threshold
        { time: 10, value: 70 }  // above threshold
      ]
      swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, [
        { type: "threshold", value: 50, color: "blue", thresholdType: "lesser" }
      ])

      expect(fillStyles[0]).toBe("blue")    // below → blue
      expect(fillStyles[1]).toBe("#007bff")  // above → default
    })

    it("multiple thresholds — last matching wins", () => {
      const ctx = makeCtx()
      const fillStyles: string[] = []
      Object.defineProperty(ctx, "fillStyle", {
        set(v: string) { fillStyles.push(v) },
        get() { return fillStyles[fillStyles.length - 1] || "" }
      })

      const data = [
        { time: 0, value: 90 }  // above both thresholds
      ]
      swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, [
        { type: "threshold", value: 50, color: "orange" },
        { type: "threshold", value: 80, color: "red" }
      ])

      // Both match, last wins
      expect(fillStyles[0]).toBe("red")
    })

    it("threshold overrides category color", () => {
      const ctx = makeCtx()
      const fillStyles: string[] = []
      Object.defineProperty(ctx, "fillStyle", {
        set(v: string) { fillStyles.push(v) },
        get() { return fillStyles[fillStyles.length - 1] || "" }
      })

      const data = [
        { time: 0, value: 90, cat: "sensor1" }
      ]
      const catAccessors: RealtimeAccessors = {
        time: getTime,
        value: getValue,
        category: (d: any) => d.cat
      }
      swarmRenderer(ctx, data, makeScales("x"), layoutX, style, catAccessors, [
        { type: "threshold", value: 50, color: "red" }
      ], {
        barColors: { sensor1: "green" }
      })

      // Category says green, but threshold override says red
      expect(fillStyles[0]).toBe("red")
    })

    it("threshold uses category color as base when not triggered", () => {
      const ctx = makeCtx()
      const fillStyles: string[] = []
      Object.defineProperty(ctx, "fillStyle", {
        set(v: string) { fillStyles.push(v) },
        get() { return fillStyles[fillStyles.length - 1] || "" }
      })

      const data = [
        { time: 0, value: 30, cat: "sensor1" }
      ]
      const catAccessors: RealtimeAccessors = {
        time: getTime,
        value: getValue,
        category: (d: any) => d.cat
      }
      swarmRenderer(ctx, data, makeScales("x"), layoutX, style, catAccessors, [
        { type: "threshold", value: 50, color: "red" }
      ], {
        barColors: { sensor1: "green" }
      })

      // Below threshold, so category color is preserved
      expect(fillStyles[0]).toBe("green")
    })
  })

  it("resets globalAlpha after rendering", () => {
    const ctx = makeCtx()
    const alphas: number[] = []
    Object.defineProperty(ctx, "globalAlpha", {
      set(v: number) { alphas.push(v) },
      get() { return alphas[alphas.length - 1] ?? 1 }
    })

    const data = [{ time: 50, value: 50 }]
    swarmRenderer(ctx, data, makeScales("x"), layoutX, style, accessors)

    // Last alpha set should be 1 (reset)
    expect(alphas[alphas.length - 1]).toBe(1)
  })
})
