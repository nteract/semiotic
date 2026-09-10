import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { BubbleChart } from "./BubbleChart"
import { TooltipProvider } from "../../store/TooltipStore"

let lastXYFrameProps = {} as CapturedXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamXYFrameHandle>, CapturedXYFrameProps>((props, _ref) => {
      lastXYFrameProps = props
      return <div className="stream-xy-frame"><canvas /><svg /></div>
    })
  }
})

describe("BubbleChart brush", () => {
  beforeEach(() => {
    lastXYFrameProps = {} as CapturedXYFrameProps
  })

  const sampleData = [
    { x: 1, y: 10, size: 50 },
    { x: 2, y: 20, size: 30 },
    { x: 3, y: 15, size: 70 }
  ]

  it("forwards an xy brush overlay when brush is true", () => {
    const onBrush = vi.fn()
    render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" brush onBrush={onBrush} />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.brush).toEqual({ dimension: "xy" })
    expect(typeof lastXYFrameProps.onBrush).toBe("function")
    lastXYFrameProps.onBrush?.({ x: [1, 2], y: [10, 20] })
    expect(onBrush).toHaveBeenCalledWith({ x: [1, 2], y: [10, 20] })
  })

  it("enables brush when linkedBrush is set without an explicit brush prop", () => {
    render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" linkedBrush="range" />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.brush).toEqual({ dimension: "xy" })
  })
})
