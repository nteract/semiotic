import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { DonutChart } from "./DonutChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

describe("DonutChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  const sampleData = [
    { category: "A", value: 30 },
    { category: "B", value: 50 },
    { category: "C", value: 20 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <DonutChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("sets radial projection", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("radial")
  })

  it("includes innerRadius as a direct prop scaled to the chart size", () => {
    // Primary mode default is 400×400 → default innerRadius = 400 * 0.15 = 60.
    // Matches the pre-fix literal at primary size while still scaling down at
    // context/sparkline. The 0.15 ratio intentionally undershoots the frame's
    // actual outer radius so legend + margin allowances don't reduce the ring
    // to a hairline.
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.innerRadius).toBe(60)
  })

  it("accepts custom innerRadius", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} innerRadius={100} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.innerRadius).toBe(100)
  })

  describe("chart mode resolution", () => {
    it("sparkline mode shrinks dimensions and scales innerRadius inside the outer radius", () => {
      render(
        <TooltipProvider>
          <DonutChart data={sampleData} mode="sparkline" />
        </TooltipProvider>
      )
      // Sparkline default is 120×24
      expect(lastOrdinalFrameProps.size).toEqual([120, 24])
      // innerRadius = min(120, 24) * 0.15 = 3.6 (floating-point noise OK)
      expect(lastOrdinalFrameProps.innerRadius).toBeCloseTo(3.6, 5)
      // innerRadius must stay inside the ~12px outer bound — the old literal 60
      // inverted the ring entirely
      expect(lastOrdinalFrameProps.innerRadius).toBeLessThan(12)
    })

    it("context mode shrinks dimensions and scales innerRadius", () => {
      render(
        <TooltipProvider>
          <DonutChart data={sampleData} mode="context" />
        </TooltipProvider>
      )
      // Context default is 400×250
      expect(lastOrdinalFrameProps.size).toEqual([400, 250])
      // innerRadius = min(400, 250) * 0.15 = 37.5
      expect(lastOrdinalFrameProps.innerRadius).toBe(37.5)
    })

    it("user-supplied innerRadius overrides the size-scaled default even in sparkline mode", () => {
      render(
        <TooltipProvider>
          <DonutChart data={sampleData} mode="sparkline" innerRadius={5} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.innerRadius).toBe(5)
    })
  })

  it("renders centerContent via centerContent prop", () => {
    render(
      <TooltipProvider>
        <DonutChart
          data={sampleData}
          centerContent={<span>Total: 100</span>}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.centerContent).toBeDefined()
  })

  it("does not set centerContent without centerContent prop", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.centerContent).toBeUndefined()
  })

  it("defaults to square dimensions", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([400, 400])
  })

  it("shows legend by default", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeDefined()
  })

  it("provides a default tooltipContent function", () => {
    render(
      <TooltipProvider>
        <DonutChart data={sampleData} />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <DonutChart
          data={sampleData}
          frameProps={{ oLabel: "category" }}
        />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oLabel).toBe("category")
  })

  describe("push API", () => {
    it("ref exposes push, pushMany, getData, and clear", () => {
      const ref = React.createRef<any>()
      render(
        <TooltipProvider>
          <DonutChart ref={ref} categoryAccessor="category" valueAccessor="value" />
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
          <DonutChart ref={ref} categoryAccessor="category" valueAccessor="value" />
        </TooltipProvider>
      )
      expect(() => ref.current.push({ category: "A", value: 10 })).not.toThrow()
      expect(() => ref.current.pushMany([{ category: "B", value: 20 }])).not.toThrow()
      expect(() => ref.current.clear()).not.toThrow()
    })

    it("getData returns empty array when frame ref is not connected", () => {
      const ref = React.createRef<any>()
      render(
        <TooltipProvider>
          <DonutChart ref={ref} categoryAccessor="category" valueAccessor="value" />
        </TooltipProvider>
      )
      expect(ref.current.getData()).toEqual([])
    })
  })

  describe("tooltip disabled", () => {
    it("passes noop tooltip when tooltip is false", () => {
      render(
        <TooltipProvider>
          <DonutChart data={sampleData} tooltip={false} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
      expect(lastOrdinalFrameProps.tooltipContent({ category: "A", value: 10 })).toBeNull()
    })
  })
})
