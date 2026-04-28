import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { GroupedBarChart } from "./GroupedBarChart"
import { TooltipProvider } from "../../store/TooltipStore"
import {
  STACKED_SAMPLE as sampleData,
  GROUP_SERIES_CUSTOM as customData,
} from "../../../test-utils/ordinalFixtures"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

describe("GroupedBarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("forwards data + accessors and the group accessor to the frame", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )
    // GroupedBarChart routes through the frame's clustered-bar layout.
    expect(lastOrdinalFrameProps.chartType).toBe("clusterbar")
    expect(lastOrdinalFrameProps.data).toEqual(sampleData)
    expect(lastOrdinalFrameProps.groupBy).toBe("product")
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <GroupedBarChart data={[]} groupBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("sets clusterbar type", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.chartType).toBe("clusterbar")
  })

  it("sets pieceIDAccessor from groupBy", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.groupBy).toBe("product")
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
    expect(lastOrdinalFrameProps.groupBy).toBe("series")
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
          frameProps={{ oLabel: "category" }}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe("category")
  })
})
