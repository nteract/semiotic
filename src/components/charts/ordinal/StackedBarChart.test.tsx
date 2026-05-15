import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { StackedBarChart } from "./StackedBarChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { STACKED_SAMPLE as sampleData } from "../../../test-utils/ordinalFixtures"
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

describe("StackedBarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  // Guards against confusing null-deref failures when an early-return
  // path prevents the mocked StreamOrdinalFrame from rendering. See
  // BarChart.test.tsx for the same helper.
  function frameProps() {
    expect(
      lastOrdinalFrameProps,
      "mocked StreamOrdinalFrame did not capture props — StackedBarChart likely hit an early-return path"
    ).not.toBeNull()
    return lastOrdinalFrameProps as Record<string, any>
  }

  it("forwards data + accessors and the stack accessor to the frame", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" />
      </TooltipProvider>
    )
    const props = frameProps()
    expect(props.chartType).toBe("bar")
    expect(props.data).toEqual(sampleData)
    expect(props.stackBy).toBe("product")
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={[]} stackBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  it("shows error when stackBy is missing", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy={undefined as unknown} />
      </TooltipProvider>
    )

    const errorEl = container.querySelector("[role='alert']")
    expect(errorEl).toBeTruthy()
    expect(errorEl!.textContent).toContain("stackBy")
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" width={800} height={600} />
      </TooltipProvider>
    )
    expect(frameProps().size).toEqual([800, 600])
  })

  it("accepts categoryLabel and valueLabel props", () => {
    render(
      <TooltipProvider>
        <StackedBarChart
          data={sampleData}
          stackBy="product"
          categoryLabel="Quarter"
          valueLabel="Sales"
        />
      </TooltipProvider>
    )

    // Should pass axis labels to StreamOrdinalFrame
    expect(frameProps().showAxes).toBe(true)
    expect(frameProps().oLabel).toBe("Quarter")
    expect(frameProps().rLabel).toBe("Sales")
  })

  it("supports vertical orientation (default)", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="vertical" />
      </TooltipProvider>
    )
    expect(frameProps().projection).toBe("vertical")
  })

  it("supports horizontal orientation", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="horizontal" />
      </TooltipProvider>
    )
    expect(frameProps().projection).toBe("horizontal")
  })

  it("supports normalized (100%) mode", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" normalize={true} />
      </TooltipProvider>
    )
    expect(frameProps().normalize).toBe(true)
  })

  it("applies color encoding", () => {
    // StackedBarChart resolves color via `effectiveColorBy = colorBy || stackBy`.
    // Pass a colorBy that DIFFERS from stackBy so the legend's labels
    // are load-bearing for the colorBy path: a regression that ignored
    // colorBy and fell through to stackBy would emit ["A", "B"]
    // (product values) here instead of ["Q1", "Q2"] (category values).
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" colorBy="category" />
      </TooltipProvider>
    )
    expect(typeof frameProps().pieceStyle).toBe("function")
    const labels = frameProps().legend?.legendGroups?.[0]?.items?.map(
      (i: { label: string }) => i.label,
    )
    expect(labels).toEqual(expect.arrayContaining(["Q1", "Q2"]))
    expect(labels).not.toEqual(expect.arrayContaining(["A"])) // stackBy values shouldn't bleed in
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <StackedBarChart
          data={sampleData}
          stackBy="product"
          frameProps={{
            hoverAnnotation: true
          }}
        />
      </TooltipProvider>
    )
    expect(frameProps().hoverAnnotation).toBe(true)
  })

  it("disables hover when enableHover is false", () => {
    render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
      </TooltipProvider>
    )
    expect(frameProps().enableHover).toBe(false)
  })

  describe("hoverAnnotation", () => {
    it("passes enableHover instead of pieceHoverAnnotation", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      expect(frameProps().enableHover).toBe(true)
      expect(frameProps().pieceHoverAnnotation).toBeUndefined()
    })

    it("disables enableHover when enableHover is false", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
        </TooltipProvider>
      )

      expect(frameProps().enableHover).toBe(false)
    })

    it("provides a default tooltipContent function", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      expect(typeof frameProps().tooltipContent).toBe("function")
    })

    it("default tooltip renders stackBy value, category, and value", () => {
      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" />
        </TooltipProvider>
      )

      const tooltipFn = frameProps().tooltipContent
      const pieceData = {
        category: "Q1",
        product: "A",
        value: 100
      }
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      // Should show stackBy value (product)
      expect(container.textContent).toContain("A")
      // Should show category and piece value
      expect(container.textContent).toContain("Q1")
      expect(container.textContent).toContain("100")
    })

    it("uses user-provided tooltip instead of default", () => {
      const customTooltip = (d: Datum) => <div>custom: {d.product}</div>

      render(
        <TooltipProvider>
          <StackedBarChart data={sampleData} stackBy="product" tooltip={customTooltip} />
        </TooltipProvider>
      )

      const tooltipFn = frameProps().tooltipContent
      const { container } = render(<>{tooltipFn({ product: "B" })}</>)

      expect(container.textContent).toContain("custom: B")
    })
  })
})
