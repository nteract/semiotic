import * as React from "react"
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MobileChartContainer } from "./MobileChartContainer"
import { MobileStandardControls, clampMobileRange, useMobileRangeControls, zoomMobileRange } from "./MobileStandardControls"

describe("mobile control accessibility and range limits", () => {
  it("exposes stable contextual names and formatted values for native range controls", () => {
    const start = Date.UTC(2026, 0, 1)
    const day = 86400000
    const props = {
      label: <span>Reporting date</span>,
      domain: [start, start + day * 10] as [number, number],
      value: [start, start + day * 10] as [number, number],
      formatValue: (value: number) => <span>{new Date(value).toISOString().slice(0, 10)}</span>,
      onChange: () => undefined,
    }
    const { rerender } = render(<MobileStandardControls brush={props} />)
    const slider = screen.getByRole("slider", { name: "Reporting date start" })
    expect(slider).toHaveAttribute("aria-valuetext", "2026-01-01")
    rerender(<MobileStandardControls brush={{ ...props, value: [start + day, start + day * 10] }} />)
    expect(screen.getByRole("slider", { name: "Reporting date start" })).toBe(slider)
    expect(slider).toHaveAttribute("aria-valuetext", "2026-01-02")
  })

  it.each([[0, 0.01], [1700000000000, 1700086400000]])("zooms visibly in domain %j with the default step", (from, to) => {
    const { result } = renderHook(() => useMobileRangeControls({ domain: [from, to] }))
    act(() => result.current.zoom.onZoomIn?.())
    expect(result.current.value[1] - result.current.value[0]).toBeCloseTo((to - from) * 0.8)
    act(() => result.current.zoom.onReset?.())
    expect(result.current.value).toEqual([from, to])
  })

  it("retains explicit step semantics and does not invert or expand an overlarge zoom-in", () => {
    expect(zoomMobileRange([0, 100], [0, 100], "in", 5)).toEqual([5, 95])
    expect(zoomMobileRange([4, 6], [0, 10], "in", 8, 1)).toEqual([4.5, 5.5])
    expect(zoomMobileRange([5, 5], [0, 10], "out")).toEqual([4.9, 5.1])
    expect(clampMobileRange([4, 6], [0, 10], 100)).toEqual([0, 10])
    expect(clampMobileRange([4, 6], [10, 0], -1)).toEqual([4, 6])
  })

  it("focuses sheet details and returns to its linked toggle on close or Escape", () => {
    render(<MobileChartContainer
      title="Report"
      chips={[{ id: "a", label: "Overview" }, { id: "b", label: "By region" }]}
      detail={<p>Selected region revenue</p>}
      detailTitle="Revenue details"
    ><div>Chart</div></MobileChartContainer>)
    // Summary chips are rendered through ChartContainer's responsive mobile slot.
    const toggle = screen.getByRole("button", { name: "Show details" })
    expect(toggle).not.toHaveAttribute("aria-controls")
    fireEvent.click(toggle)
    const panel = screen.getByRole("region", { name: "Revenue details" })
    expect(panel).toHaveFocus()
    expect(toggle).toHaveAttribute("aria-controls", panel.id)
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(toggle).toHaveFocus()
    expect(screen.queryByRole("region", { name: "Revenue details" })).toBeNull()
    fireEvent.click(toggle)
    fireEvent.keyDown(screen.getByRole("region", { name: "Revenue details" }), { key: "Escape" })
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute("aria-expanded", "false")
  })
})
