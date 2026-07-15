import { hierarchyLayoutPlugin } from "./hierarchyLayoutPlugin"
import type { RealtimeNode, RealtimeEdge, NetworkPipelineConfig } from "../networkTypes"
import type { Datum } from "../../charts/shared/datumTypes"

type CirclePackPositionedNode = RealtimeNode & { __radius?: number }

describe("hierarchyLayoutPlugin", () => {
  const sampleHierarchy = {
    name: "root",
    children: [
      {
        name: "A",
        value: 10,
        children: [
          { name: "A1", value: 5 },
          { name: "A2", value: 5 }
        ]
      },
      {
        name: "B",
        value: 8,
        children: [
          { name: "B1", value: 3 },
          { name: "B2", value: 5 }
        ]
      }
    ]
  }

  it("reports supportsStreaming false and hierarchical true", () => {
    expect(hierarchyLayoutPlugin.supportsStreaming).toBe(false)
    expect(hierarchyLayoutPlugin.hierarchical).toBe(true)
  })

  it("handles missing __hierarchyRoot gracefully", () => {
    const nodes: RealtimeNode[] = []
    const edges: RealtimeEdge[] = []
    const config: NetworkPipelineConfig = { chartType: "tree" }
    hierarchyLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])
    // Should not throw, nodes should still be empty
    expect(nodes.length).toBe(0)
  })

  describe("tree layout", () => {
    it("populates nodes and edges from hierarchy", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "tree",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy,
        showLabels: true
      }
      const size: [number, number] = [600, 600]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)

      // 5 nodes: root, A, B, A1, A2, B1, B2 = 7 total
      expect(nodes.length).toBe(7)
      // Edges = parent-child links (6 links for 7 nodes in a tree)
      expect(edges.length).toBe(6)
    })

    it("sets correct depth on nodes", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "tree",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy
      }

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

      const root = nodes.find(n => n.id === "root")
      const nodeA = nodes.find(n => n.id === "A")
      const nodeA1 = nodes.find(n => n.id === "A1")

      expect(root!.depth).toBe(0)
      expect(nodeA!.depth).toBe(1)
      expect(nodeA1!.depth).toBe(2)
    })

    it("buildScene returns circle nodes and curved edges for tree", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "tree",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy,
        showLabels: true
      }
      const size: [number, number] = [600, 600]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)
      const scene = hierarchyLayoutPlugin.buildScene(nodes, edges, config, size)

      expect(scene.sceneNodes.length).toBeGreaterThan(0)
      for (const sn of scene.sceneNodes) {
        expect(sn.type).toBe("circle")
      }

      expect(scene.sceneEdges.length).toBeGreaterThan(0)
      for (const se of scene.sceneEdges) {
        expect(se.type).toBe("curved")
      }

      expect(scene.labels.length).toBeGreaterThan(0)
    })
  })

  describe("treemap layout", () => {
    it("populates nodes with rect positions", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "treemap",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy
      }
      const size: [number, number] = [600, 400]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)

      expect(nodes.length).toBeGreaterThan(0)
      // Treemap has no edges
      expect(edges.length).toBe(0)

      // Leaf nodes should have positive dimensions
      const leaves = nodes.filter(n => !n.data?.children || n.data.children.length === 0)
      for (const leaf of leaves) {
        expect(leaf.width).toBeGreaterThan(0)
        expect(leaf.height).toBeGreaterThan(0)
      }
    })

    it("buildScene returns rect nodes for treemap", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "treemap",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy,
        showLabels: true
      }
      const size: [number, number] = [600, 400]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)
      const scene = hierarchyLayoutPlugin.buildScene(nodes, edges, config, size)

      expect(scene.sceneNodes.length).toBeGreaterThan(0)
      for (const sn of scene.sceneNodes) {
        expect(sn.type).toBe("rect")
      }

      // Treemap has no edges in the scene
      expect(scene.sceneEdges.length).toBe(0)
    })

    it("calls a nodeLabel function with the original datum (not the scene node wrapper)", () => {
      // The user datum carries a `label` field that lives only on the
      // original object — the scene node nests it under `.data`. A
      // nodeLabel *function* must receive that datum so accessors read
      // the same fields as colorBy/nodeStyle/tooltip.
      const labelledHierarchy = {
        name: "root",
        label: "Everything",
        children: [
          {
            name: "A",
            label: "Branch A",
            children: [
              { name: "A1", label: "Leaf A1", value: 6 },
              { name: "A2", label: "Leaf A2", value: 6 }
            ]
          }
        ]
      }
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "treemap",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: labelledHierarchy,
        showLabels: true,
        // Parent labels render in the paddingTop band, leaves centered.
        labelMode: "all",
        paddingTop: 18,
        nodeLabel: (d: Datum) => String(d.label)
      }
      const size: [number, number] = [600, 400]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)
      const scene = hierarchyLayoutPlugin.buildScene(nodes, edges, config, size)

      const texts = scene.labels.map(l => l.text)
      // Parent ("Branch A") and leaves resolve from the datum, not the
      // node id ("A"/"A1") — proving the function received `d.data`.
      expect(texts).toContain("Branch A")
      expect(texts).toContain("Leaf A1")
      expect(texts).toContain("Leaf A2")
      expect(texts).not.toContain("A")
    })
  })

  describe("circlepack layout", () => {
    it("populates nodes with circle positions", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "circlepack",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy
      }
      const size: [number, number] = [600, 600]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)

      expect(nodes.length).toBeGreaterThan(0)
      expect(edges.length).toBe(0)

      // Nodes should have radius stored
      for (const node of nodes) {
        expect((node as CirclePackPositionedNode).__radius).toBeDefined()
      }
    })

    it("buildScene returns circle nodes for circlepack", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "circlepack",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy,
        showLabels: true
      }
      const size: [number, number] = [600, 600]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)
      const scene = hierarchyLayoutPlugin.buildScene(nodes, edges, config, size)

      expect(scene.sceneNodes.length).toBeGreaterThan(0)
      for (const sn of scene.sceneNodes) {
        expect(sn.type).toBe("circle")
      }

      expect(scene.sceneEdges.length).toBe(0)
    })
  })

  describe("colorByDepth", () => {
    it("applies depth-based colors in treemap buildScene", () => {
      const nodes: RealtimeNode[] = []
      const edges: RealtimeEdge[] = []
      const config: NetworkPipelineConfig = {
        chartType: "treemap",
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        __hierarchyRoot: sampleHierarchy,
        colorByDepth: true,
        showLabels: false
      }
      const size: [number, number] = [600, 400]

      hierarchyLayoutPlugin.computeLayout(nodes, edges, config, size)
      const scene = hierarchyLayoutPlugin.buildScene(nodes, edges, config, size)

      // Different depth nodes should have different fill colors
      const fills = new Set(scene.sceneNodes.map((sn) => sn.style.fill))
      expect(fills.size).toBeGreaterThan(1)
    })
  })
})
