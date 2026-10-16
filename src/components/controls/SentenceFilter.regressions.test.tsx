import * as React from "react"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SentenceFilter, type SentenceFilterDefinition } from "./SentenceFilter"

const select: SentenceFilterDefinition = {
  type: "select", label: "Region", searchable: true,
  options: [{ value: "west", label: "West", count: 12 }, { value: "new", label: "New York" }],
}

describe("SentenceFilter editing and accessibility", () => {
  it("preserves the readable sentence in a paragraph and references only mounted dialogs", () => {
    const { container } = render(<SentenceFilter as="p" sentence="Show sales in {region} this year." defaultFilters={{ region: "west" }} definitions={{ region: select }} />)
    const paragraph = container.querySelector("p")!
    expect(paragraph).not.toHaveAttribute("aria-label")
    expect(paragraph.children[0]).not.toHaveAttribute("aria-hidden")
    expect(paragraph.children[2]).not.toHaveAttribute("aria-hidden")
    expect(paragraph).toHaveTextContent("Show sales in West this year.")
    const trigger = screen.getByRole("button", { name: /Region: West/ })
    expect(trigger).not.toHaveAttribute("aria-controls")
    fireEvent.click(trigger)
    expect(trigger.getAttribute("aria-controls")).toBe(screen.getByRole("dialog").id)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(trigger).not.toHaveAttribute("aria-controls")
  })

  it("names result counts and keeps the empty state outside the option list", () => {
    render(<SentenceFilter sentence="{region}" defaultFilters={{ region: "west" }} definitions={{ region: select }} />)
    fireEvent.click(screen.getByRole("button", { name: /Region: West/ }))
    expect(screen.getByRole("option", { name: "West, 12 results" })).toBeInTheDocument()
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } })
    expect(within(screen.getByRole("listbox")).queryByRole("status")).toBeNull()
    expect(screen.getByText("No options found.")).toBeInTheDocument()
  })

  it("keeps Space available for native activation after typeahead", () => {
    render(<SentenceFilter sentence="{region}" defaultFilters={{ region: "west" }} definitions={{ region: { ...select, searchable: false } }} />)
    fireEvent.click(screen.getByRole("button", { name: /Region: West/ }))
    fireEvent.keyDown(screen.getByRole("option", { name: /West/ }), { key: "n" })
    const option = screen.getByRole("option", { name: "New York" })
    expect(option).toHaveFocus()
    expect(fireEvent.keyDown(option, { key: " " })).toBe(true)
  })

  it("allows clearing and negative drafts while emitting only bounded numbers", () => {
    const changed = vi.fn()
    render(<SentenceFilter sentence="{amount}" defaultFilters={{ amount: 2 }} definitions={{ amount: { type: "number", label: "Amount", min: -10, max: 10 } }} onChange={changed} />)
    fireEvent.click(screen.getByRole("button", { name: /Amount:/ }))
    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "" } })
    expect(input).toHaveValue(null)
    expect(changed).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: "-5" } })
    expect(input).toHaveValue(-5)
    expect(changed).toHaveBeenLastCalledWith({ amount: -5 }, expect.anything())
    fireEvent.change(input, { target: { value: "500" } })
    expect(changed).toHaveBeenLastCalledWith({ amount: 10 }, expect.anything())
    fireEvent.keyDown(input, { key: "Enter" })
    expect(input).toHaveValue(10)
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.blur(input)
    expect(input).toHaveValue(10)
  })

  it("uses the same draft and ordered bounds contract for range endpoints", () => {
    const changed = vi.fn()
    render(<SentenceFilter sentence="{range}" defaultFilters={{ range: [2, 8] }} definitions={{ range: { type: "range", label: "Range", min: -10, max: 10 } }} onChange={changed} />)
    fireEvent.click(screen.getByRole("button", { name: /Range:/ }))
    const minimum = screen.getByRole("spinbutton", { name: "Minimum" })
    fireEvent.change(minimum, { target: { value: "" } })
    expect(minimum).toHaveValue(null)
    fireEvent.change(minimum, { target: { value: "20" } })
    expect(changed).toHaveBeenLastCalledWith({ range: [8, 8] }, expect.anything())
    fireEvent.blur(minimum)
    expect(minimum).toHaveValue(8)
    expect(screen.getByRole("slider", { name: "Minimum Range" })).toHaveAttribute("max", "8")
  })

  it("coalesces continuous announcements and flushes the final edit on close", () => {
    vi.useFakeTimers()
    try {
      render(<SentenceFilter sentence="{query}" defaultFilters={{ query: "" }} definitions={{ query: { type: "text", label: "Query" } }} />)
      fireEvent.click(screen.getByRole("button", { name: /Query:/ }))
      const input = screen.getByRole("textbox")
      for (const value of ["S", "Se", "Sea", "Seat", "Seattle"]) fireEvent.change(input, { target: { value } })
      expect(screen.getByRole("status")).toHaveTextContent("Query control opened.")
      act(() => vi.advanceTimersByTime(500))
      expect(screen.getByRole("status")).toHaveTextContent("Query changed from Any to Seattle.")
      fireEvent.change(input, { target: { value: "Seattle!" } })
      fireEvent.keyDown(document, { key: "Escape" })
      expect(screen.getByRole("status")).toHaveTextContent("Query changed from Seattle to Seattle!.")
      act(() => vi.runOnlyPendingTimers())
      expect(screen.getByRole("status")).toHaveTextContent("Query changed from Seattle to Seattle!.")
    } finally { vi.useRealTimers() }
  })
})
