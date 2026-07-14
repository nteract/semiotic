import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import * as React from "react"
import { AccessibleNavTree } from "./AccessibleNavTree"
import { buildNavigationTree } from "./ai/navigationTree"
import { enableConversationArc, getConversationArcStore } from "./ai/conversationArc"

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

  it("uses theme-aware colors for visible selected rows", () => {
    render(<AccessibleNavTree tree={singleSeries} label="Sales nav" visible />)
    const root = screen.getAllByRole("treeitem")[0]
    const style = root.getAttribute("style") || ""
    expect(style).toContain("color: var(--semiotic-text, currentColor)")
    expect(style).toContain("background: var(--semiotic-surface, var(--semiotic-grid, var(--semiotic-bg, #f0f4f8)))")
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

  it("does not fire onActiveChange when re-selecting the already-active node", () => {
    const onActiveChange = vi.fn()
    render(<AccessibleNavTree tree={singleSeries} onActiveChange={onActiveChange} />)
    // Root is active on mount; ArrowUp at the first row clamps back to root —
    // no actual change, so the callback must not fire.
    fireEvent.keyDown(screen.getAllByRole("treeitem")[0], { key: "ArrowUp" })
    expect(onActiveChange).not.toHaveBeenCalled()
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

describe("AccessibleNavTree — semantic observations", () => {
  it("normalizes tree focus and activation for a datum leaf", () => {
    const onObservation = vi.fn()
    render(
      <AccessibleNavTree
        tree={singleSeries}
        chartId="sales"
        onObservation={onObservation}
      />
    )

    fireEvent.click(screen.getByLabelText("Feb: 250"))

    expect(onObservation.mock.calls.map(([event]) => event.type)).toEqual([
      "focus",
      "activate"
    ])
    expect(onObservation.mock.calls[1][0]).toMatchObject({
      type: "activate",
      datum: { month: "Feb", sales: 250 },
      inputType: "navigation-tree",
      chartId: "sales"
    })
  })

  it("activates an annotation leaf by stable id with Enter", () => {
    const onObservation = vi.fn()
    const onAnnotationActivate = vi.fn()
    const tree = buildNavigationTree("LineChart", {
      data: [{ month: "Jan", sales: 100 }],
      xAccessor: "month",
      yAccessor: "sales",
      annotations: [{
        type: "widget",
        stableId: "secret-console",
        label: "Secret console"
      }]
    })
    render(
      <AccessibleNavTree
        tree={tree}
        chartId="sales"
        onObservation={onObservation}
        onAnnotationActivate={onAnnotationActivate}
      />
    )
    fireEvent.click(screen.getByLabelText(/Annotations: one marked feature/))
    const annotation = screen.getByLabelText(/^A widget labeled "Secret console"\.$/)
    fireEvent.click(annotation)
    onObservation.mockClear()
    onAnnotationActivate.mockClear()

    fireEvent.keyDown(annotation, { key: "Enter" })

    expect(onAnnotationActivate).toHaveBeenCalledWith(expect.objectContaining({
      annotationId: "secret-console",
      inputType: "navigation-tree",
      chartId: "sales"
    }))
    expect(onObservation).toHaveBeenCalledWith(expect.objectContaining({
      type: "annotation-activate",
      annotationId: "secret-console",
      inputType: "navigation-tree"
    }))
  })
})

describe("AccessibleNavTree — reception telemetry", () => {
  beforeEach(() => getConversationArcStore().reset())
  afterEach(() => getConversationArcStore().reset())

  it("records nav-node-focused on keyboard traversal when the arc is enabled", () => {
    enableConversationArc()
    render(<AccessibleNavTree tree={singleSeries} chartId="sales" />)
    fireEvent.keyDown(screen.getAllByRole("treeitem")[0], { key: "ArrowDown" })
    const focus = getConversationArcStore().getEvents().filter((e) => e.type === "nav-node-focused")
    expect(focus).toHaveLength(1)
    expect(focus[0]).toMatchObject({ chartId: "sales", role: "axis", level: 2 })
  })

  it("records nav-branch-expanded on expand (and the expanded flag on collapse)", () => {
    enableConversationArc()
    render(<AccessibleNavTree tree={multiSeries} chartId="sales" />)
    const west = screen.getByLabelText(/Series West:/)
    fireEvent.click(west) // focus + expand
    fireEvent.keyDown(screen.getByLabelText(/Series West:/), { key: "ArrowLeft" }) // collapse
    const toggles = getConversationArcStore().getEvents().filter((e) => e.type === "nav-branch-expanded")
    expect(toggles).toHaveLength(2)
    expect(toggles[0]).toMatchObject({ role: "series", expanded: true })
    expect(toggles[1]).toMatchObject({ role: "series", expanded: false })
  })

  it("is a no-op while the arc is disabled", () => {
    render(<AccessibleNavTree tree={singleSeries} />)
    fireEvent.keyDown(screen.getAllByRole("treeitem")[0], { key: "ArrowDown" })
    expect(getConversationArcStore().getEvents()).toHaveLength(0)
  })

  it("does not count externally-driven (controlled) active changes as reception", () => {
    enableConversationArc()
    const west = multiSeries.children!.find((c) => c.role === "series")!
    const deepLeaf = west.children![1]
    // The controlled activeId + auto-expand drive the tree — not the reader.
    render(<AccessibleNavTree tree={multiSeries} activeId={deepLeaf.id} chartId="sales" />)
    expect(getConversationArcStore().getEvents()).toHaveLength(0)
  })

  it("does not record a focus event when the active node does not change", () => {
    enableConversationArc()
    render(<AccessibleNavTree tree={singleSeries} chartId="sales" />)
    // ArrowUp at the root clamps to the root — no change, so no focus event.
    fireEvent.keyDown(screen.getAllByRole("treeitem")[0], { key: "ArrowUp" })
    expect(getConversationArcStore().getEvents().filter((e) => e.type === "nav-node-focused")).toHaveLength(0)
  })
})
