import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { DonutChart } from "./DonutChart"
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

describe("DonutChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  const sampleData = [
    { category: "A", value: 30 },
    { category: "B", value: 50 },
    { category: "C", value: 20 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <DonutChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("sets radial projection", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("radial")
  })

  it("includes innerRadius as a direct prop", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.innerRadius).toBe(60)
  })

  it("accepts custom innerRadius", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} innerRadius={100} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.innerRadius).toBe(100)
  })

  it("renders centerContent via centerContent prop", () => {
    render(
      <TooltipProvider>
        <DonutChart
          data={sampleData}
          centerContent={<span>Total: 100</span>}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.centerContent).toBeDefined()
  })

  it("does not set centerContent without centerContent prop", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.centerContent).toBeUndefined()
  })

  it("defaults to square dimensions", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([400, 400])
  })

  it("shows legend by default", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeDefined()
  })

  it("provides a default tooltipContent function", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <DonutChart
          data={sampleData}
          frameProps={{ oLabel: "category" }}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe("category")
  })
})
