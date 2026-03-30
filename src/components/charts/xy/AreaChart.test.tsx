import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { AreaChart } from "./AreaChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock XYFrame to capture props
let lastXYFrameProps: any = null
vi.mock("../../stream/StreamXYFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
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
    lastXYFrameProps = null
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

    it("forwards gradientFill when set to true", () => {
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} gradientFill={true} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.gradientFill).toBe(true)
    })

    it("forwards gradientFill with custom opacity settings", () => {
      const gradient = { topOpacity: 0.9, bottomOpacity: 0.1 }
      render(
        <TooltipProvider>
          <AreaChart data={sampleData} gradientFill={gradient} />
        </TooltipProvider>
      )
      expect(lastXYFrameProps.gradientFill).toEqual(gradient)
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
  })
})
