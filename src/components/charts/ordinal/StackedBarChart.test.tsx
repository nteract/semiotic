import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { StackedBarChart } from "./StackedBarChart"
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

describe("StackedBarChart", () => {
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
        <StackedBarChart data={sampleData} stackBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
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
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
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
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("supports normalized (100%) mode", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" normalize={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" colorBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    const { container } = render(
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

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
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
      const customTooltip = (d: any) => <div>custom: {d.product}</div>

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
