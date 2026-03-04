import { chordLayoutPlugin } from "./chordLayoutPlugin"
import type { RealtimeNode, RealtimeEdge, NetworkPipelineConfig } from "../networkTypes"

function makeNode(id: string): RealtimeNode {
  return { id, x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0, width: 0, height: 0, value: 0 }
}

function makeEdge(source: string, target: string, value = 10): RealtimeEdge {
  return { source, target, value, y0: 0, y1: 0, sankeyWidth: 0 }
}

describe("chordLayoutPlugin", () => {
  it("reports supportsStreaming false and hierarchical false", () => {
    expect(chordLayoutPlugin.supportsStreaming).toBe(false)
    expect(chordLayoutPlugin.hierarchical).toBe(false)
  })

  it("computes layout — positions nodes around center", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [
      makeEdge("A", "B", 10),
      makeEdge("B", "C", 5),
      makeEdge("A", "C", 8)
    ]
    const config: NetworkPipelineConfig = { chartType: "chord" }
    const size: [number, number] = [600, 600]

    chordLayoutPlugin.computeLayout(nodes, edges, config, size)

    const cx = 300
    const cy = 300

    // Nodes should be positioned around the center
    for (const node of nodes) {
      const dist = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2)
      // Should be near the arc perimeter (within chart radius)
      expect(dist).toBeGreaterThan(0)
      expect(dist).toBeLessThan(350)
    }
  })

  it("stashes arcData on nodes", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10)]
    const config: NetworkPipelineConfig = { chartType: "chord" }

    chordLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    for (const node of nodes) {
      expect((node as any).arcData).toBeDefined()
      expect((node as any).arcData.startAngle).toBeDefined()
      expect((node as any).arcData.endAngle).toBeDefined()
    }
  })

  it("handles empty nodes gracefully", () => {
    const config: NetworkPipelineConfig = { chartType: "chord" }
    chordLayoutPlugin.computeLayout([], [], config, [600, 600])
    // Should not throw
  })

  it("buildScene returns arc nodes and ribbon edges", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [
      makeEdge("A", "B", 10),
      makeEdge("B", "C", 5),
      makeEdge("A", "C", 8)
    ]
    const config: NetworkPipelineConfig = { chartType: "chord", showLabels: true }
    const size: [number, number] = [600, 600]

    chordLayoutPlugin.computeLayout(nodes, edges, config, size)
    const scene = chordLayoutPlugin.buildScene(nodes, edges, config, size)

    expect(scene.sceneNodes.length).toBeGreaterThan(0)
    for (const sn of scene.sceneNodes) {
      expect(sn.type).toBe("arc")
    }

    expect(scene.sceneEdges.length).toBeGreaterThan(0)
    for (const se of scene.sceneEdges) {
      expect(se.type).toBe("ribbon")
    }
  })

  it("buildScene generates labels", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10)]
    const config: NetworkPipelineConfig = { chartType: "chord", showLabels: true }
    const size: [number, number] = [600, 600]

    chordLayoutPlugin.computeLayout(nodes, edges, config, size)
    const scene = chordLayoutPlugin.buildScene(nodes, edges, config, size)

    expect(scene.labels.length).toBeGreaterThan(0)
    expect(scene.labels[0].text).toBeTruthy()
  })

  it("resolves edge source/target to node objects", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10)]
    const config: NetworkPipelineConfig = { chartType: "chord" }

    chordLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    expect(typeof edges[0].source).toBe("object")
    expect(typeof edges[0].target).toBe("object")
  })
})
