import React from "react"
import { act, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LineChart } from "./LineChart"
import { StackedAreaChart } from "./StackedAreaChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { Datum } from "../shared/datumTypes"

// 400px over x ∈ [0, 40]: 10px per x unit.
const rows: Datum[] = Array.from({ length: 41 }, (_, x) => [
  { x, y: 10 + (x % 5), series: "A" },
  { x, y: 5 + (x % 3), series: "B" },
]).flat()

const plotProps = {
  data: rows,
  xAccessor: "x",
  yAccessor: "y",
  width: 400,
  height: 200,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  xExtent: [0, 40] as [number, number],
  showAxes: false,
  showGrid: false,
  showLegend: false,
}

const charts = [
  ["LineChart", LineChart, { lineBy: "series" }],
  ["StackedAreaChart", StackedAreaChart, { areaBy: "series" }],
] as const

const selectionOf = (container: HTMLElement) => {
  const rect = container.querySelector(".brush-g .selection") as SVGRectElement | null
  if (!rect || rect.style.display === "none") return null
  const x = Number(rect.getAttribute("x"))
  return [Math.round(x), Math.round(x + Number(rect.getAttribute("width")))]
}

describe("controlled brush on XY charts", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it.each(charts)("%s moves its brush to brushExtent and clears it on null", async (_, Chart, extra) => {
    const onBrush = vi.fn()
    const chart = (brushExtent: { x: [number, number] } | null) => (
      <TooltipProvider>
        <Chart {...plotProps} {...extra} brush brushExtent={brushExtent} onBrush={onBrush} />
      </TooltipProvider>
    )
    const { container, rerender } = render(chart({ x: [10, 20] }))
    await waitFor(() => expect(selectionOf(container)).toEqual([100, 200]))
    rerender(chart({ x: [25, 30] }))
    expect(selectionOf(container)).toEqual([250, 300])
    rerender(chart(null))
    expect(selectionOf(container)).toBeNull()
    expect(onBrush).not.toHaveBeenCalled()
  })

  it.each(charts)("%s reports a keyboard step through onBrush and onBrushEnd", async (_, Chart, extra) => {
    const onBrush = vi.fn()
    const onBrushEnd = vi.fn()
    const { findByRole } = render(
      <TooltipProvider>
        <Chart {...plotProps} {...extra} brush onBrush={onBrush} onBrushEnd={onBrushEnd} />
      </TooltipProvider>
    )
    const region = await findByRole("region", { name: "X data range brush" })
    act(() => { fireEvent.keyDown(region, { key: "ArrowRight" }) })
    expect(onBrush.mock.lastCall?.[0].x[0]).toBeCloseTo(18)
    expect(onBrush.mock.lastCall?.[0].x[1]).toBeCloseTo(26)
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
    expect(onBrushEnd.mock.lastCall?.[0]).toEqual(onBrush.mock.lastCall?.[0])
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "keyboard", atDomainStart: false, atDomainEnd: false })
  })

  it("draws no brush on StackedAreaChart without brush, onBrush or linkedBrush", async () => {
    const { queryByRole } = render(
      <TooltipProvider>
        <StackedAreaChart {...plotProps} areaBy="series" />
      </TooltipProvider>
    )
    await act(async () => { await Promise.resolve() })
    expect(queryByRole("region", { name: "X data range brush" })).toBeNull()
  })
})
