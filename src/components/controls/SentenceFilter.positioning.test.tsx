import * as React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { SentenceFilter } from "./SentenceFilter"

it("coalesces external viewport changes and ignores scrolling inside the open editor", () => {
  let callback: FrameRequestCallback | undefined
  const request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((next) => { callback = next; return 17 })
  const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined)
  const listeners = vi.spyOn(window, "addEventListener")
  try {
    const { unmount } = render(<SentenceFilter
      sentence="About {region}"
      defaultFilters={{ region: "a" }}
      definitions={{ region: { type: "select", label: "Region", options: [{ value: "a", label: "Alpha" }] } }}
    />)
    fireEvent.click(screen.getByRole("button", { name: /Region:/ }))
    const dialog = screen.getByRole("dialog")
    const measure = vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, right: 200, top: 0, bottom: 150, width: 200, height: 150, toJSON: () => ({}) })
    const scrollListenerCount = listeners.mock.calls.filter(([type]) => type === "scroll").length
    request.mockClear()
    fireEvent.scroll(dialog)
    fireEvent.scroll(screen.getByRole("option"))
    expect(request).not.toHaveBeenCalled()
    fireEvent.scroll(window)
    fireEvent.scroll(window)
    fireEvent.resize(window)
    expect(request).toHaveBeenCalledTimes(1)
    expect(measure).not.toHaveBeenCalled()
    act(() => callback?.(16))
    expect(measure).toHaveBeenCalledTimes(1)
    expect(listeners.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(scrollListenerCount)
    fireEvent.scroll(window)
    unmount()
    expect(cancel).toHaveBeenCalledWith(17)
  } finally {
    request.mockRestore()
    cancel.mockRestore()
    listeners.mockRestore()
  }
})
