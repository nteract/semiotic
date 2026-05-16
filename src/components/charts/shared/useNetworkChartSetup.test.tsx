import { describe, it, expect } from "vitest"
import React from "react"
import { renderHook } from "@testing-library/react"
import { useNetworkChartSetup } from "./useNetworkChartSetup"
import { TooltipProvider } from "../../store/TooltipStore"

const wrapper = ({ children }: { children: React.ReactNode }) =>
  <TooltipProvider>{children}</TooltipProvider>

const baseInput = {
  marginDefaults: { top: 50, bottom: 60, left: 70, right: 40 },
  width: 600,
  height: 400,
  chartType: "TestNetwork",
}

describe("useNetworkChartSetup", () => {
  it("infers nodes from edges when inferNodes=true and nodes is undefined", () => {
    const edges = [
      { source: "A", target: "B", value: 1 },
      { source: "B", target: "C", value: 1 },
    ]
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: undefined,
        edges,
        inferNodes: true,
        sourceAccessor: "source",
        targetAccessor: "target",
      }),
      { wrapper },
    )
    expect(result.current.safeNodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"])
  })

  it("does NOT infer nodes when inferNodes=false", () => {
    const edges = [
      { source: "A", target: "B", value: 1 },
    ]
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: undefined,
        edges,
        inferNodes: false,
      }),
      { wrapper },
    )
    expect(result.current.safeNodes).toEqual([])
  })

  it("filters sparse edges identity-preservingly when nothing dropped", () => {
    const edges = [{ source: "A", target: "B", value: 1 }]
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [{ id: "A" }, { id: "B" }],
        edges,
      }),
      { wrapper },
    )
    expect(result.current.safeEdges).toBe(edges)
  })

  it("drops null/non-object edges via filterSparseArray", () => {
    const edges: Array<{ source: string; target: string; value: number } | null | undefined> = [
      { source: "A", target: "B", value: 1 },
      null,
      undefined,
      { source: "B", target: "C", value: 1 },
    ]
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: edges as { source: string; target: string; value: number }[],
      }),
      { wrapper },
    )
    expect(result.current.safeEdges).toHaveLength(2)
  })

  it("derives distinct categories from colorBy + nodes", () => {
    const nodes = [
      { id: "a", category: "Alpha" },
      { id: "b", category: "Beta" },
      { id: "c", category: "Alpha" },
    ]
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes,
        edges: [],
        inferNodes: false,
        colorBy: "category",
      }),
      { wrapper },
    )
    expect(result.current.allCategories.sort()).toEqual(["Alpha", "Beta"])
  })

  it("returns no categories when colorBy is unset", () => {
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [{ id: "a" }],
        edges: [],
        inferNodes: false,
      }),
      { wrapper },
    )
    expect(result.current.allCategories).toEqual([])
  })

  it("resolves effectivePalette: array colorScheme passes through", () => {
    const palette = ["#aaa", "#bbb", "#ccc"]
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [],
        edges: [],
        colorScheme: palette,
      }),
      { wrapper },
    )
    expect(result.current.effectivePalette).toBe(palette)
  })

  it("resolves effectivePalette: named scheme resolves to its array", () => {
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [],
        edges: [],
        colorScheme: "category10",
      }),
      { wrapper },
    )
    expect(Array.isArray(result.current.effectivePalette)).toBe(true)
    expect(result.current.effectivePalette.length).toBeGreaterThan(0)
  })

  it("resolves effectivePalette: falls through to DEFAULT_COLORS when unknown", () => {
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [],
        edges: [],
        colorScheme: "definitely-not-a-real-scheme-xyz",
      }),
      { wrapper },
    )
    expect(Array.isArray(result.current.effectivePalette)).toBe(true)
    expect(result.current.effectivePalette.length).toBeGreaterThan(0)
  })

  it("yields a loadingEl when loading=true", () => {
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [],
        edges: [],
        loading: true,
      }),
      { wrapper },
    )
    expect(result.current.loadingEl).not.toBeNull()
    expect(result.current.emptyEl).toBeNull()
  })

  it("yields an emptyEl when edges is provided but empty after sparse-clean", () => {
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [],
        edges: [],
      }),
      { wrapper },
    )
    expect(result.current.emptyEl).not.toBeNull()
  })

  it("does NOT yield an emptyEl when edges is undefined (push mode)", () => {
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: undefined,
        edges: undefined,
      }),
      { wrapper },
    )
    expect(result.current.emptyEl).toBeNull()
  })

  it("emptyDataKey='nodes' keys empty-state on safeInputNodes (ForceDirected shape)", () => {
    // edges undefined → would normally bypass empty UI under default
    // ("edges" key). With emptyDataKey="nodes" + supplied-but-empty
    // nodes, empty UI should fire.
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: [],
        edges: undefined,
        inferNodes: false,
        emptyDataKey: "nodes",
      }),
      { wrapper },
    )
    expect(result.current.emptyEl).not.toBeNull()
  })

  it("emptyDataKey='nodes' + nodes=undefined yields no empty UI (push mode)", () => {
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes: undefined,
        edges: undefined,
        inferNodes: false,
        emptyDataKey: "nodes",
      }),
      { wrapper },
    )
    expect(result.current.emptyEl).toBeNull()
  })

  it("expands right margin when legend renders to the right", () => {
    const nodes = [{ id: "a", g: "X" }, { id: "b", g: "Y" }]
    const { result } = renderHook(
      () => useNetworkChartSetup({
        ...baseInput,
        nodes,
        edges: [],
        inferNodes: false,
        colorBy: "g",
        showLegend: true,
        legendPosition: "right",
      }),
      { wrapper },
    )
    // legendAndMargin reserves at least 110 on right when legend is right
    expect(result.current.margin.right).toBeGreaterThanOrEqual(110)
  })
})
