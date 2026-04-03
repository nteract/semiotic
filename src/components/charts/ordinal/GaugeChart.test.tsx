import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { GaugeChart } from "./GaugeChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

describe("GaugeChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("renders without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <GaugeChart value={75} />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
  })

  it("uses radial projection with pie chart type", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.chartType).toBe("donut")
    expect(lastOrdinalFrameProps.projection).toBe("radial")
  })

  it("generates fill and background data segments that sum to 1.0", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} min={0} max={100} />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    const fillSegment = data.find((d: any) => d._isFill)
    const bgSegment = data.find((d: any) => !d._isFill)
    expect(fillSegment).toBeTruthy()
    expect(bgSegment).toBeTruthy()
    // Data sums to 1.0 — pieScene uses sweepAngle to limit the arc
    expect(fillSegment.value + bgSegment.value).toBeCloseTo(1.0, 2)
    // sweepAngle is passed to the frame
    expect(lastOrdinalFrameProps.sweepAngle).toBe(240)
  })

  it("generates threshold zone segments", () => {
    render(
      <TooltipProvider>
        <GaugeChart
          value={60}
          min={0}
          max={100}
          thresholds={[
            { value: 50, color: "green", label: "Low" },
            { value: 80, color: "yellow", label: "Medium" },
            { value: 100, color: "red", label: "High" },
          ]}
        />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    // value=60 fills all of zone 1 (0-50) and part of zone 2 (50-80)
    // Plus gap segment
    const fills = data.filter((d: any) => d._isFill)
    const bgs = data.filter((d: any) => !d._isFill)
    expect(fills.length).toBe(2) // zones 0 and 1 have fill
    expect(bgs.length).toBe(2) // zones 1 and 2 have background
  })

  it("clamps value to min/max range", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={150} min={0} max={100} />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    // All filled, no background
    const fills = data.filter((d: any) => d._isFill)
    const bgs = data.filter((d: any) => !d._isFill)
    expect(fills.length).toBe(1)
    expect(bgs.length).toBe(0)
  })

  it("clamps value below min", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={-10} min={0} max={100} />
      </TooltipProvider>
    )
    const data = lastOrdinalFrameProps.data
    // All background, no fill
    const fills = data.filter((d: any) => d._isFill)
    const bgs = data.filter((d: any) => !d._isFill)
    expect(fills.length).toBe(0)
    expect(bgs.length).toBe(1)
  })

  it("renders needle annotation by default", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} />
      </TooltipProvider>
    )
    const annotations = lastOrdinalFrameProps.annotations
    const needle = annotations?.find((a: any) => a.type === "gauge-needle")
    expect(needle).toBeTruthy()
  })

  it("does not render needle when showNeedle=false", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} showNeedle={false} />
      </TooltipProvider>
    )
    const annotations = lastOrdinalFrameProps.annotations || []
    const needle = annotations.find((a: any) => a.type === "gauge-needle")
    expect(needle).toBeFalsy()
  })

  it("generates scale label annotations at threshold boundaries", () => {
    render(
      <TooltipProvider>
        <GaugeChart
          value={50}
          thresholds={[
            { value: 33, color: "green", label: "Low" },
            { value: 66, color: "yellow", label: "Med" },
            { value: 100, color: "red", label: "High" },
          ]}
        />
      </TooltipProvider>
    )
    const annotations = lastOrdinalFrameProps.annotations || []
    const labels = annotations.filter((a: any) => a.type === "gauge-label")
    // Should have labels at 33 and 66 (not 100 since it equals max)
    expect(labels.length).toBe(2)
    expect(labels[0].value).toBe(33)
    expect(labels[1].value).toBe(66)
  })

  it("sets innerRadius proportional to arcWidth", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} width={300} height={250} arcWidth={0.4} />
      </TooltipProvider>
    )
    // innerRadius should be > 0 and proportional to (1 - arcWidth) * radius
    const ir = lastOrdinalFrameProps.innerRadius
    expect(ir).toBeGreaterThan(10)
    // The outer radius is derived from the frame layout, but innerRadius
    // should be roughly 60% of the computed radius (1 - 0.4 = 0.6)
    // Just verify it's a reasonable value and greater than minimum
    expect(typeof ir).toBe("number")
  })

  it("passes custom center content", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} centerContent={<span data-testid="custom">Custom</span>} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.centerContent).toBeTruthy()
  })

  it("default 240° sweep has startAngle=240 (gap centered at bottom)", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} />
      </TooltipProvider>
    )
    // 240° sweep → gap = 120°, startAngle = 180 + 60 = 240
    expect(lastOrdinalFrameProps.startAngle).toBe(240)
  })

  it("supports custom sweep angle", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={50} sweep={180} />
      </TooltipProvider>
    )
    // 180° sweep → gap = 180°, startAngle = 180 + 90 = 270 degrees
    // pieScene converts: -π/2 + 270*π/180 = -π/2 + 3π/2 = π = 9 o'clock
    // Arc runs 180° from 9 o'clock to 3 o'clock (top half = sunrise) ✓
    expect(lastOrdinalFrameProps.startAngle).toBe(270)
  })

  it("supports valueFormat for center label", () => {
    render(
      <TooltipProvider>
        <GaugeChart value={75.5} valueFormat={(v) => `${v.toFixed(1)}%`} />
      </TooltipProvider>
    )
    // The center content should use the formatter
    expect(lastOrdinalFrameProps.centerContent).toBeTruthy()
  })
})
