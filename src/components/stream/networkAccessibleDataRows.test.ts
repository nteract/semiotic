import { describe, expect, it } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { buildNetworkTableModel } from "./networkAccessibleDataTableModel"
import { registerBuiltInNetworkLayouts } from "./layouts/registerBuiltIn"
import { extractAllRows, extractNetworkDataRow } from "./accessibleDataRows"

registerBuiltInNetworkLayouts()

describe("authored network table rows", () => {
  it.each(["horizontal", "vertical"] as const)(
    "retains computed Sankey totals in %s bounded and pushed tables",
    (orientation) => {
      const edges = [
        { source: "A", target: "B", weight: 100 },
        { source: "B", target: "C", weight: 50 },
        { source: "B", target: "D", weight: 50 }
      ]
      for (const pushed of [false, true]) {
        const store = new NetworkPipelineStore({
          chartType: "sankey",
          orientation,
          valueAccessor: "weight",
          transition: { duration: 0 }
        })
        const size: [number, number] = [500, 320]
        if (pushed) {
          for (const edge of edges) store.ingestEdge(edge)
          store.runLayout(size)
        } else {
          store.ingestBounded([], edges, size)
        }
        store.buildScene(size)
        const assertTotals = (total: number) => {
          const model = buildNetworkTableModel(
            store.sceneNodes,
            store.sceneEdges
          )
          expect(
            model.nodeRows.find(({ id }) => id === "B")!.semantic.values
          ).toEqual({ id: "B", value: total })
          expect(
            extractAllRows(store.sceneNodes).find(
              ({ values }) => values.id === "B"
            )!.values
          ).toEqual({ id: "B", value: total })
          expect(store.nodes.get("B")!.data).toEqual({ id: "B" })
        }
        assertTotals(100)
        if (pushed) {
          store.ingestEdge({ source: "A", target: "B", weight: 50 })
          store.runLayout(size)
          store.buildScene(size)
          assertTotals(150)
        }
      }
    }
  )

  it.each(["tree", "cluster", "treemap", "partition", "circlepack"] as const)(
    "retains computed parent totals in %s tables",
    (chartType) => {
      const data = {
        id: "root",
        children: [
          { id: "A", value: 7 },
          { id: "B", value: 3 }
        ]
      }
      const store = new NetworkPipelineStore({ chartType })
      store.ingestHierarchy(data, [500, 320])
      store.buildScene([500, 320])
      const model = buildNetworkTableModel(store.sceneNodes, store.sceneEdges)
      expect(
        model.nodeRows.find(({ id }) => id === "root")!.semantic.values
      ).toEqual({ id: "root", value: 10 })
      expect(
        extractAllRows(store.sceneNodes).find(
          ({ values }) => values.id === "root"
        )!.values
      ).toEqual({ id: "root", value: 10 })
      expect(data).not.toHaveProperty("value")
    }
  )

  it.each([0, "authored"])(
    "preserves an authored Sankey value of %s and explicit table fields",
    (value) => {
      const node = { id: "A", value }
      const store = new NetworkPipelineStore({ chartType: "sankey" })
      store.ingestBounded(
        [node],
        [{ source: "A", target: "B", value: 100 }],
        [500, 320]
      )
      store.buildScene([500, 320])
      const sceneNode = store.sceneNodes.find(({ id }) => id === "A")!
      expect(extractNetworkDataRow(sceneNode, "A").values).toEqual(node)
      expect(
        extractNetworkDataRow(
          {
            ...sceneNode,
            accessibility: { tableFields: { name: "Projected node" } }
          },
          "A"
        ).values
      ).toEqual({ name: "Projected node" })
      expect(node).toEqual({ id: "A", value })
    }
  )

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
