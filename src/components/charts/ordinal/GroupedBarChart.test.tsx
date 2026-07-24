import type { CapturedOrdinalFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { GroupedBarChart } from "./GroupedBarChart"
import { TooltipProvider } from "../../store/TooltipStore"
import {
  STACKED_SAMPLE,
  GROUP_SERIES_CUSTOM,
} from "../../../test-utils/ordinalFixtures"

const sampleData = [...STACKED_SAMPLE]
const customData = [...GROUP_SERIES_CUSTOM]

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamOrdinalFrameHandle>, CapturedOrdinalFrameProps>((props, _ref) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

describe("GroupedBarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
  })

  // Guards against confusing null-deref failures when an early-return
  // path prevents the mocked StreamOrdinalFrame from rendering. See
  // BarChart.test.tsx for the same helper.
  function frameProps() {
    expect(
      lastOrdinalFrameProps,
      "mocked StreamOrdinalFrame did not capture props — GroupedBarChart likely hit an early-return path"
    ).not.toBeNull()
    return lastOrdinalFrameProps
  }

  it("forwards data + accessors and the group accessor to the frame", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )
    // GroupedBarChart routes through the frame's clustered-bar layout.
    const props = frameProps()
    expect(props.chartType).toBe("clusterbar")
    expect(props.data).toEqual(sampleData)
    expect(props.groupBy).toBe("product")
  })

  it("forwards normalized gradient stops", () => {
    const gradientFill = {
      stops: [
        { offset: 0, color: "#f00" },
        { offset: 1, color: "#00f" },
      ],
    }
    render(
      <TooltipProvider>
        <GroupedBarChart
          data={sampleData}
          groupBy="product"
          gradientFill={gradientFill}
        />
      </TooltipProvider>
    )
    expect(frameProps().gradientFill).toEqual(gradientFill)
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

    expect(frameProps().chartType).toBe("clusterbar")
  })

  it("sets pieceIDAccessor from groupBy", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(frameProps().groupBy).toBe("product")
  })

  it("supports vertical orientation (default)", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(frameProps().projection).toBe("vertical")
  })

  it("supports horizontal orientation", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" orientation="horizontal" />
      </TooltipProvider>
    )

    expect(frameProps().projection).toBe("horizontal")
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

    expect(frameProps().oAccessor).toBe("group")
    expect(frameProps().rAccessor).toBe("count")
    expect(frameProps().groupBy).toBe("series")
  })

  it("shows legend by default", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(frameProps().legend).toBeDefined()
  })

  it("hides legend when showLegend is false", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" showLegend={false} />
      </TooltipProvider>
    )

    expect(frameProps().legend).toBeUndefined()
  })

  it("provides a default tooltipContent function", () => {
    render(
      <TooltipProvider>
        <GroupedBarChart data={sampleData} groupBy="product" />
      </TooltipProvider>
    )

    expect(typeof frameProps().tooltipContent).toBe("function")
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

    expect(frameProps().oLabel).toBe("category")
  })

  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton, 0 bars) then re-rendering as data
    // arrives must not call a different number of hooks between renders —
    // otherwise React throws "Rendered more hooks than during the previous
    // render". Regression guard for the misplaced `setup.earlyReturn` return.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { rerender } = render(
        <TooltipProvider>
          <GroupedBarChart groupBy="product" loading />
        </TooltipProvider>
      )
      rerender(
        <TooltipProvider>
          <GroupedBarChart data={sampleData} groupBy="product" />
        </TooltipProvider>
      )
      expect(frameProps().data).toEqual(sampleData)
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
