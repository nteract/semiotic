import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import * as React from "react"
import { AccessibleNavTree } from "./AccessibleNavTree"
import { buildNavigationTree } from "./ai/navigationTree"

const singleSeries = buildNavigationTree("LineChart", {
  data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 250 }, { month: "Mar", sales: 180 }],
  xAccessor: "month", yAccessor: "sales",
})

const multiSeries = buildNavigationTree("LineChart", {
  data: [
    { month: "Jan", sales: 100, region: "West" }, { month: "Feb", sales: 200, region: "West" },
    { month: "Jan", sales: 50, region: "East" },
  ],
  xAccessor: "month", yAccessor: "sales", lineBy: "region",
})

describe("AccessibleNavTree — ARIA structure", () => {
  it("renders a labeled tree with leveled treeitems", () => {
    render(<AccessibleNavTree tree={singleSeries} label="Sales nav" />)
    expect(screen.getByRole("tree", { name: "Sales nav" })).toBeInTheDocument()
    const items = screen.getAllByRole("treeitem")
    // root + 2 axis + 3 datum, all visible (root expanded by default)
    expect(items).toHaveLength(6)
    expect(items[0]).toHaveAttribute("aria-level", "1")
    expect(items[0]).toHaveAttribute("aria-expanded", "true")
    expect(items[0]).toHaveAttribute("aria-label", expect.stringContaining("A line chart of sales by month"))
    // leaves carry posinset/setsize for "n of m"
    const leaf = items.find((el) => el.getAttribute("aria-label") === "Feb: 250")!
    expect(leaf).toHaveAttribute("aria-level", "2")
    expect(leaf).toHaveAttribute("aria-setsize", "5")
  })

  it("collapses series branches until expanded", () => {
    render(<AccessibleNavTree tree={multiSeries} />)
    // The West series' second point is hidden while the branch is collapsed.
    expect(screen.queryByLabelText("Feb: 200")).toBeNull()
    const west = screen.getByLabelText(/Series West:/)
    expect(west).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(west)
    expect(screen.getByLabelText("Feb: 200")).toBeInTheDocument()
    expect(screen.getByLabelText(/Series West:/)).toHaveAttribute("aria-expanded", "true")
  })
})

describe("AccessibleNavTree — keyboard", () => {
  it("ArrowDown/Up move the active (selected) item", () => {
    render(<AccessibleNavTree tree={singleSeries} />)
    const items = screen.getAllByRole("treeitem")
    expect(items[0]).toHaveAttribute("aria-selected", "true")
    fireEvent.keyDown(items[0], { key: "ArrowDown" })
    expect(screen.getAllByRole("treeitem")[1]).toHaveAttribute("aria-selected", "true")
    fireEvent.keyDown(screen.getAllByRole("treeitem")[1], { key: "ArrowUp" })
    expect(screen.getAllByRole("treeitem")[0]).toHaveAttribute("aria-selected", "true")
  })

  it("ArrowRight expands a collapsed branch, ArrowLeft collapses it", () => {
    render(<AccessibleNavTree tree={multiSeries} />)
    const west = screen.getByLabelText(/Series West:/)
    fireEvent.keyDown(west, { key: "ArrowDown" }) // doesn't matter which item receives the event
    // Drive selection to the West series, then expand it.
    fireEvent.click(west) // expands + selects
    expect(screen.getByLabelText(/Series West:/)).toHaveAttribute("aria-expanded", "true")
    fireEvent.keyDown(west, { key: "ArrowLeft" })
    expect(screen.getByLabelText(/Series West:/)).toHaveAttribute("aria-expanded", "false")
    fireEvent.keyDown(screen.getByLabelText(/Series West:/), { key: "ArrowRight" })
    expect(screen.getByLabelText(/Series West:/)).toHaveAttribute("aria-expanded", "true")
  })

  it("fires onActiveChange as selection moves", () => {
    const onActiveChange = vi.fn()
    render(<AccessibleNavTree tree={singleSeries} onActiveChange={onActiveChange} />)
    fireEvent.keyDown(screen.getAllByRole("treeitem")[0], { key: "ArrowDown" })
    expect(onActiveChange).toHaveBeenCalledTimes(1)
    expect(onActiveChange.mock.calls[0][0].role).toBe("axis")
  })

  it("controlled activeId selects the node and auto-expands the path to it", () => {
    // A leaf inside a collapsed series — supplying its id should reveal it.
    const west = multiSeries.children!.find((c) => c.role === "series")!
    const deepLeaf = west.children![1] // "Feb: 200", initially hidden
    render(<AccessibleNavTree tree={multiSeries} activeId={deepLeaf.id} />)
    const item = screen.getByLabelText("Feb: 200")
    expect(item).toBeInTheDocument() // ancestors auto-expanded
    expect(item).toHaveAttribute("aria-selected", "true")
    expect(screen.getByLabelText(/Series West:/)).toHaveAttribute("aria-expanded", "true")
  })

  it("Home/End jump to the first and last visible item", () => {
    render(<AccessibleNavTree tree={singleSeries} />)
    const items = screen.getAllByRole("treeitem")
    fireEvent.keyDown(items[0], { key: "End" })
    const after = screen.getAllByRole("treeitem")
    expect(after[after.length - 1]).toHaveAttribute("aria-selected", "true")
    fireEvent.keyDown(after[after.length - 1], { key: "Home" })
    expect(screen.getAllByRole("treeitem")[0]).toHaveAttribute("aria-selected", "true")
  })
})
