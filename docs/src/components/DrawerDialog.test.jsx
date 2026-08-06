import React, { useRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import DrawerDialog from "./DrawerDialog"

function Fixture({ open = true, onClose = () => undefined }) {
  const closeRef = useRef(null)
  return (
    <DrawerDialog
      open={open}
      onClose={onClose}
      labelledBy="drawer-title"
      initialFocusRef={closeRef}
      backdropClassName="backdrop"
    >
      <h2 id="drawer-title">Evidence</h2>
      <button ref={closeRef} type="button" onClick={onClose}>Close</button>
      <a href="#source">Source</a>
    </DrawerDialog>
  )
}

describe("DrawerDialog", () => {
  it("provides modal semantics and closes on Escape or backdrop activation", () => {
    const onClose = vi.fn()
    render(<Fixture onClose={onClose} />)
    expect(screen.getByRole("dialog", { name: "Evidence" })).toHaveAttribute("aria-modal", "true")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("traps tab focus and restores the previously focused control", () => {
    const opener = document.createElement("button")
    document.body.appendChild(opener)
    opener.focus()
    const { rerender } = render(<Fixture />)
    const close = screen.getByRole("button", { name: "Close" })
    const source = screen.getByRole("link", { name: "Source" })
    source.focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(document.activeElement).toBe(close)
    rerender(<Fixture open={false} />)
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it("keeps focus on the dialog when it has no focusable descendants", () => {
    render(
      <DrawerDialog open labelledBy="empty-title">
        <h2 id="empty-title">Empty drawer</h2>
      </DrawerDialog>,
    )
    const dialog = screen.getByRole("dialog", { name: "Empty drawer" })
    fireEvent.keyDown(document, { key: "Tab" })
    expect(dialog).toHaveFocus()
  })
})
