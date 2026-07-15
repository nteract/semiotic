import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import * as React from "react"
import { useNavigationSync, type UseNavigationSyncResult } from "./useNavigationSync"
import { buildNavigationTree, type NavTreeNode } from "./navigationTree"
import { useSelection } from "../store/useSelection"
import {
  ObservationProvider,
  useObservationSelector,
  type ChartObservation,
  type ObservationStoreState,
} from "../store/ObservationStore"
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

function copyTree(node: NavTreeNode): NavTreeNode {
  return {
    ...node,
    children: node.children?.map(copyTree),
  }
}
const febLeaf = findLeaf(tree, (n) => n.label === "Feb: 250")!

interface NavigationHarnessApi {
  sync: UseNavigationSyncResult
  sel: ReturnType<typeof useSelection>
  push: ObservationStoreState["pushObservation"]
}

// Harness exposes the live hook + a sibling selection consumer + the store's
// push. Wrapped in fresh Providers so each test gets isolated stores (the
// module-global fallback stores would otherwise leak state across tests).
function makeHarness() {
  const api = {} as NavigationHarnessApi
  function Inner() {
    api.sync = useNavigationSync({ tree, chartId: "c1", matchFields: ["month"], selectionName: "nav-test" })
    api.sel = useSelection({ name: "nav-test", fields: ["month"] })
    api.push = useObservationSelector((state) => state.pushObservation)
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

  it("maps matching raw-frame observations through its onObservation callback", () => {
    const { api, Harness } = makeHarness()
    const marLeaf = findLeaf(tree, (n) => n.label === "Mar: 180")!
    render(<Harness />)

    const febHover: ChartObservation = {
      type: "hover", datum: { month: "Feb", sales: 250 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }
    expect(api.sync.handleObservation).toBe(api.sync.onObservation)
    act(() => api.sync.onObservation(febHover))
    expect(api.sync.activeId).toBe(febLeaf.id)

    // Raw events use the same chart/type filter as global observations.
    act(() => api.sync.onObservation({ ...febHover, chartId: "other" }))
    expect(api.sync.activeId).toBe(febLeaf.id)

    act(() => api.sync.handleObservation({
      type: "click", datum: { month: "Mar", sales: 180 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(marLeaf.id)
  })

  it("unwraps network wrappers and follows keyboard focus/activation", () => {
    const { api, Harness } = makeHarness()
    const marLeaf = findLeaf(tree, (n) => n.label === "Mar: 180")!
    render(<Harness />)

    act(() => api.push({
      type: "focus",
      datum: {
        source: "A",
        target: "B",
        y0: 0,
        y1: 4,
        sankeyWidth: 4,
        value: 1,
        data: { month: "Feb", sales: 250 },
      },
      inputType: "keyboard",
      timestamp: Date.now(),
      chartType: "network",
      chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(febLeaf.id)

    act(() => api.sync.onObservation({
      type: "activate",
      datum: {
        id: "node-c",
        x0: 0,
        x1: 12,
        y0: 0,
        y1: 12,
        width: 12,
        height: 12,
        value: 1,
        data: { month: "Mar", sales: 180 },
      },
      inputType: "keyboard",
      timestamp: Date.now(),
      chartType: "network",
      chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(marLeaf.id)
  })

  it("keeps the raw observation callback stable with the default observe list", () => {
    const api = {} as Pick<NavigationHarnessApi, "sync">
    const matchFields = ["month"]
    function Inner() {
      api.sync = useNavigationSync({ tree, chartId: "c1", matchFields, selectionName: "nav-stable" })
      return null
    }
    const { rerender } = render(
      <SelectionProvider><ObservationProvider><Inner /></ObservationProvider></SelectionProvider>
    )
    const onObservation = api.sync.onObservation

    rerender(<SelectionProvider><ObservationProvider><Inner /></ObservationProvider></SelectionProvider>)
    expect(api.sync.onObservation).toBe(onObservation)
    expect(api.sync.handleObservation).toBe(onObservation)
  })

  it("de-duplicates a raw observation when its HOC also publishes it globally", () => {
    const { api, Harness } = makeHarness()
    const marLeaf = findLeaf(tree, (n) => n.label === "Mar: 180")!
    render(<Harness />)

    // Chart HOCs invoke their callback and push the very same event to the
    // observation store. Handling it directly first must not block later,
    // distinct observations from the store.
    const febHover: ChartObservation = {
      type: "hover", datum: { month: "Feb", sales: 250 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }
    act(() => api.sync.onObservation(febHover))
    act(() => api.push(febHover))
    expect(api.sync.activeId).toBe(febLeaf.id)

    act(() => api.push({
      type: "hover", datum: { month: "Mar", sales: 180 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(marLeaf.id)
  })

  it("does not jump when matchFields is empty (would otherwise collapse to the first leaf)", () => {
    const api = {} as Pick<NavigationHarnessApi, "sync" | "push">
    function Inner() {
      api.sync = useNavigationSync({ tree, chartId: "c1", matchFields: [], selectionName: "nav-empty" })
      api.push = useObservationSelector((state) => state.pushObservation)
      return null
    }
    render(<SelectionProvider><ObservationProvider><Inner /></ObservationProvider></SelectionProvider>)
    act(() => api.push({
      type: "hover", datum: { month: "Feb", sales: 250 }, x: 0, y: 0,
      timestamp: Date.now(), chartType: "line", chartId: "c1",
    }))
    expect(api.sync.activeId).toBe(tree.id) // stayed at root, did not snap to first leaf
  })

  it("keeps the active node when an equivalent rebuilt tree retains its id", () => {
    const api = {} as Pick<NavigationHarnessApi, "sync">
    function Inner({ t }: { t: NavTreeNode }) {
      api.sync = useNavigationSync({ tree: t, chartId: "c1", matchFields: ["month"], selectionName: "nav-rebuild-stable" })
      return null
    }
    const { rerender } = render(
      <SelectionProvider><ObservationProvider><Inner t={tree} /></ObservationProvider></SelectionProvider>
    )
    act(() => api.sync.onActiveChange(febLeaf))
    expect(api.sync.activeId).toBe(febLeaf.id)

    rerender(
      <SelectionProvider><ObservationProvider><Inner t={copyTree(tree)} /></ObservationProvider></SelectionProvider>
    )
    expect(api.sync.activeId).toBe(febLeaf.id)
  })

  it("resets the active node to root when a rebuilt tree removes it", () => {
    const api = {} as Pick<NavigationHarnessApi, "sync">
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

  it("resets when a positional datum id is rebuilt for different data", () => {
    const api = {} as Pick<NavigationHarnessApi, "sync" | "sel">
    function Inner({ t }: { t: NavTreeNode }) {
      api.sync = useNavigationSync({ tree: t, chartId: "c1", matchFields: ["month"], selectionName: "nav-rebuild-replaced" })
      api.sel = useSelection({ name: "nav-rebuild-replaced", fields: ["month"] })
      return null
    }
    const { rerender } = render(
      <SelectionProvider><ObservationProvider><Inner t={tree} /></ObservationProvider></SelectionProvider>
    )
    act(() => api.sync.onActiveChange(febLeaf))
    expect(api.sync.activeId).toBe(febLeaf.id)
    expect(api.sel.isActive).toBe(true)

    // `buildNavigationTree` numbers leaves by position. This tree gives the
    // old Feb id to May, so keeping the id alone would preserve a stale
    // selection clause (month=Feb) against the wrong active leaf.
    const replacedTree = buildNavigationTree("LineChart", {
      data: [{ month: "Apr", sales: 90 }, { month: "May", sales: 170 }, { month: "Jun", sales: 210 }],
      xAccessor: "month",
      yAccessor: "sales",
    })
    rerender(
      <SelectionProvider><ObservationProvider><Inner t={replacedTree} /></ObservationProvider></SelectionProvider>
    )
    expect(api.sync.activeId).toBe(replacedTree.id)
    expect(api.sel.isActive).toBe(false)
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

describe("useNavigationSync — annotation anchors", () => {
  // Anchored annotations carry the datum's matchFields (the anchored-conversation
  // pattern), so they key into the same leaf map as a hovered datum.
  const annotations = [
    { type: "callout", month: "Feb", label: "Promo spike", note: "spring launch" },
    { type: "callout", month: "Mar", label: "Dip" },
    { type: "y-threshold", value: 170 }, // not anchored to a single datum
  ]
  const marLeaf = findLeaf(tree, (n) => n.label === "Mar: 180")!

  function makeAnnotatedHarness() {
    const api = {} as Pick<NavigationHarnessApi, "sync" | "sel">
    function Inner() {
      api.sync = useNavigationSync({ tree, chartId: "c1", matchFields: ["month"], selectionName: "nav-ann", annotations })
      api.sel = useSelection({ name: "nav-ann", fields: ["month"] })
      return null
    }
    function Harness() {
      return <SelectionProvider><ObservationProvider><Inner /></ObservationProvider></SelectionProvider>
    }
    return { api, Harness }
  }

  it("maps each datum-anchored annotation to its nav-tree leaf (annotatedIds)", () => {
    const { api, Harness } = makeAnnotatedHarness()
    render(<Harness />)
    expect(api.sync.annotatedIds.has(febLeaf.id)).toBe(true)
    expect(api.sync.annotatedIds.has(marLeaf.id)).toBe(true)
    expect(api.sync.annotatedIds.size).toBe(2) // the threshold doesn't anchor to a datum
  })

  it("focusAnnotation jumps the tree to the anchor and highlights it on the canvas", () => {
    const { api, Harness } = makeAnnotatedHarness()
    render(<Harness />)
    let ok = false
    act(() => { ok = api.sync.focusAnnotation(annotations[0]) }) // Feb
    expect(ok).toBe(true)
    expect(api.sync.activeId).toBe(febLeaf.id)
    expect(api.sel.predicate({ month: "Feb", sales: 250 })).toBe(true)
    expect(api.sel.predicate({ month: "Jan", sales: 100 })).toBe(false)
  })

  it("focusAnnotation accepts an index into the annotations array", () => {
    const { api, Harness } = makeAnnotatedHarness()
    render(<Harness />)
    let ok = false
    act(() => { ok = api.sync.focusAnnotation(1) }) // Mar
    expect(ok).toBe(true)
    expect(api.sync.activeId).toBe(marLeaf.id)
  })

  it("focusAnnotation returns false (and stays put) for an annotation not anchored to a datum", () => {
    const { api, Harness } = makeAnnotatedHarness()
    render(<Harness />)
    let ok = true
    act(() => { ok = api.sync.focusAnnotation(annotations[2]) }) // y-threshold, no month
    expect(ok).toBe(false)
    expect(api.sync.activeId).toBe(tree.id) // unchanged
  })
})
