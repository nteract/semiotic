import { lineRenderer } from "./lineRenderer"
import { scaleLinear } from "d3-scale"

function createMockCtx() {
  return {
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn(),
    strokeStyle: "",
    lineWidth: 1
  } as unknown as CanvasRenderingContext2D
}

const defaultAccessors = {
  time: (d: any) => d.time,
  value: (d: any) => d.value
}

describe("lineRenderer", () => {
  it("draws basic line with correct calls", () => {
    const ctx = createMockCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 1, value: 20 },
      { time: 2, value: 30 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 2]).range([0, 100]),
      value: scaleLinear().domain([10, 30]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }
    const style = { stroke: "#ff0000", strokeWidth: 3 }

    lineRenderer(ctx, data, scales, layout, style, defaultAccessors)

    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 100)
    expect(ctx.lineTo).toHaveBeenCalledTimes(2)
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
    expect(ctx.strokeStyle).toBe("#ff0000")
    expect(ctx.lineWidth).toBe(3)
  })

  it("maps coordinates correctly for arrowOfTime=right (timeAxis=x)", () => {
    const ctx = createMockCtx()
    const data = [
      { time: 0, value: 0 },
      { time: 100, value: 50 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 100]).range([0, 200]),
      value: scaleLinear().domain([0, 100]).range([150, 0]) // inverted y
    }
    const layout = { width: 200, height: 150, timeAxis: "x" as const }

    lineRenderer(ctx, data, scales, layout, {}, defaultAccessors)

    // time=0 -> x=0, value=0 -> y=150
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 150)
    // time=100 -> x=200, value=50 -> y=75
    expect(ctx.lineTo).toHaveBeenCalledWith(200, 75)
  })

  it("maps coordinates correctly for arrowOfTime=down (timeAxis=y)", () => {
    const ctx = createMockCtx()
    const data = [
      { time: 0, value: 0 },
      { time: 100, value: 50 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 100]).range([0, 200]), // y range
      value: scaleLinear().domain([0, 100]).range([0, 150]) // x range
    }
    const layout = { width: 150, height: 200, timeAxis: "y" as const }

    lineRenderer(ctx, data, scales, layout, {}, defaultAccessors)

    // timeAxis=y: x=valueScale(value), y=timeScale(time)
    // time=0 -> y=0, value=0 -> x=0
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0)
    // time=100 -> y=200, value=50 -> x=75
    expect(ctx.lineTo).toHaveBeenCalledWith(75, 200)
  })

  it("handles gap (NaN) in data by breaking the line", () => {
    const ctx = createMockCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 1, value: NaN },
      { time: 2, value: 30 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 2]).range([0, 100]),
      value: scaleLinear().domain([10, 30]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }

    lineRenderer(ctx, data, scales, layout, {}, defaultAccessors)

    // Should have 2 moveTo calls (start + restart after gap)
    expect(ctx.moveTo).toHaveBeenCalledTimes(2)
    expect(ctx.lineTo).toHaveBeenCalledTimes(0)
  })

  it("handles empty data", () => {
    const ctx = createMockCtx()
    const scales = {
      time: scaleLinear().domain([0, 1]).range([0, 100]),
      value: scaleLinear().domain([0, 1]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }

    lineRenderer(ctx, [], scales, layout, {}, defaultAccessors)

    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.moveTo).not.toHaveBeenCalled()
    expect(ctx.lineTo).not.toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
  })

  it("handles single point (moveTo only, no lineTo)", () => {
    const ctx = createMockCtx()
    const data = [{ time: 5, value: 10 }]
    const scales = {
      time: scaleLinear().domain([0, 10]).range([0, 100]),
      value: scaleLinear().domain([0, 20]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }

    lineRenderer(ctx, data, scales, layout, {}, defaultAccessors)

    expect(ctx.moveTo).toHaveBeenCalledTimes(1)
    expect(ctx.lineTo).not.toHaveBeenCalled()
  })

  it("applies strokeDasharray style", () => {
    const ctx = createMockCtx()
    const data = [{ time: 0, value: 0 }]
    const scales = {
      time: scaleLinear().domain([0, 1]).range([0, 100]),
      value: scaleLinear().domain([0, 1]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }
    const style = { strokeDasharray: "5,3" }

    lineRenderer(ctx, data, scales, layout, style, defaultAccessors)

    expect(ctx.setLineDash).toHaveBeenCalledWith([5, 3])
  })

  it("uses default style when none provided", () => {
    const ctx = createMockCtx()
    const data = [{ time: 0, value: 0 }]
    const scales = {
      time: scaleLinear().domain([0, 1]).range([0, 100]),
      value: scaleLinear().domain([0, 1]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }

    lineRenderer(ctx, data, scales, layout, {}, defaultAccessors)

    expect(ctx.strokeStyle).toBe("#007bff")
    expect(ctx.lineWidth).toBe(2)
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })
})

describe("lineRenderer — threshold coloring", () => {
  it("no color thresholds → single stroke (fast path)", () => {
    const ctx = createMockCtx()
    const data = [
      { time: 0, value: 10 },
      { time: 1, value: 20 },
      { time: 2, value: 30 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 2]).range([0, 100]),
      value: scaleLinear().domain([0, 40]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }

    // Threshold without color → no effect (fast path)
    const annotations = [{ type: "threshold", value: 25, label: "Target" }]
    lineRenderer(ctx, data, scales, layout, { stroke: "#ff0000" }, defaultAccessors, annotations)

    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
    expect(ctx.strokeStyle).toBe("#ff0000")
  })

  it("greater threshold with color → segments above get different strokeStyle", () => {
    const ctx = createMockCtx()
    // Points: 50 (below), 150 (above), 50 (below)
    const data = [
      { time: 0, value: 50 },
      { time: 1, value: 150 },
      { time: 2, value: 50 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 2]).range([0, 200]),
      value: scaleLinear().domain([0, 200]).range([200, 0])
    }
    const layout = { width: 200, height: 200, timeAxis: "x" as const }
    const annotations = [
      { type: "threshold", value: 100, color: "#dc3545" }
    ]

    lineRenderer(ctx, data, scales, layout, { stroke: "#007bff" }, defaultAccessors, annotations)

    // Should have multiple stroke calls due to color changes
    expect((ctx.stroke as jest.Mock).mock.calls.length).toBeGreaterThan(1)

    // Collect all strokeStyle values set during rendering
    const strokeStyles: string[] = []
    const origBeginPath = ctx.beginPath as jest.Mock
    // Re-run with tracking
    const ctx2 = createMockCtx()
    const styleTracker: string[] = []
    const origStroke2 = ctx2.stroke as jest.Mock
    origStroke2.mockImplementation(() => {
      styleTracker.push(ctx2.strokeStyle as string)
    })

    lineRenderer(ctx2, data, scales, layout, { stroke: "#007bff" }, defaultAccessors, annotations)

    // Should contain both the base color and the threshold color
    expect(styleTracker).toContain("#007bff")
    expect(styleTracker).toContain("#dc3545")
  })

  it("lesser threshold with color → segments below colored", () => {
    const ctx = createMockCtx()
    const styleTracker: string[] = []
    ;(ctx.stroke as jest.Mock).mockImplementation(() => {
      styleTracker.push(ctx.strokeStyle as string)
    })

    // Points: 150 (above), 50 (below), 150 (above)
    const data = [
      { time: 0, value: 150 },
      { time: 1, value: 50 },
      { time: 2, value: 150 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 2]).range([0, 200]),
      value: scaleLinear().domain([0, 200]).range([200, 0])
    }
    const layout = { width: 200, height: 200, timeAxis: "x" as const }
    const annotations = [
      { type: "threshold", value: 100, color: "#007bff", thresholdType: "lesser" }
    ]

    lineRenderer(ctx, data, scales, layout, { stroke: "#fd7e14" }, defaultAccessors, annotations)

    // Should contain both the base color and the lesser threshold color
    expect(styleTracker).toContain("#fd7e14")
    expect(styleTracker).toContain("#007bff")
  })

  it("multiple thresholds → correct color application (last wins)", () => {
    const ctx = createMockCtx()
    const styleTracker: string[] = []
    ;(ctx.stroke as jest.Mock).mockImplementation(() => {
      styleTracker.push(ctx.strokeStyle as string)
    })

    // Value 200 is above both 100 and 150
    // With "last wins": threshold at 150 (green) comes after 100 (red), so green wins
    const data = [
      { time: 0, value: 50 },
      { time: 1, value: 200 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 1]).range([0, 100]),
      value: scaleLinear().domain([0, 200]).range([200, 0])
    }
    const layout = { width: 100, height: 200, timeAxis: "x" as const }
    const annotations = [
      { type: "threshold", value: 100, color: "#dc3545" },
      { type: "threshold", value: 150, color: "#28a745" }
    ]

    lineRenderer(ctx, data, scales, layout, { stroke: "#007bff" }, defaultAccessors, annotations)

    // The final segment (value=200, above both thresholds) should be green (last wins)
    expect(styleTracker).toContain("#28a745")
  })

  it("threshold without color → no effect (fast path)", () => {
    const ctx = createMockCtx()
    const data = [
      { time: 0, value: 50 },
      { time: 1, value: 150 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 1]).range([0, 100]),
      value: scaleLinear().domain([0, 200]).range([100, 0])
    }
    const layout = { width: 100, height: 100, timeAxis: "x" as const }

    // Only a label threshold, no color → fast path
    const annotations = [{ type: "threshold", value: 100, label: "Target" }]
    lineRenderer(ctx, data, scales, layout, {}, defaultAccessors, annotations)

    // Fast path: single beginPath + single stroke
    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
  })

  it("interpolation: two points straddling threshold → stroke changes at interpolated pixel", () => {
    const ctx = createMockCtx()
    const lineToArgs: [number, number][] = []
    ;(ctx.lineTo as jest.Mock).mockImplementation((x: number, y: number) => {
      lineToArgs.push([x, y])
    })
    const moveToArgs: [number, number][] = []
    ;(ctx.moveTo as jest.Mock).mockImplementation((x: number, y: number) => {
      moveToArgs.push([x, y])
    })

    // Point at value=0 (time=0) and value=200 (time=1)
    // Threshold at 100
    // Crossing happens at t=0.5, so midpoint pixel should be at x=50
    const data = [
      { time: 0, value: 0 },
      { time: 1, value: 200 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 1]).range([0, 100]),
      value: scaleLinear().domain([0, 200]).range([200, 0])
    }
    const layout = { width: 100, height: 200, timeAxis: "x" as const }
    const annotations = [
      { type: "threshold", value: 100, color: "#dc3545" }
    ]

    lineRenderer(ctx, data, scales, layout, { stroke: "#007bff" }, defaultAccessors, annotations)

    // There should be a lineTo at the interpolated crossing point (x=50, y=100)
    const crossingPoint = lineToArgs.find(
      ([x, y]) => Math.abs(x - 50) < 1 && Math.abs(y - 100) < 1
    )
    expect(crossingPoint).toBeDefined()

    // There should be a moveTo at the crossing point (starting new segment)
    const crossingMoveTo = moveToArgs.find(
      ([x, y]) => Math.abs(x - 50) < 1 && Math.abs(y - 100) < 1
    )
    expect(crossingMoveTo).toBeDefined()

    // Should have multiple stroke calls (segment before and after crossing)
    expect((ctx.stroke as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it("handles NaN gap in threshold mode", () => {
    const ctx = createMockCtx()
    const data = [
      { time: 0, value: 50 },
      { time: 1, value: NaN },
      { time: 2, value: 150 }
    ]
    const scales = {
      time: scaleLinear().domain([0, 2]).range([0, 200]),
      value: scaleLinear().domain([0, 200]).range([200, 0])
    }
    const layout = { width: 200, height: 200, timeAxis: "x" as const }
    const annotations = [
      { type: "threshold", value: 100, color: "#dc3545" }
    ]

    lineRenderer(ctx, data, scales, layout, { stroke: "#007bff" }, defaultAccessors, annotations)

    // Should have 2 moveTo calls (start + restart after gap)
    expect(ctx.moveTo).toHaveBeenCalledTimes(2)
  })
})
