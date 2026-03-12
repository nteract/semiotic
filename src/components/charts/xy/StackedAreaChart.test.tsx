import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { StackedAreaChart } from "./StackedAreaChart"
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

describe("StackedAreaChart", () => {
  const sampleData = [
    { x: 1, y: 10, category: "A" },
    { x: 2, y: 20, category: "A" },
    { x: 1, y: 15, category: "B" },
    { x: 2, y: 25, category: "B" }
  ]

  beforeEach(() => {
    lastXYFrameProps = null
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
  })
})
