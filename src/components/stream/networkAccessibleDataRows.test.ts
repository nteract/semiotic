import { describe, expect, it } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { buildNetworkTableModel } from "./networkAccessibleDataTableModel"
import { registerBuiltInNetworkLayouts } from "./layouts/registerBuiltIn"
import { extractNetworkDataRow } from "./accessibleDataRows"

registerBuiltInNetworkLayouts()

describe("authored network table rows", () => {
  it("preserves custom-layout rows whose authored fields include data", () => {
    const datum = { id: "custom", name: "Authored node", data: 7, value: 4 }
    expect(extractNetworkDataRow({ datum }, "Custom").values).toEqual(datum)
    const nested = { ...datum, data: { unrelated: "nested metadata" } }
    expect(extractNetworkDataRow({ datum: nested }, "Custom").values).toEqual({
      id: "custom",
      name: "Authored node",
      value: 4
    })
  })
  it.each([
    "force",
    "sankey",
    "chord",
    "tree",
    "cluster",
    "treemap",
    "circlepack",
    "partition",
    "orbit"
  ] as const)("retains authored fields through %s geometry", (chartType) => {
    const nodes = [
      { id: "A", name: "Measured node", value: 7 },
      { id: "B", name: "Other node", value: 3 }
    ]
    const edges = [
      { source: "A", target: "B", name: "Measured connection", value: 2 }
    ]
    const store = new NetworkPipelineStore({
      chartType,
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
      iterations: 0
    })
    const graph = ["force", "sankey", "chord"].includes(chartType)
    if (graph) store.ingestBounded(nodes, edges, [500, 320])
    else store.ingestHierarchy({ id: "root", children: nodes }, [500, 320])
    store.cancelIntroAnimation()
    store.buildScene([500, 320])
    const model = buildNetworkTableModel(store.sceneNodes, store.sceneEdges)
    const row = model.nodeRows.find(({ id }) => id === "A")!
    expect(row.semantic.values).toMatchObject(nodes[0])
    expect(row.semantic.values).not.toHaveProperty("createdByFrame")
    expect(row.semantic.values).not.toHaveProperty("x0")
    if (graph) {
      expect(
        model.edgeRows.some(
          ({ values }) =>
            values.name === "Measured connection" && values.value === 2
        )
      ).toBe(true)
    }
    expect(nodes[0]).toEqual({ id: "A", name: "Measured node", value: 7 })
  })
})
