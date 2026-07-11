import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { XYCustomChart } from "./XYCustomChart"
import type { CustomLayout } from "../../stream/customLayout"
import type { RectSceneNode } from "../../stream/types"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Mock StreamXYFrame to inspect the props XYCustomChart forwards.
let lastXYFrameProps: {
  customLayout?: CustomLayout
  layoutConfig?: Record<string, unknown>
  onLayoutError?: unknown
  chartType?: string
  colorAccessor?: unknown
} | null = null
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: {
      customLayout?: CustomLayout
      layoutConfig?: Record<string, unknown>
      onLayoutError?: unknown
      chartType?: string
      colorAccessor?: unknown
    }, _ref: unknown) => {
      lastXYFrameProps = props
      return <div className="stream-xy-frame"><canvas /><svg /></div>
    })
  }
})

describe("XYCustomChart", () => {
  let cleanup: () => void
  beforeEach(() => {
    lastXYFrameProps = null
    cleanup = setupCanvasMock()
  })
  afterEach(() => { cleanup() })

  const trivialLayout: CustomLayout = (ctx) => {
    const node: RectSceneNode = {
      type: "rect",
      x: 0,
      y: 0,
      w: ctx.dimensions.plot.width,
      h: ctx.dimensions.plot.height,
      style: { fill: ctx.resolveColor("__test__") },
      datum: null,
    }
    return { nodes: [node] }
  }

  it("forwards customLayout and chartType=custom to the frame", () => {
    render(
      <TooltipProvider>
        <XYCustomChart
          data={[{ value: 1 }]}
          layout={trivialLayout}
          width={400}
          height={200}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps?.chartType).toBe("custom")
    expect(lastXYFrameProps?.customLayout).toBe(trivialLayout)
  })

  it("forwards layoutConfig", () => {
    render(
      <TooltipProvider>
        <XYCustomChart
          data={[{ value: 1 }]}
          layout={trivialLayout}
          layoutConfig={{ rows: 5, columns: 5 }}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps?.layoutConfig).toEqual({ rows: 5, columns: 5 })
  })

  it("forwards onLayoutError", () => {
    const onLayoutError = vi.fn()
    render(
      <TooltipProvider>
        <XYCustomChart data={[{ value: 1 }]} layout={trivialLayout} onLayoutError={onLayoutError} />
      </TooltipProvider>
    )
    expect(lastXYFrameProps?.onLayoutError).toBe(onLayoutError)
  })

  it("maps colorBy to the frame colorAccessor", () => {
    render(
      <TooltipProvider>
        <XYCustomChart
          data={[{ value: 1, category: "alpha" }]}
          layout={trivialLayout}
          colorBy="category"
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps?.colorAccessor).toBe("category")
  })
})
