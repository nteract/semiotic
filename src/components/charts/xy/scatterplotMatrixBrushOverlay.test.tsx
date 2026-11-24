import { fireEvent, render, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ScatterplotMatrix } from "./ScatterplotMatrix"
import { dragD3Brush } from "../../../test-utils/d3BrushDrag"
import { BRUSH_ACCENT } from "../../stream/brushTheme"

const data = [0, 2, 4, 5, 6, 8, 10].map(n => ({ a: n, b: n, c: n }))
const props = { data, fields: ["a", "b", "c"], cellSize: 108, hoverMode: false, accessibleTable: false }

describe("ScatterplotMatrix brush", () => {
  it("keeps a drag alive across selection updates and preserves the selection color", async () => {
    const { getAllByRole } = render(<ScatterplotMatrix {...props} />)
    const cells = getAllByRole("gridcell")
    await dragD3Brush(cells[1], ".brush-g .overlay", { clientX: 10, clientY: 10 }, [
      { clientX: 20, clientY: 20 },
      { clientX: 30, clientY: 30 },
      { clientX: 90, clientY: 90 }
    ])
    const selection = cells[1].querySelector(".brush-g .selection")!
    expect(selection).toHaveAttribute("width", "80")
    expect(selection).toHaveAttribute("height", "80")
    expect(selection).toHaveAttribute("fill", BRUSH_ACCENT)
    expect(selection).toHaveAttribute("stroke", BRUSH_ACCENT)
    expect(selection).toHaveAttribute("fill-opacity", "0.15")
    expect(cells[0].querySelector('rect[opacity="0.7"]')).toBeTruthy()
  })

  it("creates, resizes and clears a brush without changing a sibling matrix", async () => {
    const { getAllByRole } = render(<><ScatterplotMatrix {...props} /><ScatterplotMatrix {...props} /></>)
    const [first, second] = getAllByRole("grid")
    const cell = within(first).getAllByRole("gridcell")[1]
    const brush = await within(cell).findByRole("region", { name: /range brush/i })
    expect(brush).toHaveAccessibleDescription(/arrow keys/i)
    fireEvent.keyDown(brush, { key: "ArrowRight" })
    const selection = cell.querySelector(".brush-g .selection")!
    const width = Number(selection.getAttribute("width"))
    expect(width).toBeGreaterThan(0)
    fireEvent.keyDown(brush, { key: "ArrowRight", shiftKey: true })
    expect(Number(selection.getAttribute("width"))).toBeGreaterThan(width)
    await waitFor(() => expect(first.querySelector('rect[opacity="0.7"]')).toBeTruthy())
    expect(second.querySelector('rect[opacity="0.7"]')).toBeNull()
    fireEvent.keyDown(brush, { key: "Escape" })
    expect(first.querySelector('rect[opacity="0.7"]')).toBeNull()
  })
})
