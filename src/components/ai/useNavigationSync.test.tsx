import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import * as React from "react"
import { useNavigationSync } from "./useNavigationSync"
import { buildNavigationTree, type NavTreeNode } from "./navigationTree"
import { useSelection } from "../store/useSelection"
import { ObservationProvider, useObservationSelector } from "../store/ObservationStore"
import { SelectionProvider } from "../store/SelectionStore"

const tree = buildNavigationTree("LineChart", {
  data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 250 }, { month: "Mar", sales: 180 }],
  xAccessor: "month", yAccessor: "sales",
})

function findLeaf(node: NavTreeNode, pred: (n: NavTreeNode) => boolean): NavTreeNode | null {
  if (node.role === "datum" && pred(node)) return node
  for (const c of node.children ?? []) { const f = findLeaf(c, pred); if (f) return f }
  return null
}
const febLeaf = findLeaf(tree, (n) => n.label === "Feb: 250")!

// Harness exposes the live hook + a sibling selection consumer + the store's
// push. Wrapped in fresh Providers so each test gets isolated stores (the
// module-global fallback stores would otherwise leak state across tests).
function makeHarness() {
  const api: any = {}
  function Inner() {
    api.sync = useNavigationSync({ tree, chartId: "c1", matchFields: ["month"], selectionName: "nav-test" })
    api.sel = useSelection({ name: "nav-test", fields: ["month"] })
    api.push = useObservationSelector((s: any) => s.pushObservation)
    return null
  }
  function Harness() {
    return (
      <SelectionProvider>
        <ObservationProvider>
          <Inner />
        </ObservationProvider>
      </SelectionProvider>
    )
  }
  return { api, Harness }
}

describe("useNavigationSync — tree → canvas", () => {
  it("highlights the matching datum when a leaf becomes active", () => {
    const { api, Harness } = makeHarness()
    render(<Harness />)
    expect(api.sel.isActive).toBe(false)

    act(() => api.sync.onActiveChange(febLeaf))
    expect(api.sync.activeId).toBe(febLeaf.id)
    expect(api.sel.isActive).toBe(true)
    expect(api.sel.predicate({ month: "Feb", sales: 250 })).toBe(true)
    expect(api.sel.predicate({ month: "Jan", sales: 100 })).toBe(false)
  })

  it("clears the highlight when a structural (non-datum) node becomes active", () => {
    const { api, Harness } = makeHarness()
    render(<Harness />)
    act(() => api.sync.onActiveChange(febLeaf))
    expect(api.sel.isActive).toBe(true)
    act(() => api.sync.onActiveChange(tree)) // root = chart node
    expect(api.sel.isActive).toBe(false)
    expect(api.sync.activeId).toBe(tree.id)
  })
})

describe("useNavigationSync — default selection name", () => {
  function nameFor(props: Parameters<typeof useNavigationSync>[0]) {
    let name = ""
    function Probe() { name = useNavigationSync(props).selection.name; return null }
    render(
      <SelectionProvider><ObservationProvider><Probe /></ObservationProvider></SelectionProvider>
    )
    return name
  }

  it("derives a per-chart selection name from chartId so two charts don't share a bus", () => {
    expect(nameFor({ tree, chartId: "c1" })).toBe("__semiotic-nav-sync:c1")
    expect(nameFor({ tree, chartId: "c2" })).toBe("__semiotic-nav-sync:c2")
  })

  it("falls back to the bare default when no chartId is given", () => {
    expect(nameFor({ tree })).toBe("__semiotic-nav-sync")
  })

  it("honors an explicit selectionName override for intentional cross-chart linking", () => {
    expect(nameFor({ tree, chartId: "c1", selectionName: "shared" })).toBe("shared")
  })
})

describe("useNavigationSync — canvas → tree", () => {
  it("moves the active node to the leaf matching a hovered datum", () => {
    const { api, Harness } = makeHarness()
    render(<Harness />)
    act(() => api.push({
      type: "hover", datum: { month: "Feb", sales: 250 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(febLeaf.id)
  })

  it("does not jump when matchFields is empty (would otherwise collapse to the first leaf)", () => {
    const api: any = {}
    function Inner() {
      api.sync = useNavigationSync({ tree, chartId: "c1", matchFields: [], selectionName: "nav-empty" })
      api.push = useObservationSelector((s: any) => s.pushObservation)
      return null
    }
    render(<SelectionProvider><ObservationProvider><Inner /></ObservationProvider></SelectionProvider>)
    act(() => api.push({
      type: "hover", datum: { month: "Feb", sales: 250 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(tree.id) // stayed at root, did not snap to first leaf
  })

  it("resets the active node to root when the tree is rebuilt", () => {
    const api: any = {}
    function Inner({ t }: { t: NavTreeNode }) {
      api.sync = useNavigationSync({ tree: t, chartId: "c1", matchFields: ["month"], selectionName: "nav-rebuild" })
      return null
    }
    const { rerender } = render(
      <SelectionProvider><ObservationProvider><Inner t={tree} /></ObservationProvider></SelectionProvider>
    )
    act(() => api.sync.onActiveChange(febLeaf))
    expect(api.sync.activeId).toBe(febLeaf.id)

    const tree2 = buildNavigationTree("LineChart", {
      data: [{ month: "Apr", sales: 90 }], xAccessor: "month", yAccessor: "sales",
    })
    rerender(<SelectionProvider><ObservationProvider><Inner t={tree2} /></ObservationProvider></SelectionProvider>)
    expect(api.sync.activeId).toBe(tree2.id) // reset to the new tree's root
  })

  it("ignores observations from other charts and stays put on hover-end", () => {
    const { api, Harness } = makeHarness()
    render(<Harness />)
    act(() => api.push({
      type: "hover", datum: { month: "Mar", sales: 180 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "other",
    }))
    expect(api.sync.activeId).toBe(tree.id) // different chartId → ignored
    const marLeaf = findLeaf(tree, (n) => n.label === "Mar: 180")!
    act(() => api.push({
      type: "hover", datum: { month: "Mar", sales: 180 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(marLeaf.id)
    act(() => api.push({ type: "hover-end", timestamp: Date.now(), chartType: "line", chartId: "c1" }))
    expect(api.sync.activeId).toBe(marLeaf.id) // sticky: stays on the last datum
  })
})
