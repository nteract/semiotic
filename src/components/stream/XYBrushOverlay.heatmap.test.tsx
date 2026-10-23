import { fireEvent, render } from "@testing-library/react"
import { scaleLinear } from "d3-scale"
import { describe, expect, it, vi } from "vitest"
import { heatmapBandScale } from "./heatmapBandTicks"
import { XYBrushOverlay } from "./XYBrushOverlay"

function bandScales(columns: number[]) {
  return {
    x: heatmapBandScale(columns, [0, 300]),
    y: scaleLinear().domain([0, 1]).range([200, 0]),
  }
}

function renderBrush(
  columns: number[],
  onBrush = vi.fn(),
  streaming = false
) {
  const result = render(
    <XYBrushOverlay
      width={300}
      height={200}
      totalWidth={300}
      totalHeight={200}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dimension="x"
      scales={bandScales(columns)}
      onBrush={onBrush}
      streaming={streaming}
    />
  )
  const region = result.container.querySelector("svg[role='region']") as SVGSVGElement
  return { ...result, region, onBrush }
}

describe("heatmap band brush coordinates", () => {
  it("creates a keyboard selection in data coordinates and keeps nudging there", () => {
    const { region, onBrush } = renderBrush([10, 20, 30])
    fireEvent.keyDown(region, { key: "ArrowRight" })
    const created = onBrush.mock.lastCall?.[0]
    expect(created.x[0]).toBeCloseTo(18.5)
    expect(created.x[1]).toBeCloseTo(24.5)
    fireEvent.keyDown(region, { key: "ArrowRight" })
    const nudged = onBrush.mock.lastCall?.[0]
    expect(nudged.x[0]).toBeCloseTo(20)
    expect(nudged.x[1]).toBeCloseTo(26)
  })

  it("nudges a pointer selection without treating keys as indices", () => {
    const { container, region, onBrush } = renderBrush([10, 20, 30])
    const overlay = container.querySelector(".overlay") as Element
    const view = overlay.ownerDocument.defaultView!
    const dispatch = (node: Element | Window, type: string, x: number) => {
      // jsdom rejects a foreign Window as MouseEvent.view, and a missing view
      // makes d3-drag read null.document. Shadow the getter in this window.
      const event = new view.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: 40,
        button: 0,
      })
      Object.defineProperty(event, "view", { configurable: true, get: () => view })
      node.dispatchEvent(event)
    }
    dispatch(overlay, "mousedown", 100)
    dispatch(view, "mousemove", 200)
    dispatch(view, "mouseup", 200)
    const brushed = onBrush.mock.lastCall?.[0]
    expect(brushed.x[0]).toBeCloseTo(15)
    expect(brushed.x[1]).toBeCloseTo(25)
    onBrush.mockClear()
    fireEvent.keyDown(region, { key: "ArrowRight" })
    const nudged = onBrush.mock.lastCall?.[0]
    expect(nudged.x[0]).toBeCloseTo(16.5)
    expect(nudged.x[1]).toBeCloseTo(26.5)
  })

  it("keeps a negative data-space brush when the scale updates", () => {
    const onBrush = vi.fn()
    const { region, rerender } = renderBrush([-30, -20, -10], onBrush, true)
    fireEvent.keyDown(region, { key: "ArrowRight" })
    const extent = onBrush.mock.lastCall?.[0]
    expect(extent.x[0]).toBeLessThan(-15)
    expect(extent.x[1]).toBeLessThan(-10)
    onBrush.mockClear()
    rerender(
      <XYBrushOverlay
        width={300}
        height={200}
        totalWidth={300}
        totalHeight={200}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        dimension="x"
        scales={bandScales([-30, -20, -10])}
        onBrush={onBrush}
        streaming
      />
    )
    expect(onBrush).not.toHaveBeenCalledWith(null)
    expect(onBrush).not.toHaveBeenCalled()
  })
})
