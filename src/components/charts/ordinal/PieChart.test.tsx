import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { PieChart } from "./PieChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    }
  }
})

describe("PieChart", () => {
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
        <PieChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <PieChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("sets radial projection", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("radial")
  })

  it("sets pie chartType", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.chartType).toBe("pie")
  })

  it("passes startAngle prop", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} startAngle={90} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.startAngle).toBe(90)
  })

  it("defaults to square dimensions", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([400, 400])
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} width={500} height={500} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([500, 500])
  })

  it("accepts custom accessors", () => {
    const customData = [
      { name: "X", count: 42 },
      { name: "Y", count: 99 }
    ]

    render(
      <TooltipProvider>
        <PieChart
          data={customData}
          categoryAccessor="name"
          valueAccessor="count"
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oAccessor).toBe("name")
    expect(lastOrdinalFrameProps.rAccessor).toBe("count")
  })

  it("shows legend by default", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeDefined()
  })

  it("hides legend when showLegend is false", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} showLegend={false} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeUndefined()
  })

  it("provides a default tooltipContent function", () => {
    render(
      <TooltipProvider>
        <PieChart data={sampleData} />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <PieChart
          data={sampleData}
          frameProps={{ oLabel: "category" }}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe("category")
  })
})
