import * as React from "react"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import Legend, { GradientLegend } from "./Legend"
import type { LegendGroup } from "./types/legendTypes"

const group = (label: string, labels: string[]): LegendGroup => ({
  label,
  type: "fill",
  styleFn: () => ({ fill: "blue" }),
  items: labels.map((label) => ({ label })),
})

describe("Legend keyboard reachability", () => {
  it.each(["vertical", "horizontal"] as const)("keeps gradient %s navigation, wrap, and activation in sync", (orientation) => {
    const clicked = vi.fn()
    const hovered = vi.fn()
    render(<svg><GradientLegend
      orientation={orientation}
      config={{ domain: [0, 100], colorFn: () => "blue", format: String }}
      customClickBehavior={clicked}
      customHoverBehavior={hovered}
    /></svg>)
    const options = screen.getAllByRole("option")
    const next = orientation === "vertical" ? "ArrowDown" : "ArrowRight"
    const previous = orientation === "vertical" ? "ArrowUp" : "ArrowLeft"
    act(() => options[0].focus())
    fireEvent.keyDown(options[0], { key: next })
    expect(options[1]).toHaveFocus()
    fireEvent.keyDown(options[1], { key: "End" })
    expect(options[4]).toHaveFocus()
    fireEvent.keyDown(options[4], { key: next })
    expect(options[0]).toHaveFocus()
    fireEvent.keyDown(options[0], { key: previous })
    expect(options[4]).toHaveFocus()
    fireEvent.keyDown(options[4], { key: "Home" })
    expect(options[0]).toHaveFocus()
    fireEvent.keyDown(options[0], { key: "Enter" })
    expect(clicked).toHaveBeenLastCalledWith(hovered.mock.lastCall![0])
    expect(options.filter((option) => option.getAttribute("tabindex") === "0")).toEqual([options[0]])
  })
  it("keeps group headings readable in non-interactive legends", () => {
    const { container } = render(<svg><Legend legendGroups={[group("Color", ["Blue"])]} /></svg>)
    expect(container.querySelector(".legend-group-label")).not.toHaveAttribute("aria-hidden")
  })
  it.each(["vertical", "horizontal"] as const)("crosses empty and labeled groups in %s legends", (orientation) => {
    const clicked = vi.fn()
    const hovered = vi.fn()
    render(<svg><Legend
      title="Color and size"
      orientation={orientation}
      legendGroups={[group("Empty", []), group("Color", ["Blue", "Red"]), group("Empty middle", []), group("Size", ["Small", "Large"])]}
      customClickBehavior={clicked}
      customHoverBehavior={hovered}
    /></svg>)
    const listbox = screen.getByRole("listbox", { name: "Color and size" })
    const [blue, red, small, large] = within(listbox).getAllByRole("option")
    expect(within(listbox).getByRole("group", { name: "Size" })).toContainElement(small)
    expect(blue).toHaveAttribute("tabindex", "0")
    act(() => blue.focus())
    const next = orientation === "vertical" ? "ArrowDown" : "ArrowRight"
    const previous = orientation === "vertical" ? "ArrowUp" : "ArrowLeft"
    fireEvent.keyDown(blue, { key: next })
    expect(red).toHaveFocus()
    fireEvent.keyDown(red, { key: next })
    expect(small).toHaveFocus()
    expect(hovered).toHaveBeenLastCalledWith({ label: "Small" })
    fireEvent.keyDown(small, { key: "Enter" })
    expect(clicked).toHaveBeenLastCalledWith({ label: "Small" })
    fireEvent.keyDown(small, { key: "End" })
    expect(large).toHaveFocus()
    fireEvent.keyDown(large, { key: next })
    expect(blue).toHaveFocus()
    fireEvent.keyDown(blue, { key: previous })
    expect(large).toHaveFocus()
    fireEvent.keyDown(large, { key: "Home" })
    expect(blue).toHaveFocus()
    expect(listbox.querySelectorAll("[tabindex='0']")).toHaveLength(1)
  })

  it("restores the tab stop and focus when the focused item or group disappears", () => {
    const props = { customClickBehavior: vi.fn() }
    const { rerender } = render(<svg><Legend {...props} legendGroups={[group("Color", ["Blue"]), group("Size", ["Small", "Large"])]} /></svg>)
    const large = screen.getByRole("option", { name: "Large" })
    act(() => large.focus())
    rerender(<svg><Legend {...props} legendGroups={[group("Color", ["Blue"]), group("Size", ["Small"])]} /></svg>)
    const small = screen.getByRole("option", { name: "Small" })
    expect(small).toHaveAttribute("tabindex", "0")
    expect(small).toHaveFocus()
    rerender(<svg><Legend {...props} legendGroups={[group("Color", ["Blue"])]} /></svg>)
    expect(screen.getByRole("option", { name: "Blue" })).toHaveAttribute("tabindex", "0")
    expect(screen.getByRole("option", { name: "Blue" })).toHaveFocus()
  })

  it("does not reclaim focus from another control when categories change", () => {
    const props = { customClickBehavior: vi.fn() }
    const ui = (labels: string[]) => <><svg><Legend {...props} legendGroups={[group("Colors", labels)]} /></svg><button>Outside</button></>
    const { rerender } = render(ui(["Blue", "Red"]))
    act(() => screen.getByRole("option", { name: "Red" }).focus())
    act(() => screen.getByRole("button", { name: "Outside" }).focus())
    rerender(ui(["Blue"]))
    expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus()
    expect(screen.getByRole("option", { name: "Blue" })).toHaveAttribute("tabindex", "0")
  })
})
