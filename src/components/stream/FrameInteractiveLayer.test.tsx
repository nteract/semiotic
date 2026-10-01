import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import { FrameInteractiveLayer } from "./FrameInteractiveLayer"
import { DirectManipulationControl } from "../DirectManipulationControl"

const slider = (
  <DirectManipulationControl value={3} min={0} max={10} x={20} y={20} label="Baseline" onChange={() => {}} pointToValue={() => 3} />
)

describe("frame interactiveGraphics", () => {
  it.each([
    ["StreamOrdinalFrame", () => <StreamOrdinalFrame chartType="bar" data={[{ category: "a", value: 3 }]} size={[300, 200]} interactiveGraphics={slider} />],
    ["StreamXYFrame", () => <StreamXYFrame chartType="scatter" data={[{ x: 1, y: 2 }]} size={[300, 200]} interactiveGraphics={slider} />]
  ])("%s renders controls in a labelled group outside the chart image", (_name, make) => {
    const view = render(make())
    const control = view.getByRole("slider", { name: "Baseline" })
    expect(control.closest("[role='img']")).toBeNull()
    const group = control.closest("svg")
    expect(group?.getAttribute("role")).toBe("group")
    expect(group?.getAttribute("aria-label")).toBe("Chart controls")
    // Content is drawn in plot coordinates.
    expect(group?.querySelector("g")?.getAttribute("transform")).toMatch(/^translate\(\d+,\d+\)$/)
  })

  it("hands the function form scales and a pointerToPlot mapping", () => {
    const graphics = vi.fn((_context: { size: number[]; margin: object; pointerToPlot: unknown }) => slider)
    render(
      <StreamOrdinalFrame
        chartType="bar"
        data={[{ category: "a", value: 3 }]}
        size={[300, 200]}
        interactiveGraphics={graphics}
        interactiveGraphicsLabel="Quota handles"
      />
    )
    const last = graphics.mock.calls.at(-1)![0]
    expect(last.size).toEqual([300, 200])
    expect(last.margin).toBeTruthy()
    expect(typeof last.pointerToPlot).toBe("function")
  })

  it("maps a pointer into plot coordinates through the layer's own transform", () => {
    let pointerToPlot: ((event: { clientX: number; clientY: number }) => { x: number; y: number } | null) | null = null
    render(
      <div>
        <FrameInteractiveLayer
          graphics={(context) => {
            pointerToPlot = context.pointerToPlot
            return slider
          }}
          size={[300, 200]}
          margin={{ top: 10, right: 0, bottom: 0, left: 40 }}
          scales={null}
        />
      </div>
    )
    const group = document.querySelector(".stream-frame-interactive-layer > g") as SVGGElement
    // A plot group offset 40px/10px on screen: client (140, 60) is plot (100, 50).
    ;(group as unknown as { getScreenCTM: () => DOMMatrixInit }).getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 40, f: 10 })
    expect(pointerToPlot!({ clientX: 140, clientY: 60 })).toEqual({ x: 100, y: 50 })
  })

  it("renders nothing without interactive graphics", () => {
    const view = render(<StreamOrdinalFrame chartType="bar" data={[{ category: "a", value: 3 }]} size={[300, 200]} />)
    expect(view.container.querySelector(".stream-frame-interactive-layer")).toBeNull()
  })
})
