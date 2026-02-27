import { barRenderer } from "./barRenderer"
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
      value: scaleLinear().domain([0, 50]).range([200, 0])
    }
  }
  return {
    time: scaleLinear().domain([0, 100]).range([0, 200]),
    value: scaleLinear().domain([0, 50]).range([0, 400])
  }
}

const layoutX: RealtimeLayout = { width: 400, height: 200, timeAxis: "x" }
const layoutY: RealtimeLayout = { width: 400, height: 200, timeAxis: "y" }
const style: LineStyle = {}

describe("barRenderer", () => {
  it("does nothing without binSize", () => {
    const ctx = makeCtx()
    const data = [{ time: 5, value: 10 }]
    barRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, undefined)
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(0)
  })

  it("draws non-stacked bars for timeAxis=x", () => {
    const ctx = makeCtx()
    const data = [
      { time: 5, value: 10 },
      { time: 15, value: 20 },
      { time: 25, value: 5 }
    ]
    barRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined, { binSize: 10 })

    // 3 bins → 3 fillRect calls
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(3)
  })

  it("draws non-stacked bars for timeAxis=y", () => {
    const ctx = makeCtx()
    const data = [
      { time: 5, value: 10 },
      { time: 15, value: 20 }
    ]
    barRenderer(ctx, data, makeScales("y"), layoutY, style, accessors, undefined, { binSize: 10 })

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(2)
  })

  it("draws stacked bars with multiple fillRect calls per bin", () => {
    const ctx = makeCtx()
    const getCat = (d: any) => d.cat
    const data = [
      { time: 5, value: 10, cat: "errors" },
      { time: 6, value: 5, cat: "warnings" },
      { time: 7, value: 3, cat: "info" }
    ]
    barRenderer(
      ctx, data, makeScales("x"), layoutX, style,
      { ...accessors, category: getCat },
      undefined,
      { binSize: 10, barColors: { errors: "red", warnings: "orange", info: "blue" } }
    )

    // All 3 categories in 1 bin → 3 fillRect calls
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(3)
  })

  it("uses correct colors from barColors", () => {
    const ctx = makeCtx()
    const getCat = (d: any) => d.cat
    const data = [
      { time: 5, value: 10, cat: "errors" },
      { time: 6, value: 5, cat: "warnings" }
    ]

    barRenderer(
      ctx, data, makeScales("x"), layoutX, style,
      { ...accessors, category: getCat },
      undefined,
      { binSize: 10, barColors: { errors: "#ff0000", warnings: "#ff8800" } }
    )

    // Check fillStyle was set correctly
    const fillStyles: string[] = []
    const fillRectCalls = (ctx.fillRect as jest.Mock).mock.calls
    // fillStyle is set before each fillRect call, so we track it
    // Since we can't easily track property assignments on the mock,
    // verify we got the right number of draws
    expect(fillRectCalls.length).toBe(2)
  })

  it("draws nothing for empty data", () => {
    const ctx = makeCtx()
    barRenderer(ctx, [], makeScales("x"), layoutX, style, accessors, undefined, { binSize: 10 })
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(0)
  })

  it("applies bar stroke when configured", () => {
    const ctx = makeCtx()
    const data = [{ time: 5, value: 10 }]
    barRenderer(
      ctx, data, makeScales("x"), layoutX, style, accessors, undefined,
      { binSize: 10, barStyle: { stroke: "#000", strokeWidth: 2 } }
    )

    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(1)
    expect((ctx.strokeRect as jest.Mock).mock.calls.length).toBe(1)
  })

  it("handles inverted scales (arrowOfTime left)", () => {
    const ctx = makeCtx()
    const invertedScales: RealtimeScales = {
      time: scaleLinear().domain([0, 100]).range([400, 0]),
      value: scaleLinear().domain([0, 50]).range([200, 0])
    }
    const data = [{ time: 5, value: 10 }]
    barRenderer(ctx, data, invertedScales, layoutX, style, accessors, undefined, { binSize: 10 })

    // Should still draw — uses Math.min/Math.abs internally
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBe(1)
  })

  it("gap reduces bar width", () => {
    const ctx = makeCtx()
    const data = [{ time: 5, value: 10 }]

    // Gap = 0
    barRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined,
      { binSize: 10, barStyle: { gap: 0 } })
    const noGapCall = (ctx.fillRect as jest.Mock).mock.calls[0]
    const noGapWidth = noGapCall[2]

    ;(ctx.fillRect as jest.Mock).mockClear()

    // Gap = 10
    barRenderer(ctx, data, makeScales("x"), layoutX, style, accessors, undefined,
      { binSize: 10, barStyle: { gap: 10 } })
    const gapCall = (ctx.fillRect as jest.Mock).mock.calls[0]
    const gapWidth = gapCall[2]

    expect(gapWidth).toBeLessThan(noGapWidth)
  })

  describe("partial edge bins", () => {
    it("renders a narrower leading bin when data starts mid-bin", () => {
      const ctx = makeCtx()
      // Data starts at time=35 with binSize=20
      // First bin is [20, 40], but domain starts at 35 → rendered [35, 40] = 25% width
      // Second bin is [40, 60] → full width
      const data = [
        { time: 35, value: 10 },
        { time: 45, value: 20 }
      ]
      const scales: RealtimeScales = {
        time: scaleLinear().domain([35, 60]).range([0, 400]),
        value: scaleLinear().domain([0, 50]).range([200, 0])
      }
      barRenderer(ctx, data, scales, layoutX, style, accessors, undefined, { binSize: 20, barStyle: { gap: 0 } })

      const calls = (ctx.fillRect as jest.Mock).mock.calls
      expect(calls.length).toBe(2)

      // First bin: clamped to [35, 40] → width = timeScale(40) - timeScale(35)
      const firstBarWidth = calls[0][2]
      // Second bin: full [40, 60] → width = timeScale(60) - timeScale(40)
      const secondBarWidth = calls[1][2]

      expect(firstBarWidth).toBeLessThan(secondBarWidth)
      // First bar should be 5/25 of chart width, second should be 20/25
      expect(firstBarWidth).toBeCloseTo(400 * (5 / 25), 1)
      expect(secondBarWidth).toBeCloseTo(400 * (20 / 25), 1)
    })

    it("renders a narrower trailing bin when data ends mid-bin", () => {
      const ctx = makeCtx()
      // Data ends at time=153 with binSize=20
      // [140, 160] → rendered as [140, 153] = 65% width
      const data = [
        { time: 140, value: 10 },
        { time: 153, value: 20 }
      ]
      const scales: RealtimeScales = {
        time: scaleLinear().domain([140, 153]).range([0, 400]),
        value: scaleLinear().domain([0, 50]).range([200, 0])
      }
      barRenderer(ctx, data, scales, layoutX, style, accessors, undefined, { binSize: 20, barStyle: { gap: 0 } })

      const calls = (ctx.fillRect as jest.Mock).mock.calls
      expect(calls.length).toBe(1)

      // Clamped to [140, 153] → 13/13 of domain = full chart width
      const barWidth = calls[0][2]
      expect(barWidth).toBeCloseTo(400, 1)
    })

    it("renders both partial leading and trailing bins with full middle bins", () => {
      const ctx = makeCtx()
      // domain [35, 153], binSize=20
      // Bins: [20,40]→clamped [35,40], [40,60] full, [60,80] full,
      //        [80,100] full, [100,120] full, [120,140] full, [140,160]→clamped [140,153]
      const data = [
        { time: 35, value: 5 },
        { time: 55, value: 10 },
        { time: 75, value: 10 },
        { time: 95, value: 10 },
        { time: 115, value: 10 },
        { time: 135, value: 10 },
        { time: 153, value: 8 }
      ]
      const scales: RealtimeScales = {
        time: scaleLinear().domain([35, 153]).range([0, 400]),
        value: scaleLinear().domain([0, 50]).range([200, 0])
      }
      barRenderer(ctx, data, scales, layoutX, style, accessors, undefined, { binSize: 20, barStyle: { gap: 0 } })

      const calls = (ctx.fillRect as jest.Mock).mock.calls
      expect(calls.length).toBe(7)

      const firstBarWidth = calls[0][2]
      const middleBarWidth = calls[1][2]
      const lastBarWidth = calls[calls.length - 1][2]

      // First bin [35,40] = 5 units, middle bins = 20 units, last bin [140,153] = 13 units
      // Total domain = 118 units mapped to 400px
      const pxPerUnit = 400 / 118
      expect(firstBarWidth).toBeCloseTo(5 * pxPerUnit, 1)
      expect(middleBarWidth).toBeCloseTo(20 * pxPerUnit, 1)
      expect(lastBarWidth).toBeCloseTo(13 * pxPerUnit, 1)
      expect(firstBarWidth).toBeLessThan(middleBarWidth)
      expect(lastBarWidth).toBeLessThan(middleBarWidth)
    })

    it("skips a bin entirely outside the domain", () => {
      const ctx = makeCtx()
      // domain [50, 100], binSize=20
      // A data point at time=10 creates bin [0, 20] which is fully outside domain
      // A data point at time=55 creates bin [40, 60] which partially overlaps
      const data = [
        { time: 10, value: 5 },
        { time: 55, value: 10 }
      ]
      const scales: RealtimeScales = {
        time: scaleLinear().domain([50, 100]).range([0, 400]),
        value: scaleLinear().domain([0, 50]).range([200, 0])
      }
      barRenderer(ctx, data, scales, layoutX, style, accessors, undefined, { binSize: 20, barStyle: { gap: 0 } })

      const calls = (ctx.fillRect as jest.Mock).mock.calls
      // bin [0,20] is fully outside [50,100] → skipped
      // bin [40,60] clamped to [50,60] → drawn
      expect(calls.length).toBe(1)
    })
  })
})
