import { describe, expect, it } from "vitest"
import { NetworkPipelineStore } from "../NetworkPipelineStore"
import type { NetworkPipelineConfig } from "../networkTypes"
import type { Datum } from "../../charts/shared/datumTypes"
import { buildNetworkTableModel } from "../networkAccessibleDataTableModel"
import "./hierarchyLayoutPlugin"
import "./orbitLayoutPlugin"

const layouts = [
  "tree",
  "cluster",
  "treemap",
  "partition",
  "circlepack",
  "orbit"
] as const

function fixture() {
  return {
    name: "root",
    children: [
      { name: "A", children: [{ name: "Other", value: 4, record: "first" }] },
      { name: "B", children: [{ name: "Other", value: 2, record: "second" }] },
      { name: "Other__1", value: 3, record: "authored suffix" },
      { name: "__proto__", value: 1, record: "prototype name" }
    ]
  }
}

describe("hierarchy identities (#1322)", () => {
  it.each(["tree", "treemap", "circlepack"] as const)(
    "%s labels distinguish parents with a custom children accessor",
    (chartType) => {
      const store = new NetworkPipelineStore({
        chartType,
        childrenAccessor: "items",
        treeOrientation: "horizontal",
        padding: 0,
        showLabels: true,
        labelMode: "leaf"
      })
      store.ingestHierarchy(
        { name: "root", items: [{ name: "leaf", value: 1 }] },
        [400, 300]
      )
      store.buildScene([400, 300])
      const root = store
        .getLayoutData()
        .nodes.find((node) => node.id === "root")!
      const label = store.labels.find((label) => label.text === "root")
      expect(store.labels.some((label) => label.text === "leaf")).toBe(true)
      if (chartType === "treemap") expect(label).toBeUndefined()
      else if (chartType === "tree") expect(label!.x).toBeLessThan(root.x)
      else expect(label!.y).toBeLessThan(root.y)
    }
  )

  it.each(layouts)(
    "%s retains duplicate names, edges, and accessible rows",
    (chartType) => {
      const data = fixture()
      const store = new NetworkPipelineStore({
        chartType,
        padding: 0,
        orbitShowRings: false
      })
      store.ingestHierarchy(data, [400, 300])
      store.buildScene([400, 300])
      const { nodes, edges } = store.getLayoutData()
      expect(nodes).toHaveLength(7)
      expect(new Set(nodes.map((node) => node.id)).size).toBe(7)
      expect(nodes.find((node) => node.data === data.children[2])?.id).toBe(
        "Other__1"
      )
      expect(nodes.filter((node) => node.data?.name === "Other")).toHaveLength(
        2
      )
      const hasEdges = ["tree", "cluster", "orbit"].includes(chartType)
      expect(edges).toHaveLength(hasEdges ? 6 : 0)
      for (const edge of edges) {
        const source =
          typeof edge.source === "string" ? edge.source : edge.source.id
        const target =
          typeof edge.target === "string" ? edge.target : edge.target.id
        expect(nodes.some((node) => node.id === source)).toBe(true)
        expect(nodes.some((node) => node.id === target)).toBe(true)
      }
      expect(store.sceneNodes).toHaveLength(7)
      const table = buildNetworkTableModel(store.sceneNodes, store.sceneEdges)
      expect(table.nodeRows).toHaveLength(7)
      expect(new Set(table.nodeRows.map((row) => row.id)).size).toBe(7)
    }
  )

  it.each(layouts)(
    "%s keeps identities through resize and value-driven sorting",
    (chartType) => {
      const data = fixture()
      const store = new NetworkPipelineStore({ chartType, padding: 0 })
      store.ingestHierarchy(data, [400, 300])
      const ids = () =>
        Object.fromEntries(
          store
            .getLayoutData()
            .nodes.filter((node) => node.data?.record)
            .map((node) => [node.data!.record, node.id])
        )
      const before = ids()
      data.children[0].children![0].value = 1
      data.children[1].children![0].value = 8
      store.ingestHierarchy(data, [600, 200])
      expect(ids()).toEqual(before)
    }
  )

  it.each(["key", (d: Datum) => d.key])(
    "honors custom id and children accessors: %s",
    (nodeIDAccessor) => {
      const data = {
        key: "root",
        items: [
          { key: "x", value: 1 },
          { key: "x", value: 2 },
          { key: "x__1", value: 3 },
          { key: "x", value: 4 },
          { key: "x__2", value: 5 }
        ]
      }
      const config: NetworkPipelineConfig = {
        chartType: "treemap",
        nodeIDAccessor,
        childrenAccessor: "items",
        padding: 0
      }
      const store = new NetworkPipelineStore(config)
      store.ingestHierarchy(data, [300, 200])
      store.buildScene([300, 200])
      expect(
        store
          .getLayoutData()
          .nodes.map((node) => node.id)
          .sort()
      ).toEqual(["root", "x", "x__1", "x__2", "x__3", "x__4"])
      expect(store.sceneNodes).toHaveLength(6)
    }
  )
})
