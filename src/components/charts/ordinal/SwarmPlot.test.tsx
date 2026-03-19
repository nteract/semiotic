import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { SwarmPlot } from "./SwarmPlot"
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

describe("SwarmPlot", () => {
  const sampleData = [
    { category: "Group A", value: 10 },
    { category: "Group A", value: 12 },
    { category: "Group A", value: 15 },
    { category: "Group A", value: 18 },
    { category: "Group B", value: 20 },
    { category: "Group B", value: 22 },
    { category: "Group B", value: 24 },
    { category: "Group C", value: 8 },
    { category: "Group C", value: 10 },
    { category: "Group C", value: 12 }
  ]

  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    render(
      <TooltipProvider>
        <SwarmPlot
          data={sampleData}
          categoryLabel="Category"
          valueLabel="Value"
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe("Category")
    expect(lastOrdinalFrameProps.rLabel).toBe("Value")
  })

  it("applies custom categoryPadding", () => {
    const { container } = render(
      <TooltipProvider>
        <SwarmPlot data={sampleData} categoryPadding={50} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("uses custom accessors", () => {
    const customData = [
      { name: "A", amount: 10 },
      { name: "A", amount: 12 },
      { name: "B", amount: 20 }
    ]

    const { container } = render(
      <TooltipProvider>
        <SwarmPlot
          data={customData}
          categoryAccessor="name"
          valueAccessor="amount"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamOrdinalFrame prop forwarding", () => {
    it("sets chartType to 'swarm'", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.chartType).toBe("swarm")
    })

    it("sets projection to 'vertical' by default", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("vertical")
    })

    it("maps horizontal orientation to 'horizontal' projection", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} orientation="horizontal" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("horizontal")
    })

    it("maps vertical orientation to 'vertical' projection", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} orientation="vertical" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("vertical")
    })

    it("passes pieceStyle as a function that includes pointRadius", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} pointRadius={6} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.pieceStyle).toBe("function")
      const style = lastOrdinalFrameProps.pieceStyle({ category: "Group A", value: 10 })
      expect(style.r).toBe(6)
    })

    it("passes pieceStyle with default pointRadius of 4", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} />
        </TooltipProvider>
      )
      const style = lastOrdinalFrameProps.pieceStyle({ category: "Group A", value: 10 })
      expect(style.r).toBe(4)
    })

    it("passes pieceStyle with pointOpacity", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} pointOpacity={0.5} />
        </TooltipProvider>
      )
      const style = lastOrdinalFrameProps.pieceStyle({ category: "Group A", value: 10 })
      expect(style.fillOpacity).toBe(0.5)
    })

    it("defaults pointOpacity to 0.7", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} />
        </TooltipProvider>
      )
      const style = lastOrdinalFrameProps.pieceStyle({ category: "Group A", value: 10 })
      expect(style.fillOpacity).toBe(0.7)
    })

    it("forwards custom accessors as oAccessor and rAccessor", () => {
      const customData = [
        { name: "A", amount: 10 },
        { name: "B", amount: 20 }
      ]
      render(
        <TooltipProvider>
          <SwarmPlot data={customData} categoryAccessor="name" valueAccessor="amount" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oAccessor).toBe("name")
      expect(lastOrdinalFrameProps.rAccessor).toBe("amount")
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.enableHover).toBe(false)
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} width={700} height={500} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([700, 500])
    })

    it("forwards categoryPadding as barPadding", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} categoryPadding={30} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.barPadding).toBe(30)
    })
  })
})
