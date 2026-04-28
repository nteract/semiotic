import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { StackedBarChart } from "./StackedBarChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { STACKED_SAMPLE as sampleData } from "../../../test-utils/ordinalFixtures"
import type { Datum } from "../shared/datumTypes"

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

describe("StackedBarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("forwards data + accessors and the stack accessor to the frame", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.chartType).toBe("bar")
    expect(lastOrdinalFrameProps.data).toEqual(sampleData)
    expect(lastOrdinalFrameProps.stackBy).toBe("product")
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={[]} stackBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("shows error when stackBy is missing", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy={undefined as any} />
      </TooltipProvider>
    )

    const errorEl = container.querySelector("[role='alert']")
    expect(errorEl).toBeTruthy()
    expect(errorEl!.textContent).toContain("stackBy")
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" width={800} height={600} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.size).toEqual([800, 600])
  })

  it("accepts categoryLabel and valueLabel props", () => {
    render(
      <TooltipProvider>
        <StackedBarChart
          data={sampleData}
          stackBy="product"
          categoryLabel="Quarter"
          valueLabel="Sales"
        />
      </TooltipProvider>
    )

    // Should pass axis labels to StreamOrdinalFrame
    expect(lastOrdinalFrameProps.showAxes).toBe(true)
    expect(lastOrdinalFrameProps.oLabel).toBe("Quarter")
    expect(lastOrdinalFrameProps.rLabel).toBe("Sales")
  })

  it("supports vertical orientation (default)", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="vertical" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.projection).toBe("vertical")
  })

  it("supports horizontal orientation", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="horizontal" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.projection).toBe("horizontal")
  })

  it("supports normalized (100%) mode", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" normalize={true} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.normalize).toBe(true)
  })

  it("applies color encoding", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" colorBy="product" />
      </TooltipProvider>
    )
    // colorBy enables a per-piece style fn and emits a derived legend.
    expect(typeof lastOrdinalFrameProps.pieceStyle).toBe("function")
    expect(lastOrdinalFrameProps.legend).toBeDefined()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <StackedBarChart
          data={sampleData}
          stackBy="product"
          frameProps={{
            hoverAnnotation: true
          }}
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.hoverAnnotation).toBe(true)
  })

  it("disables hover when enableHover is false", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.enableHover).toBe(false)
  })

  describe("hoverAnnotation", () => {
    it("passes enableHover instead of pieceHoverAnnotation", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.enableHover).toBe(true)
      expect(lastOrdinalFrameProps.pieceHoverAnnotation).toBeUndefined()
    })

    it("disables enableHover when enableHover is false", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.enableHover).toBe(false)
    })

    it("provides a default tooltipContent function", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    })

    it("default tooltip renders stackBy value, category, and value", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const pieceData = {
        category: "Q1",
        product: "A",
        value: 100
      }
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      // Should show stackBy value (product)
      expect(container.textContent).toContain("A")
      // Should show category and piece value
      expect(container.textContent).toContain("Q1")
      expect(container.textContent).toContain("100")
    })

    it("uses user-provided tooltip instead of default", () => {
      const customTooltip = (d: Datum) => <div>custom: {d.product}</div>

      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" tooltip={customTooltip} />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const { container } = render(<>{tooltipFn({ product: "B" })}</>)

      expect(container.textContent).toContain("custom: B")
    })
  })
})
