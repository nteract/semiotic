import React from "react"
import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SkipToTableLink } from "./AccessibleDataTable"
import { AccessibleTableShell } from "./AccessibleTableShell"
import { useAccessibleTableInteraction } from "./useAccessibleTableInteraction"

const isVisuallyHidden = (element: HTMLElement) =>
  element.style.clip === "rect(0px, 0px, 0px, 0px)" || element.style.clip === "rect(0,0,0,0)"

function Shell() {
  const interaction = useAccessibleTableInteraction()
  return <AccessibleTableShell interaction={interaction} tableId="table" regionLabel="Data summary" countLabel="3 elements" />
}

// Sighted keyboard users must see where focus lands (WCAG 2.4.7): the skip
// link and the collapsed summary trigger are visually hidden until focused.
describe("accessible table focus reveal", () => {
  it("shows the skip link while it has focus", () => {
    const view = render(<SkipToTableLink tableId="table" />)
    const link = view.getByRole("link", { name: "Skip to data table" })
    expect(isVisuallyHidden(link)).toBe(true)
    fireEvent.focus(link)
    expect(isVisuallyHidden(link)).toBe(false)
    expect(link.style.width).toBe("auto")
    fireEvent.blur(link)
    expect(isVisuallyHidden(link)).toBe(true)
  })

  it("reveals the collapsed summary trigger's region while the trigger has focus", () => {
    const view = render(<Shell />)
    const region = view.getByRole("region", { name: "Data summary" })
    const trigger = view.getByRole("button", { name: "View data summary (3 elements)" })
    expect(isVisuallyHidden(region)).toBe(true)
    fireEvent.focus(trigger)
    expect(isVisuallyHidden(region)).toBe(false)
    expect(region.style.width).toBe("auto")
    fireEvent.blur(trigger)
    expect(isVisuallyHidden(region)).toBe(true)
  })
})
