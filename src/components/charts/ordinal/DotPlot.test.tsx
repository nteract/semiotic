import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { DotPlot } from "./DotPlot"
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

describe("DotPlot", () => {
  const sampleData = [
    { category: "Item A", value: 25 },
    { category: "Item B", value: 40 },
    { category: "Item C", value: 15 },
    { category: "Item D", value: 30 },
    { category: "Item E", value: 35 }
  ]

  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <DotPlot data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    render(
      <TooltipProvider>
        <DotPlot
          data={sampleData}
          categoryLabel="Items"
          valueLabel="Score"
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe("Items")
    expect(lastOrdinalFrameProps.rLabel).toBe("Score")
  })

  // ── Mock-based behavioral assertions ──────────────────────────────────

  describe("StreamOrdinalFrame prop forwarding", () => {
    it("sets chartType to 'point'", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.chartType).toBe("point")
    })

    it("defaults to horizontal orientation", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("horizontal")
    })

    it("maps vertical orientation to 'vertical' projection", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} orientation="vertical" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.projection).toBe("vertical")
    })

    it("defaults sort to true", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oSort).toBe(true)
    })

    it("forwards sort=false as oSort", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} sort={false} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oSort).toBe(false)
    })

    it("forwards sort='asc' as oSort", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} sort="asc" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oSort).toBe("asc")
    })

    it("forwards custom accessors as oAccessor and rAccessor", () => {
      const customData = [
        { name: "A", score: 25 },
        { name: "B", score: 40 }
      ]
      render(
        <TooltipProvider>
          <DotPlot data={customData} categoryAccessor="name" valueAccessor="score" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oAccessor).toBe("name")
      expect(lastOrdinalFrameProps.rAccessor).toBe("score")
    })

    it("passes pieceStyle with dotRadius", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} dotRadius={8} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.pieceStyle).toBe("function")
      const style = lastOrdinalFrameProps.pieceStyle({ category: "Item A", value: 25 })
      expect(style.r).toBe(8)
    })

    it("defaults dotRadius to 5", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} />
        </TooltipProvider>
      )
      const style = lastOrdinalFrameProps.pieceStyle({ category: "Item A", value: 25 })
      expect(style.r).toBe(5)
    })

    it("defaults showGrid to true", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.showGrid).toBe(true)
    })

    it("forwards enableHover", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} enableHover={false} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.enableHover).toBe(false)
    })

    it("forwards width and height as size", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} width={700} height={500} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([700, 500])
    })

    it("forwards categoryPadding as barPadding", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} categoryPadding={15} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.barPadding).toBe(15)
    })
  })
})
