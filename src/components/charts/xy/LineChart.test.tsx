import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { LineChart } from "./LineChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock XYFrame to capture props
let lastXYFrameProps: any = null
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastXYFrameProps = props
      return <div className="stream-xy-frame"><svg /></div>
    }
  }
})

describe("LineChart", () => {
  const sampleData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 }
  ]

  beforeEach(() => {
    lastXYFrameProps = null
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamXYFrame prop forwarding", () => {
    it("sets chartType to 'line' by default", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.chartType).toBe("line")
    })

    it("sets chartType to 'area' when fillArea is true", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} fillArea={true} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.chartType).toBe("area")
    })

    it("forwards xAccessor and yAccessor", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} xAccessor="x" yAccessor="y" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.xAccessor).toBe("x")
      expect(lastXYFrameProps.yAccessor).toBe("y")
    })

    it("forwards function accessors", () => {
      const xFn = (d: any) => d.x * 2
      const yFn = (d: any) => d.y + 1
      render(
        <TooltipProvider>
          <LineChart data={sampleData} xAccessor={xFn} yAccessor={yFn} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.xAccessor).toBe(xFn)
      expect(lastXYFrameProps.yAccessor).toBe(yFn)
    })

    it("sets groupAccessor when lineBy is provided", () => {
      const multiSeriesData = [
        { x: 1, y: 10, series: "A" },
        { x: 2, y: 20, series: "A" },
        { x: 1, y: 15, series: "B" },
        { x: 2, y: 25, series: "B" }
      ]
      render(
        <TooltipProvider>
          <LineChart data={multiSeriesData} lineBy="series" showLegend={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.groupAccessor).toBe("series")
    })

    it("forwards curve prop", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} curve="stepAfter" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.curve).toBe("stepAfter")
    })

    it("defaults curve to 'linear'", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.curve).toBe("linear")
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} width={900} height={500} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.size).toEqual([900, 500])
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.enableHover).toBe(false)
    })

    it("forwards showGrid", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} showGrid={true} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.showGrid).toBe(true)
    })

    it("passes pointStyle when showPoints is true", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} showPoints={true} pointRadius={5} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.pointStyle).toBeDefined()
      expect(typeof lastXYFrameProps.pointStyle).toBe("function")
    })

    it("does not pass pointStyle when showPoints is false", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} showPoints={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.pointStyle).toBeUndefined()
    })

    it("forwards xLabel and yLabel", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} xLabel="Time" yLabel="Revenue" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.xLabel).toBe("Time")
      expect(lastXYFrameProps.yLabel).toBe("Revenue")
    })

    it("passes title when provided", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} title="Sales Trend" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.title).toBe("Sales Trend")
    })

    it("provides a tooltipContent function", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.tooltipContent).toBe("function")
    })

    it("forwards forecast config by setting groupAccessor to segment field", () => {
      const tsData = Array.from({ length: 10 }, (_, i) => ({ x: i, y: Math.random() * 100 }))
      render(
        <TooltipProvider>
          <LineChart
            data={tsData}
            forecast={{ trainEnd: 7, steps: 3 }}
          />
        </TooltipProvider>
      )
      // When forecast is active and lineBy is not provided, groupAccessor should be the segment field
      expect(lastXYFrameProps.groupAccessor).toBe("__forecastSegment")
    })

    it("passes lineStyle as a function", () => {
      render(
        <TooltipProvider>
          <LineChart data={sampleData} lineWidth={3} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.lineStyle).toBe("function")
    })

    it("merges frameProps into StreamXYFrame props", () => {
      render(
        <TooltipProvider>
          <LineChart
            data={sampleData}
            frameProps={{ hoverAnnotation: false }}
          />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.hoverAnnotation).toBe(false)
    })
  })
})
