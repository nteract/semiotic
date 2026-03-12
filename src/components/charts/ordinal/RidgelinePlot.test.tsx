import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { RidgelinePlot } from "./RidgelinePlot"
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

describe("RidgelinePlot", () => {
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
        <RidgelinePlot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamOrdinalFrame prop forwarding", () => {
    it("sets chartType to 'ridgeline'", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.chartType).toBe("ridgeline")
    })

    it("forwards amplitude prop", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} amplitude={2.5} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.amplitude).toBe(2.5)
    })

    it("defaults amplitude to 1.5", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.amplitude).toBe(1.5)
    })

    it("defaults to horizontal orientation", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("horizontal")
    })

    it("maps vertical orientation to 'vertical' projection", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} orientation="vertical" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("vertical")
    })

    it("forwards custom accessors as oAccessor and rAccessor", () => {
      const customData = [
        { name: "A", amount: 10 },
        { name: "A", amount: 12 },
        { name: "B", amount: 20 }
      ]
      render(
        <TooltipProvider>
          <RidgelinePlot data={customData} categoryAccessor="name" valueAccessor="amount" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oAccessor).toBe("name")
      expect(lastOrdinalFrameProps.rAccessor).toBe("amount")
    })

    it("forwards bins prop", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} bins={30} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.bins).toBe(30)
    })

    it("defaults bins to 20", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.bins).toBe(20)
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} width={800} height={500} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([800, 500])
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.enableHover).toBe(false)
    })

    it("passes summaryStyle as a function", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.summaryStyle).toBe("function")
    })

    it("provides a tooltipContent function", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    })

    it("forwards categoryLabel and valueLabel", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} categoryLabel="Region" valueLabel="Temperature" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oLabel).toBe("Region")
      expect(lastOrdinalFrameProps.rLabel).toBe("Temperature")
    })

    it("forwards title when provided", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} title="Distribution" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.title).toBe("Distribution")
    })

    it("sets oSort to false", () => {
      render(
        <TooltipProvider>
          <RidgelinePlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oSort).toBe(false)
    })
  })
})
