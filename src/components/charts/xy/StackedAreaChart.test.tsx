import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { StackedAreaChart } from "./StackedAreaChart"
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

describe("StackedAreaChart", () => {
  const sampleData = [
    { x: 1, y: 10, category: "A" },
    { x: 2, y: 20, category: "A" },
    { x: 1, y: 15, category: "B" },
    { x: 2, y: 25, category: "B" }
  ]

  beforeEach(() => {
    lastXYFrameProps = {} as CapturedXYFrameProps
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedAreaChart data={[]} areaBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamXYFrame prop forwarding", () => {
    it("sets chartType to 'stackedarea'", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} areaBy="category" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.chartType).toBe("stackedarea")
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} width={800} height={500} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.size).toEqual([800, 500])
    })

    it("uses default width and height when not specified", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.size).toEqual([600, 400])
    })

    it("forwards xLabel and yLabel", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} xLabel="Time" yLabel="Count" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.xLabel).toBe("Time")
      expect(lastXYFrameProps.yLabel).toBe("Count")
    })

    it("sets normalize to true when normalize prop is true", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} areaBy="category" normalize={true} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.normalize).toBe(true)
    })

    it("sets normalize to false by default", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} areaBy="category" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.normalize).toBe(false)
    })

    it("sets groupAccessor when areaBy is provided", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} areaBy="category" showLegend={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.groupAccessor).toBe("category")
    })

    it("does not set groupAccessor when areaBy is not provided", () => {
      const simpleData = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]
      render(
        <TooltipProvider>
          <StackedAreaChart data={simpleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.groupAccessor).toBeUndefined()
    })

    it("forwards curve prop", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} curve="basis" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.curve).toBe("basis")
    })

    it("defaults curve to 'monotoneX'", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.curve).toBe("monotoneX")
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.enableHover).toBe(false)
    })

    it("forwards showGrid", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} showGrid={true} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.showGrid).toBe(true)
    })

    it("forwards title", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} title="Revenue by Region" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.title).toBe("Revenue by Region")
    })

    it("provides a tooltipContent function", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.tooltipContent).toBe("function")
    })

    it("passes lineStyle as a function with correct fillOpacity", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} areaOpacity={0.5} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.lineStyle).toBe("function")
      const style = lastXYFrameProps.lineStyle({})
      expect(style.fillOpacity).toBe(0.5)
    })

    it("passes pointStyle when showPoints is true", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} showPoints={true} pointRadius={5} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.pointStyle).toBeDefined()
      expect(typeof lastXYFrameProps.pointStyle).toBe("function")
    })

    it("does not pass pointStyle when showPoints is false", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} showPoints={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.pointStyle).toBeUndefined()
    })

    it("encodes pointRadius in pointStyle function", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} showPoints={true} pointRadius={7} />
        </TooltipProvider>
      )
      const style = lastXYFrameProps.pointStyle({})
      expect(style.r).toBe(7)
    })

    it('forwards tooltipMode="multi" when tooltip="multi"', () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} areaBy="category" tooltip="multi" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.tooltipMode).toBe("multi")
      expect(typeof lastXYFrameProps.tooltipContent).toBe("function")
    })

    it("does not set tooltipMode when tooltip is omitted", () => {
      render(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} areaBy="category" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.tooltipMode).toBeUndefined()
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
          <StackedAreaChart loading areaBy="category" />
        </TooltipProvider>
      )
      rerender(
        <TooltipProvider>
          <StackedAreaChart data={sampleData} xAccessor="x" yAccessor="y" areaBy="category" />
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
