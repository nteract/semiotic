import React from "react"
import { render } from "@testing-library/react"
import { StackedBarChart } from "./StackedBarChart"
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

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={[]} stackBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeFalsy()
  })

  it("warns when stackBy is missing", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation()

    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy={undefined as any} />
      </TooltipProvider>
    )

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("stackBy prop is required"))
    consoleSpy.mockRestore()
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

    // Should pass axes config to OrdinalFrame
    expect(lastOrdinalFrameProps.axes).toBeDefined()
    expect(lastOrdinalFrameProps.axes.length).toBeGreaterThan(0)
  })

  it("supports vertical orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports normalized (100%) mode", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" normalize={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" colorBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart
          data={sampleData}
          stackBy="product"
          frameProps={{
            pieceHoverAnnotation: true
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  describe("hoverAnnotation", () => {
    it("passes hoverAnnotation instead of pieceHoverAnnotation", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.hoverAnnotation).toBe(true)
      expect(lastOrdinalFrameProps.pieceHoverAnnotation).toBeUndefined()
    })

    it("disables hoverAnnotation when enableHover is false", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.hoverAnnotation).toBe(false)
    })

    it("provides a default tooltipContent function", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    })

    it("default tooltip renders subcategory, value, and column total", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      // Simulate piece data from unified hoverAnnotation (includes pieces from column)
      const pieceData = {
        category: "Q1",
        product: "A",
        value: 100,
        pieces: [
          { category: "Q1", product: "A", value: 100 },
          { category: "Q1", product: "B", value: 150 }
        ]
      }
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      // Should show stackBy value (product)
      expect(container.textContent).toContain("A")
      // Should show category and piece value
      expect(container.textContent).toContain("Q1")
      expect(container.textContent).toContain("100")
      // Should show column total (Q1 total = 100 + 150 = 250)
      expect(container.textContent).toContain("250")
    })

    it("default tooltip omits total when column has one piece", () => {
      const singlePieceData = [
        { category: "Q1", product: "A", value: 100 }
      ]

      render(
        <TooltipProvider>
          <StackedBarChart data={singlePieceData} stackBy="product" />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const pieceData = {
        category: "Q1",
        product: "A",
        value: 100,
        pieces: [{ category: "Q1", product: "A", value: 100 }]
      }
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      // Should NOT show "Total" when only one piece in column
      expect(container.textContent).not.toContain("Total")
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
