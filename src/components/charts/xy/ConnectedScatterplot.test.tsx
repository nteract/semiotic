import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { ConnectedScatterplot } from "./ConnectedScatterplot"
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

describe("ConnectedScatterplot", () => {
  const sampleData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
    { x: 4, y: 25 },
    { x: 5, y: 18 }
  ]

  beforeEach(() => {
    lastXYFrameProps = null
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ConnectedScatterplot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamXYFrame prop forwarding", () => {
    it("sets chartType to 'scatter'", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.chartType).toBe("scatter")
    })

    it("forwards xAccessor and yAccessor", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} xAccessor="x" yAccessor="y" />
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
          <ConnectedScatterplot data={sampleData} xAccessor={xFn} yAccessor={yFn} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.xAccessor).toBe(xFn)
      expect(lastXYFrameProps.yAccessor).toBe(yFn)
    })

    it("sorts data by orderAccessor when provided", () => {
      const unorderedData = [
        { x: 3, y: 15, time: 3 },
        { x: 1, y: 10, time: 1 },
        { x: 2, y: 20, time: 2 }
      ]
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={unorderedData} orderAccessor="time" />
        </TooltipProvider>
      )
      // Data should be sorted by time: 1, 2, 3
      const passedData = lastXYFrameProps.data
      expect(passedData[0].time).toBe(1)
      expect(passedData[1].time).toBe(2)
      expect(passedData[2].time).toBe(3)
    })

    it("applies viridis color encoding via pointStyle", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.pointStyle).toBe("function")
      // First point should have a viridis color (starts purple)
      const firstStyle = lastXYFrameProps.pointStyle(sampleData[0])
      expect(firstStyle.fill).toBeDefined()
      expect(typeof firstStyle.fill).toBe("string")
      // Last point should have a different viridis color (ends yellow)
      const lastStyle = lastXYFrameProps.pointStyle(sampleData[sampleData.length - 1])
      expect(lastStyle.fill).toBeDefined()
      expect(firstStyle.fill).not.toBe(lastStyle.fill)
    })

    it("sets pointRadius in pointStyle", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} pointRadius={6} />
        </TooltipProvider>
      )
      const style = lastXYFrameProps.pointStyle(sampleData[0])
      expect(style.r).toBe(6)
    })

    it("defaults pointRadius to 4", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} />
        </TooltipProvider>
      )
      const style = lastXYFrameProps.pointStyle(sampleData[0])
      expect(style.r).toBe(4)
    })

    it("includes connected-lines annotation", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.annotations).toBeDefined()
      expect(lastXYFrameProps.annotations.length).toBeGreaterThanOrEqual(1)
      const connectedLines = lastXYFrameProps.annotations.find(
        (a: any) => a.type === "connected-lines"
      )
      expect(connectedLines).toBeDefined()
    })

    it("provides svgAnnotationRules for connecting lines", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.svgAnnotationRules).toBe("function")
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} width={900} height={600} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.size).toEqual([900, 600])
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.enableHover).toBe(false)
    })

    it("forwards xLabel and yLabel", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} xLabel="GDP" yLabel="Life Expectancy" />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.xLabel).toBe("GDP")
      expect(lastXYFrameProps.yLabel).toBe("Life Expectancy")
    })

    it("forwards showGrid", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} showGrid={true} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.showGrid).toBe(true)
    })

    it("provides a tooltipContent function", () => {
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastXYFrameProps.tooltipContent).toBe("function")
    })

    it("merges user annotations with connected-lines annotation", () => {
      const userAnnotations = [{ type: "react-annotation", x: 2, y: 20, label: "Peak" }]
      render(
        <TooltipProvider>
          <ConnectedScatterplot data={sampleData} annotations={userAnnotations} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.annotations.length).toBe(2)
      expect(lastXYFrameProps.annotations[0].type).toBe("connected-lines")
      expect(lastXYFrameProps.annotations[1].type).toBe("react-annotation")
    })
  })
})
