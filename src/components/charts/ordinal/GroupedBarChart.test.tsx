import React from "react"
import { render } from "@testing-library/react"
import { GroupedBarChart } from "./GroupedBarChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
jest.mock("../../OrdinalFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastOrdinalFrameProps = props
      return <div className="ordinalframe"><svg /></div>
    }
  }
})

describe("GroupedBarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  const sampleData = [
    { category: "Q1", product: "A", value: 100 },
    { category: "Q1", product: "B", value: 150 },
    { category: "Q2", product: "A", value: 120 },
    { category: "Q2", product: "B", value: 180 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <GroupedBarChart data={[]} groupBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeFalsy()
  })

  it("sets clusterbar type", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.type).toBe("clusterbar")
  })

  it("sets pieceIDAccessor from groupBy", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.pieceIDAccessor).toBe("product")
  })

  it("supports vertical orientation (default)", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("vertical")
  })

  it("supports horizontal orientation", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" orientation="horizontal" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("horizontal")
  })

  it("accepts custom accessors", () => {
    const customData = [
      { group: "X", series: "S1", count: 42 },
      { group: "X", series: "S2", count: 99 }
    ]

    render(
      <TooltipProvider>
        <GroupedBarChart
          data={customData}
          categoryAccessor="group"
          groupBy="series"
          valueAccessor="count"
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oAccessor).toBe("group")
    expect(lastOrdinalFrameProps.rAccessor).toBe("count")
    expect(lastOrdinalFrameProps.pieceIDAccessor).toBe("series")
  })

  it("shows legend by default", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeDefined()
  })

  it("hides legend when showLegend is false", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" showLegend={false} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeUndefined()
  })

  it("provides a default tooltipContent function", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart
          data={sampleData}
          groupBy="product"
          frameProps={{ oLabel: true }}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe(true)
  })
})
