import React from "react"
import { act, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Histogram, type HistogramProps } from "./Histogram"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Histogram is horizontal: the value axis runs across, 400px over [0, 40].
const data = Array.from({ length: 41 }, (_, value) => ({ category: "A", value }))
const plotProps = {
  data,
  categoryAccessor: "category",
  valueAccessor: "value",
  valueExtent: [0, 40],
  width: 400,
  height: 200,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  frameProps: { showAxes: false },
  showGrid: false,
} satisfies HistogramProps<(typeof data)[number]>

const selectionOf = (container: HTMLElement) => {
  const rect = container.querySelector(".brush-g .selection") as SVGRectElement | null
  if (!rect || rect.style.display === "none") return null
  const x = Number(rect.getAttribute("x"))
  return [Math.round(x), Math.round(x + Number(rect.getAttribute("width")))]
}

describe("Histogram controlled brush", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it("moves its brush to brushExtent and clears it on null", async () => {
    const onBrush = vi.fn()
    const chart = (brushExtent: { r: [number, number] } | null) => (
      <TooltipProvider>
        <Histogram {...plotProps} brush brushExtent={brushExtent} onBrush={onBrush} />
      </TooltipProvider>
    )
    const { container, rerender } = render(chart({ r: [10, 20] }))
    await waitFor(() => expect(selectionOf(container)).toEqual([100, 200]))
    rerender(chart({ r: [25, 30] }))
    expect(selectionOf(container)).toEqual([250, 300])
    rerender(chart(null))
    expect(selectionOf(container)).toBeNull()
    expect(onBrush).not.toHaveBeenCalled()
  })

  it("reports a keyboard step through onBrush and onBrushEnd", async () => {
    const onBrush = vi.fn()
    const onBrushEnd = vi.fn()
    const { findByRole } = render(
      <TooltipProvider>
        <Histogram {...plotProps} brush onBrush={onBrush} onBrushEnd={onBrushEnd} />
      </TooltipProvider>
    )
    const region = await findByRole("region", { name: "Ordinal value range brush" })
    act(() => { fireEvent.keyDown(region, { key: "ArrowRight" }) })
    expect(onBrush.mock.lastCall?.[0].r[0]).toBeCloseTo(18)
    expect(onBrush.mock.lastCall?.[0].r[1]).toBeCloseTo(26)
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
    expect(onBrushEnd.mock.lastCall?.[0]).toEqual(onBrush.mock.lastCall?.[0])
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "keyboard", atDomainStart: false, atDomainEnd: false })
  })
})
