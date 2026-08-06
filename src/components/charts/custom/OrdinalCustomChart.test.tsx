import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { OrdinalCustomChart } from "./OrdinalCustomChart"
import type { OrdinalCustomLayout } from "../../stream/ordinalCustomLayout"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Mock StreamOrdinalFrame to inspect the props OrdinalCustomChart forwards —
// same seam the XYCustomChart test uses. The custom-chart HOCs are thin
// forwarding shells; the contract under test is that the user's layout,
// config, and accessors reach the frame unmodified.
let lastOrdinalFrameProps: {
  customLayout?: OrdinalCustomLayout
  layoutConfig?: Record<string, unknown>
  onLayoutError?: unknown
  chartType?: string
  oAccessor?: unknown
  rAccessor?: unknown
  colorAccessor?: unknown
  title?: unknown
  description?: unknown
  summary?: unknown
  accessibleTable?: unknown
  animate?: unknown
  tooltipContent?: (datum: Record<string, unknown>) => React.ReactNode
} | null = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: {
      customLayout?: OrdinalCustomLayout
      layoutConfig?: Record<string, unknown>
      onLayoutError?: unknown
      chartType?: string
      oAccessor?: unknown
      rAccessor?: unknown
      colorAccessor?: unknown
    }, _ref: unknown) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><canvas /><svg /></div>
    })
  }
})

describe("OrdinalCustomChart", () => {
  let cleanup: () => void
  beforeEach(() => {
    lastOrdinalFrameProps = null
    cleanup = setupCanvasMock()
  })
  afterEach(() => { cleanup() })

  const trivialLayout: OrdinalCustomLayout = (ctx) => ({
    nodes: [
      {
        type: "rect",
        x: 0,
        y: 0,
        w: ctx.dimensions.plot.width,
        h: ctx.dimensions.plot.height,
        style: { fill: ctx.resolveColor("__test__") },
        datum: null,
      },
    ],
  })

  it("forwards customLayout and chartType=custom to the frame", () => {
    render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[{ category: "A", value: 1 }]}
          layout={trivialLayout}
          width={400}
          height={200}
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps?.chartType).toBe("custom")
    expect(lastOrdinalFrameProps?.customLayout).toBe(trivialLayout)
  })

  it("forwards layoutConfig", () => {
    render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[{ category: "A", value: 1 }]}
          layout={trivialLayout}
          layoutConfig={{ showLabels: true }}
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps?.layoutConfig).toEqual({ showLabels: true })
  })

  it("forwards onLayoutError", () => {
    const onLayoutError = vi.fn()
    render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[{ category: "A", value: 1 }]}
          layout={trivialLayout}
          onLayoutError={onLayoutError}
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps?.onLayoutError).toBe(onLayoutError)
  })

  it("maps categoryAccessor/valueAccessor to the frame's o/r accessors", () => {
    render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[{ region: "EU", total: 12 }]}
          layout={trivialLayout}
          categoryAccessor="region"
          valueAccessor="total"
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps?.oAccessor).toBe("region")
    expect(lastOrdinalFrameProps?.rAccessor).toBe("total")
  })

  it("maps colorBy to the frame colorAccessor", () => {
    render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[{ region: "EU", total: 12, segment: "growth" }]}
          layout={trivialLayout}
          colorBy="segment"
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps?.colorAccessor).toBe("segment")
  })

  it.each([
    ["omitted", undefined],
    ["true", true],
  ])("leaves the frame's default tooltip active when tooltip is %s", (_label, tooltip) => {
    render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[{ category: "A", value: 1 }]}
          layout={trivialLayout}
          tooltip={tooltip}
        />
      </TooltipProvider>
    )

    expect("tooltipContent" in (lastOrdinalFrameProps ?? {})).toBe(false)
  })

  it("normalizes false, declarative, and custom tooltip props", () => {
    const hover = {
      __semioticHoverData: true,
      data: { category: "A", label: "Alpha", value: 3 },
      x: 10,
      y: 20,
    }
    const custom = vi.fn((datum: Record<string, unknown>) => (
      <span>{String(datum.label)}</span>
    ))
    const { rerender } = render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[hover.data]}
          layout={trivialLayout}
          tooltip={false}
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps?.tooltipContent?.(hover)).toBeNull()

    rerender(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[hover.data]}
          layout={trivialLayout}
          tooltip={{ title: "label", fields: ["value"] }}
        />
      </TooltipProvider>
    )
    const configured = render(<>{lastOrdinalFrameProps?.tooltipContent?.(hover)}</>)
    expect(configured.container.textContent).toContain("Alpha")
    expect(configured.container.textContent).toContain("3")

    rerender(
      <TooltipProvider>
        <OrdinalCustomChart data={[hover.data]} layout={trivialLayout} tooltip={custom} />
      </TooltipProvider>
    )
    const customized = render(<>{lastOrdinalFrameProps?.tooltipContent?.(hover)}</>)
    expect(custom).toHaveBeenCalledWith(hover.data)
    expect(customized.container.textContent).toBe("Alpha")
    expect(customized.container.querySelectorAll(".semiotic-tooltip")).toHaveLength(1)
  })

  it.each([
    ["string", "multi" as const],
    ["object", { mode: "multi" as const }],
  ])("degrades unsupported %s multi mode to useful single-datum content", (_label, tooltip) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      render(
        <TooltipProvider>
          <OrdinalCustomChart
            data={[{ category: "A", label: "Alpha", value: 3 }]}
            layout={trivialLayout}
            tooltip={tooltip}
          />
        </TooltipProvider>
      )
      const content = render(<>{lastOrdinalFrameProps?.tooltipContent?.({
        __semioticHoverData: true,
        data: { category: "A", label: "Alpha", value: 3 },
        x: 10,
        y: 20,
      })}</>)
      expect(content.container.textContent).toContain("Alpha")
      expect(content.container.textContent).toContain("3")
    } finally {
      warn.mockRestore()
    }
  })

  it("forwards shared chart metadata and animation", () => {
    render(
      <TooltipProvider>
        <OrdinalCustomChart
          data={[{ category: "A", value: 1 }]}
          layout={trivialLayout}
          title="Ordinal title"
          description="Ordinal description"
          summary="Ordinal summary"
          accessibleTable={false}
          animate={false}
        />
      </TooltipProvider>
    )
    expect(lastOrdinalFrameProps).toMatchObject({
      title: "Ordinal title",
      description: "Ordinal description",
      summary: "Ordinal summary",
      accessibleTable: false,
      animate: false,
    })
  })
})
