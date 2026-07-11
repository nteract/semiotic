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
})
