/**
 * A key the brush handles stays with the brush: it must not also drive the
 * frame's keyboard navigation or hover. Keys pressed on the chart itself still
 * navigate it.
 */
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LineChart } from "../charts/xy/LineChart"
import { Histogram } from "../charts/ordinal/Histogram"
import { TooltipProvider } from "../store/TooltipStore"
import { setupCanvasMock } from "../../test-utils/canvasMock"

const series = Array.from({ length: 10 }, (_, t) => ({ t, value: 20 + t }))
const values = Array.from({ length: 40 }, (_, value) => ({ category: "A", value }))

const cases = [
  {
    name: "LineChart (XY brush)",
    frame: ".stream-xy-frame",
    tooltip: ".stream-frame-tooltip",
    label: "X data range brush",
    chart: (onBrush: () => void) => (
      <LineChart brush data={series} width={500} height={200} xAccessor="t" yAccessor="value" onBrush={onBrush} />
    ),
  },
  {
    name: "Histogram (ordinal brush)",
    frame: ".stream-ordinal-frame",
    tooltip: ".stream-ordinal-tooltip",
    label: "Ordinal value range brush",
    chart: (onBrush: () => void) => (
      <Histogram brush data={values} width={500} height={200} categoryAccessor="category" valueAccessor="value"
        onBrush={onBrush} />
    ),
  },
] as const

describe("brush keyboard isolation", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it.each(cases)("$name: a brush key moves the brush and not the chart's hover", async ({ chart, tooltip, label }) => {
    const onBrush = vi.fn()
    const { container, findByRole } = render(<TooltipProvider>{chart(onBrush)}</TooltipProvider>)
    const region = await findByRole("region", { name: label })
    region.focus()
    for (const [key, calls] of [["ArrowRight", 1], ["ArrowLeft", 2], ["ArrowUp", 2], ["Escape", 3]] as const) {
      act(() => { fireEvent.keyDown(region, { key }) })
      expect(onBrush, key).toHaveBeenCalledTimes(calls)
      expect(container.querySelector(tooltip), key).toBeNull()
    }
    expect(onBrush).toHaveBeenLastCalledWith(null)
  })

  it.each(cases)("$name: keys on the chart still navigate it", async ({ chart, frame, tooltip, label }) => {
    const onBrush = vi.fn()
    const { container, findByRole } = render(<TooltipProvider>{chart(onBrush)}</TooltipProvider>)
    await findByRole("region", { name: label })
    act(() => { fireEvent.keyDown(container.querySelector(frame)!, { key: "ArrowRight" }) })
    expect(container.querySelector(tooltip)?.textContent).toBeTruthy()
    expect(onBrush).not.toHaveBeenCalled()
  })
})
