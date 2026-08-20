import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { WaterfallChart } from "./WaterfallChart"
import { TooltipProvider } from "../../store/TooltipStore"

let lastXYFrameProps = {} as CapturedXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamXYFrameHandle>, CapturedXYFrameProps>((props, _ref) => {
      lastXYFrameProps = props
      return <div className="stream-xy-frame"><svg /></div>
    })
  }
})

const sample = [
  { step: "Start", value: 100 },
  { step: "Sales", value: 40 },
  { step: "Costs", value: -25 },
  { step: "Tax", value: -10 },
]

describe("WaterfallChart", () => {
  beforeEach(() => {
    lastXYFrameProps = {} as CapturedXYFrameProps
  })

  it("forwards waterfall chartType and coerces categorical x to indices", () => {
    render(
      <TooltipProvider>
        <WaterfallChart
          data={sample}
          xAccessor="step"
          yAccessor="value"
          width={400}
          height={300}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.chartType).toBe("waterfall")
    expect(lastXYFrameProps.xAccessor).toBe("__waterfallX")
    expect(lastXYFrameProps.yAccessor).toBe("value")
    expect(lastXYFrameProps.data).toEqual([
      expect.objectContaining({ step: "Start", __waterfallX: 0 }),
      expect.objectContaining({ step: "Sales", __waterfallX: 1 }),
      expect.objectContaining({ step: "Costs", __waterfallX: 2 }),
      expect.objectContaining({ step: "Tax", __waterfallX: 3 }),
    ])
    expect(lastXYFrameProps.xFormat?.(0)).toBe("Start")
  })

  it("passes categorical x values through xFormat", () => {
    render(
      <TooltipProvider>
        <WaterfallChart
          data={sample}
          xAccessor="step"
          yAccessor="value"
          xFormat={(v) => `tick:${v}`}
          width={400}
          height={300}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.xFormat?.(0)).toBe("tick:Start")
  })

  it("maps pushed categorical x values to numeric step positions", () => {
    render(
      <TooltipProvider>
        <WaterfallChart xAccessor="step" yAccessor="value" width={400} height={300} />
      </TooltipProvider>
    )
    const xAcc = lastXYFrameProps.xAccessor
    expect(typeof xAcc).toBe("function")
    const row = { step: "Sales", value: 40 }
    expect((xAcc as (d: typeof row) => number)(row)).toBe(0)
    expect((xAcc as (d: typeof row) => number)(row)).toBe(0)
    expect((xAcc as (d: { step: string; value: number }) => number)({ step: "Costs", value: -25 })).toBe(1)
  })

  it("keeps the same categorical index across an immutable update()", () => {
    render(
      <TooltipProvider>
        <WaterfallChart
          xAccessor="step"
          yAccessor="value"
          pointIdAccessor="step"
          width={400}
          height={300}
        />
      </TooltipProvider>
    )
    const xAcc = lastXYFrameProps.xAccessor as (d: { step: string; value: number }) => number
    const row = { step: "Sales", value: 40 }
    expect(xAcc(row)).toBe(0)
    expect(xAcc({ ...row, value: 42 })).toBe(0)
    expect(xAcc({ step: "Sales", value: 99 })).toBe(0)
  })

  it("forwards pointIdAccessor", () => {
    render(
      <TooltipProvider>
        <WaterfallChart
          data={sample}
          xAccessor="step"
          yAccessor="value"
          pointIdAccessor="step"
          width={400}
          height={300}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.pointIdAccessor).toBe("step")
  })

  it("keeps numeric x accessors without index coercion", () => {
    render(
      <TooltipProvider>
        <WaterfallChart
          data={[{ x: 1, y: 10 }, { x: 2, y: -4 }]}
          xAccessor="x"
          yAccessor="y"
          width={400}
          height={300}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.xAccessor).toBe("x")
    expect(lastXYFrameProps.data).toEqual([{ x: 1, y: 10 }, { x: 2, y: -4 }])
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <WaterfallChart data={[]} width={400} height={300} />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeFalsy()
  })
})
