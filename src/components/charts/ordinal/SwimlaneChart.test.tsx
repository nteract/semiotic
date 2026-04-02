import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { SwimlaneChart } from "./SwimlaneChart"
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

describe("SwimlaneChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
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
      const ref = React.createRef<any>()
      render(
        <TooltipProvider>
          <SwimlaneChart ref={ref} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current.push).toBe("function")
      expect(typeof ref.current.pushMany).toBe("function")
      expect(typeof ref.current.getData).toBe("function")
      expect(typeof ref.current.clear).toBe("function")
    })

    it("push does not throw when frame ref is not connected", () => {
      const ref = React.createRef<any>()
      render(
        <TooltipProvider>
          <SwimlaneChart ref={ref} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(() => ref.current.push({ category: "A", task: "Dev", value: 5 })).not.toThrow()
    })

    it("getData returns empty array when frame ref is not connected", () => {
      const ref = React.createRef<any>()
      render(
        <TooltipProvider>
          <SwimlaneChart ref={ref} subcategoryAccessor="task" />
        </TooltipProvider>
      )
      expect(ref.current.getData()).toEqual([])
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

  it("passes showCategoryTicks={false} to frame", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" showCategoryTicks={false} />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.showCategoryTicks).toBe(false)
  })

  it("defaults showCategoryTicks to undefined (frame decides)", () => {
    render(
      <TooltipProvider>
        <SwimlaneChart data={sampleData} subcategoryAccessor="task" />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps.showCategoryTicks).toBeUndefined()
  })
})
