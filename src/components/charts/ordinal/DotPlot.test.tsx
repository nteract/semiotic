import type { CapturedOrdinalFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { DotPlot } from "./DotPlot"
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

describe("DotPlot", () => {
  const sampleData = [
    { category: "Item A", value: 25 },
    { category: "Item B", value: 40 },
    { category: "Item C", value: 15 },
    { category: "Item D", value: 30 },
    { category: "Item E", value: 35 }
  ]

  beforeEach(() => {
    lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
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

    it("defaults sort to 'auto' (insertion order when streaming, value-desc when static)", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.oSort).toBe("auto")
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

  describe("push API", () => {
    it("ref exposes push, pushMany, getData, and clear", () => {
      const ref = React.createRef<React.ElementRef<typeof DotPlot>>()
      render(
        <TooltipProvider>
          <DotPlot ref={ref} categoryAccessor="category" valueAccessor="value" />
        </TooltipProvider>
      )
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current!.push).toBe("function")
      expect(typeof ref.current!.pushMany).toBe("function")
      expect(typeof ref.current!.getData).toBe("function")
      expect(typeof ref.current!.clear).toBe("function")
    })

    it("push does not throw when frame ref is not connected", () => {
      const ref = React.createRef<React.ElementRef<typeof DotPlot>>()
      render(
        <TooltipProvider>
          <DotPlot ref={ref} categoryAccessor="category" valueAccessor="value" />
        </TooltipProvider>
      )
      expect(() => ref.current!.push({ category: "A", value: 10 })).not.toThrow()
      expect(() => ref.current!.pushMany([{ category: "B", value: 20 }])).not.toThrow()
      expect(() => ref.current!.clear()).not.toThrow()
    })

    it("getData returns empty array when frame ref is not connected", () => {
      const ref = React.createRef<React.ElementRef<typeof DotPlot>>()
      render(
        <TooltipProvider>
          <DotPlot ref={ref} categoryAccessor="category" valueAccessor="value" />
        </TooltipProvider>
      )
      expect(ref.current!.getData()).toEqual([])
    })
  })

  describe("tooltip disabled", () => {
    it("passes noop tooltip when tooltip is false", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} tooltip={false} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
      expect(lastOrdinalFrameProps.tooltipContent({ category: "A", value: 10 })).toBeNull()
    })
  })

  // ── regression prop ────────────────────────────────────────────────────
  describe("regression prop", () => {
    it("does not inject a trend annotation when omitted", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.annotations).toBeUndefined()
    })

    it("`regression` injects a default linear trend annotation", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} regression />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.annotations).toEqual([{ type: "trend", method: "linear" }])
    })

    it("forwards method shorthand", () => {
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} regression="loess" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.annotations[0]).toEqual({ type: "trend", method: "loess" })
    })

    it("prepends the trend annotation in front of user annotations", () => {
      const userAnn = { type: "label", x: 1, y: 10, note: "hi" }
      render(
        <TooltipProvider>
          <DotPlot data={sampleData} regression annotations={[userAnn]} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.annotations).toHaveLength(2)
      expect(lastOrdinalFrameProps.annotations[0].type).toBe("trend")
      expect(lastOrdinalFrameProps.annotations[1]).toBe(userAnn)
    })
  })

  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton, 0 dots) then re-rendering as data
    // arrives must not call a different number of hooks between renders —
    // otherwise React throws "Rendered more hooks than during the previous
    // render". Regression guard for the misplaced `setup.earlyReturn` return.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { rerender } = render(
        <TooltipProvider>
          <DotPlot loading />
        </TooltipProvider>
      )
      rerender(
        <TooltipProvider>
          {/* sort=false so the frame receives the array in insertion order */}
          <DotPlot data={sampleData} sort={false} categoryAccessor="category" valueAccessor="value" />
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
