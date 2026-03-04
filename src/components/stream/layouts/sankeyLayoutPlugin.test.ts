import { sankeyLayoutPlugin } from "./sankeyLayoutPlugin"
import type { RealtimeNode, RealtimeEdge, NetworkPipelineConfig } from "../networkTypes"

function makeNode(id: string): RealtimeNode {
  return { id, x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0, width: 0, height: 0, value: 0 }
}

function makeEdge(source: string, target: string, value = 10): RealtimeEdge {
  return { source, target, value, y0: 0, y1: 0, sankeyWidth: 0 }
}

describe("sankeyLayoutPlugin", () => {
  it("reports supportsStreaming true and hierarchical false", () => {
    expect(sankeyLayoutPlugin.supportsStreaming).toBe(true)
    expect(sankeyLayoutPlugin.hierarchical).toBe(false)
  })

  it("computes layout — sets node positions", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B", 10), makeEdge("B", "C", 5)]
    const config: NetworkPipelineConfig = { chartType: "sankey" }
    const size: [number, number] = [800, 400]

    sankeyLayoutPlugin.computeLayout(nodes, edges, config, size)

    // After layout, nodes should have non-zero position values
    for (const node of nodes) {
      expect(node.x1).toBeGreaterThan(node.x0)
      expect(node.y1).toBeGreaterThan(node.y0)
      expect(node.width).toBeGreaterThan(0)
      expect(node.height).toBeGreaterThan(0)
    }
  })

  it("computes layout — sets edge positions", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 20)]
    const config: NetworkPipelineConfig = { chartType: "sankey" }
    const size: [number, number] = [600, 300]

    sankeyLayoutPlugin.computeLayout(nodes, edges, config, size)

    // Edge should have width proportional to value
    expect(edges[0].sankeyWidth).toBeGreaterThan(0)
    // Source/target should be resolved to node references
    expect(typeof edges[0].source).toBe("object")
    expect(typeof edges[0].target).toBe("object")
  })

  it("handles empty nodes gracefully", () => {
    const nodes: RealtimeNode[] = []
    const edges: RealtimeEdge[] = []
    const config: NetworkPipelineConfig = { chartType: "sankey" }
    sankeyLayoutPlugin.computeLayout(nodes, edges, config, [800, 400])
    // Should not throw
  })

  it("buildScene returns rect nodes and bezier edges", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B", 10), makeEdge("B", "C", 5)]
    const config: NetworkPipelineConfig = { chartType: "sankey", showLabels: true }
    const size: [number, number] = [800, 400]

    sankeyLayoutPlugin.computeLayout(nodes, edges, config, size)
    const scene = sankeyLayoutPlugin.buildScene(nodes, edges, config, size)

    expect(scene.sceneNodes.length).toBeGreaterThan(0)
    expect(scene.sceneEdges.length).toBeGreaterThan(0)

    // All scene nodes should be rect type
    for (const sn of scene.sceneNodes) {
      expect(sn.type).toBe("rect")
    }

    // All scene edges should be bezier type
    for (const se of scene.sceneEdges) {
      expect(se.type).toBe("bezier")
    }
  })

  it("buildScene generates labels when showLabels is true", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10)]
    const config: NetworkPipelineConfig = { chartType: "sankey", showLabels: true }
    const size: [number, number] = [800, 400]

    sankeyLayoutPlugin.computeLayout(nodes, edges, config, size)
    const scene = sankeyLayoutPlugin.buildScene(nodes, edges, config, size)

    expect(scene.labels.length).toBeGreaterThan(0)
    expect(scene.labels[0].text).toBeTruthy()
  })

  it("respects vertical orientation", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10)]
    const config: NetworkPipelineConfig = { chartType: "sankey", orientation: "vertical" }
    const size: [number, number] = [400, 600]

    sankeyLayoutPlugin.computeLayout(nodes, edges, config, size)

    // In vertical mode, d3-sankey-circular uses transposed extent — flow
    // direction maps to x-axis. Source "A" should have lower x0 than target "B".
    const nodeA = nodes.find(n => n.id === "A")!
    const nodeB = nodes.find(n => n.id === "B")!
    expect(nodeA.x0).toBeLessThan(nodeB.x0)
  })
})
