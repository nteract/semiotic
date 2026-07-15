import type { CapturedOrdinalFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { SwarmPlot } from "./SwarmPlot"
import { TooltipProvider } from "../../store/TooltipStore"

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
    lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
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

    it("forwards axisExtent=\"exact\" to the ordinal frame", () => {
      // SwarmPlot uses buildBaseMetadataProps; verify the helper carries
      // axisExtent through to StreamOrdinalFrame for the r (value) axis.
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} axisExtent="exact" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.axisExtent).toBe("exact")
    })

    it("omits axisExtent when not provided", () => {
      render(
        <TooltipProvider>
          <SwarmPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.axisExtent).toBeUndefined()
    })
  })

  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton, 0 points) then re-rendering as data
    // arrives must not call a different number of hooks between renders —
    // otherwise React throws "Rendered more hooks than during the previous
    // render". Regression guard for the misplaced `setup.earlyReturn` return.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { rerender } = render(
        <TooltipProvider>
          <SwarmPlot loading />
        </TooltipProvider>
      )
      rerender(
        <TooltipProvider>
          <SwarmPlot data={sampleData} categoryAccessor="category" valueAccessor="value" />
        </TooltipProvider>
      )
      // The frame must actually render with the data — if a hooks-count error
      // fired, the chart's error boundary would swallow the render.
      expect(lastOrdinalFrameProps.data).toEqual(sampleData)
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
