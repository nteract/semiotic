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
