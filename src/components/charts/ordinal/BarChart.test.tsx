import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { BarChart } from "./BarChart"
import { TooltipProvider } from "../../store/TooltipStore"
import {
  BAR_SAMPLE as sampleData,
  BAR_INITIAL as initialData,
  BAR_EXTENDED as newData,
  BAR_COLORED as coloredData,
  NAMED_COUNT_DATA as customData,
} from "../../../test-utils/ordinalFixtures"
import type { Datum } from "../shared/datumTypes"

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

describe("BarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={[]} />
      </TooltipProvider>
    )

    // Should not render frame when data is empty
    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          categoryLabel="Category"
          valueLabel="Value"
        />
      </TooltipProvider>
    )

    // Should pass axis labels to StreamOrdinalFrame
    expect(lastOrdinalFrameProps.showAxes).toBe(true)
    expect(lastOrdinalFrameProps.oLabel).toBe("Category")
    expect(lastOrdinalFrameProps.rLabel).toBe("Value")
  })

  it("accepts custom accessors", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={customData}
          categoryAccessor="name"
          valueAccessor="count"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("supports vertical orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("sorts data in ascending order", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} sort="asc" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("sorts data in descending order", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} sort="desc" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("sorts with custom function", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          sort={(a, b) => a.value - b.value}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom color scheme", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          colorBy="category"
          colorScheme="tableau10"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts custom bar padding", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} barPadding={10} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          frameProps={{
            hoverAnnotation: true,
            oLabel: "category"
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("updates when data changes", () => {
    const { container, rerender } = render(
      <TooltipProvider>
        <BarChart data={initialData} />
      </TooltipProvider>
    )

    const initialFrame = container.querySelector(".stream-ordinal-frame")
    expect(initialFrame).toBeTruthy()

    // Update with more data
    rerender(
      <TooltipProvider>
        <BarChart data={newData} />
      </TooltipProvider>
    )

    const updatedFrame = container.querySelector(".stream-ordinal-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  it("respects showGrid prop", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} showGrid={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeTruthy()
  })

  // Legend Tests
  describe("Legend behavior", () => {
    it("shows legend automatically when colorBy is specified", () => {
      render(
        <TooltipProvider>
          <BarChart data={coloredData} colorBy="type" />
        </TooltipProvider>
      )

      // Check that legend config is passed to OrdinalFrame
      expect(lastOrdinalFrameProps.legend).toBeDefined()
    })

    it("does not show legend when colorBy is not specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      // Legend items should not be present
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBe(0)
    })

    it("respects showLegend=false even when colorBy is specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BarChart
            data={coloredData}
            colorBy="type"
            showLegend={false}
          />
        </TooltipProvider>
      )

      // Legend items should not be present
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBe(0)
    })

    it("adjusts right margin when legend is present", () => {
      render(
        <TooltipProvider>
          <BarChart
            data={coloredData}
            colorBy="type"
          />
        </TooltipProvider>
      )

      // Right margin should be at least 110 when legend is present
      expect(lastOrdinalFrameProps.margin.right).toBeGreaterThanOrEqual(110)
      expect(lastOrdinalFrameProps.legend).toBeDefined()
    })
  })

  describe("hoverAnnotation", () => {
    it("passes enableHover instead of pieceHoverAnnotation", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.enableHover).toBe(true)
      expect(lastOrdinalFrameProps.pieceHoverAnnotation).toBeUndefined()
    })

    it("disables enableHover when enableHover is false", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} enableHover={false} />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.enableHover).toBe(false)
    })

    it("provides a default tooltipContent function", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    })

    it("default tooltip renders category and value from piece data", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const pieceData = { category: "A", value: 10 }
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      expect(container.textContent).toContain("A")
      expect(container.textContent).toContain("10")
    })

    it("default tooltip uses custom accessors", () => {
      render(
        <TooltipProvider>
          <BarChart data={customData} categoryAccessor="name" valueAccessor="count" />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const pieceData = customData[0]
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      expect(container.textContent).toContain(pieceData.name)
      expect(container.textContent).toContain(String(pieceData.count))
    })

    it("uses user-provided tooltip instead of default", () => {
      const customTooltip = (d: Datum) => <div>custom: {d.category}</div>

      render(
        <TooltipProvider>
          <BarChart data={sampleData} tooltip={customTooltip} />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const { container } = render(<>{tooltipFn({ category: "B" })}</>)

      expect(container.textContent).toContain("custom: B")
    })
  })

  describe("push API", () => {
    it("ref exposes push, pushMany, getData, and clear", () => {
      const ref = React.createRef<any>()
      render(
        <TooltipProvider>
          <BarChart ref={ref} categoryAccessor="category" valueAccessor="value" />
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
          <BarChart ref={ref} categoryAccessor="category" valueAccessor="value" />
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
          <BarChart ref={ref} categoryAccessor="category" valueAccessor="value" />
        </TooltipProvider>
      )
      expect(ref.current.getData()).toEqual([])
    })
  })

  describe("tooltip disabled", () => {
    it("passes noop tooltip when tooltip is false", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} tooltip={false} />
        </TooltipProvider>
      )
      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
      expect(lastOrdinalFrameProps.tooltipContent({ category: "A", value: 10 })).toBeNull()
    })
  })

  // ── Top-level primitive style props (Phase B) ─────────────────────────
  //
  // `stroke` / `strokeWidth` / `opacity` on BaseChartProps should reach
  // every rect rendered by BarChart. Precedence test confirms the top-level
  // prop wins over frameProps.pieceStyle for matching keys.
  describe("primitive style props", () => {
    it("top-level stroke + strokeWidth reach pieceStyle output", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} stroke="#ff00aa" strokeWidth={3} />
        </TooltipProvider>
      )
      const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
      const style = pieceStyleFn({ category: "A", value: 10 })
      expect(style.stroke).toBe("#ff00aa")
      expect(style.strokeWidth).toBe(3)
    })

    it("top-level opacity reaches pieceStyle output", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} opacity={0.4} />
        </TooltipProvider>
      )
      const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
      const style = pieceStyleFn({ category: "A", value: 10 })
      expect(style.opacity).toBe(0.4)
    })

    it("top-level stroke wins over frameProps.pieceStyle stroke", () => {
      render(
        <TooltipProvider>
          <BarChart
            data={sampleData}
            stroke="#topLevel"
            frameProps={{ pieceStyle: () => ({ stroke: "#fromFrameProps" }) }}
          />
        </TooltipProvider>
      )
      const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
      const style = pieceStyleFn({ category: "A", value: 10 })
      expect(style.stroke).toBe("#topLevel")
    })

    it("frameProps.pieceStyle still controls fields the top-level props don't override", () => {
      render(
        <TooltipProvider>
          <BarChart
            data={sampleData}
            stroke="#topLevel"
            frameProps={{ pieceStyle: () => ({ stroke: "#fromFrameProps", strokeDasharray: "4,2" }) }}
          />
        </TooltipProvider>
      )
      const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
      const style = pieceStyleFn({ category: "A", value: 10 })
      expect(style.stroke).toBe("#topLevel")
      expect(style.strokeDasharray).toBe("4,2")
    })

    it("does not add primitive keys when none of the three props are set", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )
      const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
      const style = pieceStyleFn({ category: "A", value: 10 })
      expect(style).not.toHaveProperty("stroke")
      expect(style).not.toHaveProperty("strokeWidth")
      expect(style).not.toHaveProperty("opacity")
    })
  })

  describe("gradientFill", () => {
    it("is omitted when not set", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.gradientFill).toBeUndefined()
    })

    it("resolves `true` to default 80%/5% opacity stops (matches AreaChart)", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} gradientFill />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.gradientFill).toEqual({ topOpacity: 0.8, bottomOpacity: 0.05 })
    })

    it("passes explicit opacity object through unchanged", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} gradientFill={{ topOpacity: 0.9, bottomOpacity: 0.2 }} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.gradientFill).toEqual({ topOpacity: 0.9, bottomOpacity: 0.2 })
    })

    it("passes colorStops object through unchanged", () => {
      const stops = { colorStops: [{ offset: 0, color: "#f00" }, { offset: 1, color: "#00f" }] }
      render(
        <TooltipProvider>
          <BarChart data={sampleData} gradientFill={stops} />
        </TooltipProvider>
      )
      expect(lastOrdinalFrameProps.gradientFill).toEqual(stops)
    })
  })
})
