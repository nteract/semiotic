import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { AreaChart } from "./AreaChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock XYFrame to capture props
let lastXYFrameProps = {} as CapturedXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamXYFrameHandle>, CapturedXYFrameProps>((props, _ref) => {
      lastXYFrameProps = props
      return <div className="stream-xy-frame"><svg /></div>
    })
  }
})

describe("AreaChart", () => {
  const sampleData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 }
  ]

  beforeEach(() => {
    lastXYFrameProps = {} as CapturedXYFrameProps
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamXYFrame prop forwarding", () => {
    it("sets chartType to 'area'", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.chartType).toBe("area")
    })

    it("forwards y0Accessor for ribbon/band charts", () => {
      const bandData = [
        { x: 1, p95: 80, p5: 20 },
        { x: 2, p95: 85, p5: 25 },
        { x: 3, p95: 90, p5: 30 }
      ]
      render(
        <TooltipProvider>
          <AreaChart data={bandData} xAccessor="x" yAccessor="p95" y0Accessor="p5" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.y0Accessor).toBe("p5")
    })

    it("does not include y0Accessor when not provided", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.y0Accessor).toBeUndefined()
    })

    it("forwards a gradient config", () => {
      const gradient = {
        stops: [
          { offset: 0, opacity: 0.8 },
          { offset: 1, opacity: 0.05 },
        ],
      }
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} gradientFill={gradient} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.gradientFill).toEqual(gradient)
    })

    it("forwards gradientFill with custom opacity stops", () => {
      const gradient = { stops: [
        { offset: 0, opacity: 0.9 },
        { offset: 1, opacity: 0.1 },
      ] }
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} gradientFill={gradient} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.gradientFill).toEqual(gradient)
    })

    it("maps value-anchored semantic stops to fill and line coordinates", () => {
      render(
        <TooltipProvider>
          <AreaChart
            data={sampleData}
            semanticGradient={{ stops: [
              { offset: 0, color: "#336699", opacity: 0.1 },
              { offset: 1, color: "#336699", opacity: 0.8 },
            ] }}
          />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.gradientFill).toEqual({
        stops: [
          { offset: 0, color: "#336699", opacity: 0.8 },
          { offset: 1, color: "#336699", opacity: 0.1 },
        ],
      })
      expect(lastXYFrameProps.semanticLineStops).toEqual([
        { offset: 0, color: "#336699" },
        { offset: 1, color: "#336699" },
      ])
    })

    it("can opt out of mirroring semanticGradient on the line", () => {
      render(
        <TooltipProvider>
          <AreaChart
            data={sampleData}
            semanticGradient={{ stops: [
              { offset: 0.5, color: "#e5a800", opacity: 0.3 },
              { offset: 0.8, color: "#ff7077", opacity: 0.7 },
            ] }}
            semanticLine={false}
          />
        </TooltipProvider>
      )

      expect(lastXYFrameProps.gradientFill).toBeDefined()
      expect(lastXYFrameProps.semanticLineStops).toBeUndefined()
    })

    it("does not include gradientFill when not set", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.gradientFill).toBeUndefined()
    })

    it("reflects areaOpacity in lineStyle function output", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} areaOpacity={0.4} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.lineStyle).toBe("function")
      const style = lastXYFrameProps.lineStyle({})
      expect(style.fillOpacity).toBe(0.4)
    })

    it("defaults areaOpacity to 0.7 in lineStyle", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} />
        </TooltipProvider>
      )
      const style = lastXYFrameProps.lineStyle({})
      expect(style.fillOpacity).toBe(0.7)
    })

    it("forwards curve prop", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} curve="step" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.curve).toBe("step")
    })

    it("defaults curve to 'monotoneX'", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.curve).toBe("monotoneX")
    })

    it("forwards xAccessor and yAccessor", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} xAccessor="x" yAccessor="y" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.xAccessor).toBe("x")
      expect(lastXYFrameProps.yAccessor).toBe("y")
    })

    it("sets groupAccessor when areaBy is provided", () => {
      const multiData = [
        { x: 1, y: 10, cat: "A" },
        { x: 2, y: 20, cat: "A" },
        { x: 1, y: 15, cat: "B" },
        { x: 2, y: 25, cat: "B" }
      ]
      render(
        <TooltipProvider>
          <AreaChart data={multiData} areaBy="cat" showLegend={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.groupAccessor).toBe("cat")
    })

    it("uses areaBy as the categorical color accessor when colorBy is omitted", () => {
      const multiData = [
        { x: 1, y: 10, cat: "A" },
        { x: 2, y: 20, cat: "A" },
        { x: 1, y: 15, cat: "B" },
      ]
      render(
        <TooltipProvider>
          <AreaChart
            data={multiData}
            areaBy="cat"
            colorScheme={["#111111", "#222222"]}
            showLegend={false}
          />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.lineStyle({ cat: "A" }).fill).toBe("#111111")
      expect(lastXYFrameProps.lineStyle({ cat: "B" }).fill).toBe("#222222")
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} width={700} height={350} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.size).toEqual([700, 350])
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.enableHover).toBe(false)
    })

    it("passes pointStyle when showPoints is true", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} showPoints={true} pointRadius={5} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.pointStyle).toBeDefined()
      expect(typeof lastXYFrameProps.pointStyle).toBe("function")
    })

    it("does not pass pointStyle when showPoints is false", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} showPoints={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.pointStyle).toBeUndefined()
    })

    it("encodes pointRadius in pointStyle function", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} showPoints={true} pointRadius={7} />
        </TooltipProvider>
      )
      const style = lastXYFrameProps.pointStyle({})
      expect(style.r).toBe(7)
    })

    it('forwards tooltipMode="multi" when tooltip="multi"', () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} tooltip="multi" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.tooltipMode).toBe("multi")
      expect(typeof lastXYFrameProps.tooltipContent).toBe("function")
    })

    it("does not set tooltipMode when tooltip is omitted", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.tooltipMode).toBeUndefined()
    })

    it("default tooltip surfaces band values when band is configured", () => {
      render(
        <TooltipProvider>
          <AreaChart
            data={[{ x: 1, y: 10, lo: 5, hi: 15 }]}
            band={{ y0Accessor: "lo", y1Accessor: "hi" }}
          />
        </TooltipProvider>
      )
      const tooltipFn = lastXYFrameProps.tooltipContent
      const node = tooltipFn({
        data: {
          x: 1, y: 10, lo: 5, hi: 15,
          band: { y0: 5, y1: 15 },
          bands: [{ y0: 5, y1: 15 }],
        },
        x: 0, y: 0,
      })
      const { container } = render(<TooltipProvider>{node}</TooltipProvider>)
      expect(container.textContent).toContain("lo:")
      expect(container.textContent).toContain("hi:")
      expect(container.textContent).toContain("5")
      expect(container.textContent).toContain("15")
    })
  })

  // ── seriesFeatures (forecast / anomaly) ────────────────────────────────
  // The shared `useSeriesFeatures` hook drives these props.
  // Lazy-loaded overlay module makes the async pipeline behavior
  // hard to test directly here — async coverage lives in the
  // LineChart forecast tests and the hook's own unit tests.
  describe("seriesFeatures prop wiring", () => {
    it("accepts a forecast prop without crashing", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} forecast={{ trainEnd: 2, steps: 3 }} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps).toMatchObject({ chartType: "area", data: sampleData })
    })

    it("accepts an anomaly prop without crashing", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} anomaly={{ threshold: 2 }} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps).toMatchObject({ chartType: "area", data: sampleData })
    })

    it("does not inject annotations when forecast/anomaly are unset", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.annotations).toBeUndefined()
    })
  })

  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton, 0 areas) then re-rendering as data
    // arrives must not call a different number of hooks between renders —
    // otherwise React throws "Rendered more hooks than during the previous
    // render". Regression guard for the misplaced `setup.earlyReturn` return.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { rerender } = render(
        <TooltipProvider>
          <AreaChart loading />
        </TooltipProvider>
      )
      rerender(
        <TooltipProvider>
          <AreaChart data={sampleData} xAccessor="x" yAccessor="y" />
        </TooltipProvider>
      )
      // The frame must actually render with the data — if a hooks-count error
      // fired, the chart's error boundary would swallow the render and the
      // frame would never receive the data.
      expect(lastXYFrameProps).not.toBeNull()
      expect(lastXYFrameProps.data).toEqual(sampleData)
      const hookErr = errSpy.mock.calls.some((c) =>
        String(c[0]).includes("Rendered more hooks") ||
        String(c[0]).includes("change in the order of Hooks")
      )
      expect(hookErr).toBe(false)
    } finally {
      errSpy.mockRestore()
    }
  })
})
