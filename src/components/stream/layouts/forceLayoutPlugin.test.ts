import { forceLayoutPlugin } from "./forceLayoutPlugin"
import type { RealtimeNode, RealtimeEdge, NetworkPipelineConfig } from "../networkTypes"

function makeNode(id: string): RealtimeNode {
  return { id, x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0, width: 0, height: 0, value: 0 }
}

function makeEdge(source: string, target: string, value = 1): RealtimeEdge {
  return { source, target, value, y0: 0, y1: 0, sankeyWidth: 0 }
}

describe("forceLayoutPlugin", () => {
  it("reports supportsStreaming false and hierarchical false", () => {
    expect(forceLayoutPlugin.supportsStreaming).toBe(false)
    expect(forceLayoutPlugin.hierarchical).toBe(false)
  })

  it("computes layout — nodes not at origin after simulation", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 100 }
    const size: [number, number] = [600, 600]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    // At least some nodes should have moved away from origin/initial positions
    const moved = nodes.some(n => n.x !== 0 || n.y !== 0)
    expect(moved).toBe(true)

    // Nodes should be within or near the chart area
    for (const n of nodes) {
      expect(n.x).toBeGreaterThan(-100)
      expect(n.x).toBeLessThan(700)
      expect(n.y).toBeGreaterThan(-100)
      expect(n.y).toBeLessThan(700)
    }
  })

  it("resolves edge source/target to node objects", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 50 }

    forceLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    expect(typeof edges[0].source).toBe("object")
    expect(typeof edges[0].target).toBe("object")
    expect((edges[0].source as RealtimeNode).id).toBe("A")
    expect((edges[0].target as RealtimeNode).id).toBe("B")
  })

  it("handles empty nodes gracefully", () => {
    const config: NetworkPipelineConfig = { chartType: "force" }
    forceLayoutPlugin.computeLayout([], [], config, [600, 600])
    // Should not throw
  })

  it("buildScene returns circle nodes and line edges", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 100, showLabels: true }
    const size: [number, number] = [600, 600]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)
    const scene = forceLayoutPlugin.buildScene(nodes, edges, config, size)

    expect(scene.sceneNodes.length).toBe(3)
    for (const sn of scene.sceneNodes) {
      expect(sn.type).toBe("circle")
    }

    expect(scene.sceneEdges.length).toBe(2)
    for (const se of scene.sceneEdges) {
      expect(se.type).toBe("line")
    }
  })

  it("buildScene generates labels", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 50, showLabels: true }
    const size: [number, number] = [600, 600]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)
    const scene = forceLayoutPlugin.buildScene(nodes, edges, config, size)

    expect(scene.labels.length).toBe(2)
  })

  it("respects custom nodeSize", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 50, nodeSize: 15 }
    const size: [number, number] = [600, 600]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)
    const scene = forceLayoutPlugin.buildScene(nodes, edges, config, size)

    for (const sn of scene.sceneNodes) {
      if (sn.type === "circle") {
        expect(sn.r).toBe(15)
      }
    }
  })
})
