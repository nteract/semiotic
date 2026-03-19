import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { BoxPlot } from "./BoxPlot"
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

describe("BoxPlot", () => {
  const sampleData = [
    { category: "Group A", value: 10 },
    { category: "Group A", value: 12 },
    { category: "Group A", value: 15 },
    { category: "Group A", value: 18 },
    { category: "Group A", value: 20 },
    { category: "Group B", value: 15 },
    { category: "Group B", value: 18 },
    { category: "Group B", value: 20 },
    { category: "Group B", value: 22 },
    { category: "Group B", value: 25 },
    { category: "Group C", value: 5 },
    { category: "Group C", value: 8 },
    { category: "Group C", value: 10 },
    { category: "Group C", value: 12 },
    { category: "Group C", value: 15 }
  ]

  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <BoxPlot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    render(
      <TooltipProvider>
        <BoxPlot
          data={sampleData}
          categoryLabel="Category"
          valueLabel="Value"
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe("Category")
    expect(lastOrdinalFrameProps.rLabel).toBe("Value")
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamOrdinalFrame prop forwarding", () => {
    it("sets chartType to 'boxplot'", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.chartType).toBe("boxplot")
    })

    it("sets projection to 'vertical' by default", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("vertical")
    })

    it("maps horizontal orientation to 'horizontal' projection", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} orientation="horizontal" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("horizontal")
    })

    it("forwards showOutliers as true by default", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.showOutliers).toBe(true)
    })

    it("forwards showOutliers as false when set", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} showOutliers={false} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.showOutliers).toBe(false)
    })

    it("forwards custom accessors as oAccessor and rAccessor", () => {
      const customData = [
        { name: "A", amount: 10 },
        { name: "A", amount: 15 },
        { name: "B", amount: 20 }
      ]
      render(
        <TooltipProvider>
          <BoxPlot data={customData} categoryAccessor="name" valueAccessor="amount" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oAccessor).toBe("name")
      expect(lastOrdinalFrameProps.rAccessor).toBe("amount")
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.enableHover).toBe(false)
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} width={700} height={500} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([700, 500])
    })

    it("forwards categoryPadding as barPadding", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} categoryPadding={40} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.barPadding).toBe(40)
    })

    it("passes summaryStyle as a function", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.summaryStyle).toBe("function")
    })

    it("provides a tooltipContent function", () => {
      render(
        <TooltipProvider>
          <BoxPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    })
  })
})
