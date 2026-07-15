import type { CapturedOrdinalFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { SwimlaneChart } from "./SwimlaneChart"
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

describe("SwimlaneChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
  })

  const sampleData = [
    { category: "Lane A", task: "Design", value: 3 },
    { category: "Lane A", task: "Dev", value: 5 },
    { category: "Lane B", task: "Design", value: 2 },
    { category: "Lane B", task: "QA", value: 4 },
  ]

  it("renders without crashing with required props", () => {
    const { container } = render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <SwimlaneChart data={[]} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("passes swimlane chartType to StreamOrdinalFrame", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.chartType).toBe("swimlane")
  })

  it("passes stackBy from subcategoryAccessor", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.stackBy).toBe("task")
  })

  it("uses default accessors when not specified", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.oAccessor).toBe("category")
    expect(lastOrdinalFrameProps.rAccessor).toBe("value")
  })

  it("supports custom accessors", () => {
    const customData = [
      { lane: "A", type: "X", size: 10 },
      { lane: "B", type: "Y", size: 20 },
    ]
    render(
      <TooltipProvider>
        <SwimlaneChart
          data={customData}
          categoryAccessor="lane"
          subcategoryAccessor="type"
          valueAccessor="size"
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.oAccessor).toBe("lane")
    expect(lastOrdinalFrameProps.rAccessor).toBe("size")
    expect(lastOrdinalFrameProps.stackBy).toBe("type")
  })

  it("defaults to horizontal projection", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.projection).toBe("horizontal")
  })

  it("supports vertical orientation", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" orientation="vertical" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.projection).toBe("vertical")
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" width={800} height={500} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.size).toEqual([800, 500])
  })

  describe("brush support", () => {
    it("passes brush and onBrush when brush prop is set", () => {
      const onBrush = vi.fn()
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" brush onBrush={onBrush} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.brush).toEqual({ dimension: "r" })
      expect(typeof lastOrdinalFrameProps.onBrush).toBe("function")
    })

    it("does not pass brush when brush prop is not set", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.brush).toBeUndefined()
      expect(lastOrdinalFrameProps.onBrush).toBeUndefined()
    })

    it("passes brush when linkedBrush is set even without explicit brush prop", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" linkedBrush="myBrush" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.brush).toEqual({ dimension: "r" })
    })

    it("invokes onBrush callback when brush handler fires", () => {
      const onBrush = vi.fn()
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" brush onBrush={onBrush} />
        </TooltipProvider>
      )
      // Simulate the brush callback
      const brushHandler = lastOrdinalFrameProps.onBrush
      brushHandler({ r: [5, 15] })
      expect(onBrush).toHaveBeenCalledWith({ r: [5, 15] })
    })

    it("invokes onBrush with null to clear brush", () => {
      const onBrush = vi.fn()
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" brush onBrush={onBrush} />
        </TooltipProvider>
      )
      lastOrdinalFrameProps.onBrush(null)
      expect(onBrush).toHaveBeenCalledWith(null)
    })
  })

  describe("push API", () => {
    it("ref exposes push, pushMany, getData, and clear", () => {
      const ref = React.createRef<React.ElementRef<typeof SwimlaneChart>>()
      render(
        <TooltipProvider>
          <SwimlaneChart ref={ref} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current!.push).toBe("function")
      expect(typeof ref.current!.pushMany).toBe("function")
      expect(typeof ref.current!.getData).toBe("function")
      expect(typeof ref.current!.clear).toBe("function")
    })

    it("push does not throw when frame ref is not connected", () => {
      const ref = React.createRef<React.ElementRef<typeof SwimlaneChart>>()
      render(
        <TooltipProvider>
          <SwimlaneChart ref={ref} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(() => ref.current!.push({ category: "A", task: "Dev", value: 5 })).not.toThrow()
    })

    it("getData returns empty array when frame ref is not connected", () => {
      const ref = React.createRef<React.ElementRef<typeof SwimlaneChart>>()
      render(
        <TooltipProvider>
          <SwimlaneChart ref={ref} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(ref.current!.getData()).toEqual([])
    })
  })

  describe("legend", () => {
    it("shows legend when colorBy is set", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" colorBy="task" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.legend).toBeDefined()
    })
  })

  describe("tooltip disabled", () => {
    it("passes noop tooltip when tooltip is false", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" tooltip={false} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
      expect(lastOrdinalFrameProps.tooltipContent({ category: "A" })).toBeNull()
    })
  })

  describe("roundedTop", () => {
    it("forwards roundedTop to the ordinal frame", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" roundedTop={6} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.roundedTop).toBe(6)
    })

    it("omits roundedTop when not provided", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.roundedTop).toBeUndefined()
    })
  })

  it("passes showCategoryTicks={false} to frame and suppresses oLabel", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" showCategoryTicks={false} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.showCategoryTicks).toBe(false)
    expect(lastOrdinalFrameProps.oLabel).toBeUndefined()
  })

  it("defaults showCategoryTicks to undefined (frame decides)", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.showCategoryTicks).toBeUndefined()
  })

  describe("chart mode resolution", () => {
    it("sparkline mode shrinks dimensions and turns axes off", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" mode="sparkline" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([120, 24])
      expect(lastOrdinalFrameProps.showAxes).toBe(false)
    })

    it("context mode shrinks dimensions and turns axes off", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" mode="context" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([400, 250])
      expect(lastOrdinalFrameProps.showAxes).toBe(false)
    })

    it("primary mode uses the 600×400 default with axes on", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.size).toEqual([600, 400])
      expect(lastOrdinalFrameProps.showAxes).toBe(true)
    })

    it("primary mode defaults barPadding to 40", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.barPadding).toBe(40)
    })

    it("sparkline mode caps barPadding at 1px for legible lanes", () => {
      // 2 unique categories fit comfortably in 24px height; padding sits at
      // the 1px target rather than the 40px default.
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" mode="sparkline" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.barPadding).toBe(1)
    })

    it("sparkline mode shrinks barPadding below 1 when categories crowd the canvas", () => {
      // 10 categories at 24px height with 1px padding would shrink each lane
      // below 2px. The formula `(avail - 2n) / (n - 1)` yields ~0.44px.
      const crowdedData = Array.from({ length: 10 }, (_, i) => ({
        category: `Lane ${i}`, task: "t", value: 1,
      }))
      render(
        <TooltipProvider>
          <SwimlaneChart data={crowdedData} subcategoryAccessor="task" mode="sparkline" />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.barPadding).toBeLessThan(1)
      expect(lastOrdinalFrameProps.barPadding).toBeGreaterThanOrEqual(0)
    })

    it("user-supplied barPadding wins over mode default", () => {
      render(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" mode="sparkline" barPadding={10} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.barPadding).toBe(10)
    })
  })

  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton, 0 lanes) then re-rendering as data
    // arrives must not call a different number of hooks between renders —
    // otherwise React throws "Rendered more hooks than during the previous
    // render". Regression guard for the misplaced `setup.earlyReturn` return.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { rerender } = render(
        <TooltipProvider>
          <SwimlaneChart subcategoryAccessor="task" loading />
        </TooltipProvider>
      )
      rerender(
        <TooltipProvider>
          <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
        </TooltipProvider>
      )
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
