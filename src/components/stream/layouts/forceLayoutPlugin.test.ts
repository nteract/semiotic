import { forceLayoutPlugin } from "./forceLayoutPlugin"
import type { RealtimeNode, RealtimeEdge, NetworkPipelineConfig } from "../networkTypes"

function makeNode(id: string): RealtimeNode {
  return { id, x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0, width: 0, height: 0, value: 0 }
}

function makeEdge(source: string, target: string, value = 1): RealtimeEdge {
  return { source, target, value, y0: 0, y1: 0, sankeyWidth: 0 }
}

describe("forceLayoutPlugin", () => {
  it("reports supportsStreaming true and hierarchical false", () => {
    expect(forceLayoutPlugin.supportsStreaming).toBe(true)
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

  it("warm-starts when most nodes have positions", () => {
    // First layout: cold start
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D"), makeNode("E")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C"), makeEdge("C", "D"), makeEdge("D", "E")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 100 }
    const size: [number, number] = [600, 600]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    // Record positions after cold start
    const coldPositions = new Map<string, { x: number; y: number }>()
    for (const n of nodes) coldPositions.set(n.id, { x: n.x, y: n.y })

    // Add one new node (20% new = below 30% threshold = warm start)
    const newNode = makeNode("F")
    nodes.push(newNode)
    edges.push(makeEdge("E", "F"))

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    // Existing nodes should not have moved drastically (warm start preserves locality)
    for (const [id, pos] of coldPositions) {
      const node = nodes.find(n => n.id === id)!
      const dx = Math.abs(node.x - pos.x)
      const dy = Math.abs(node.y - pos.y)
      // With warm start (40 iters, alpha=0.3), existing nodes should stay relatively close
      expect(dx).toBeLessThan(150)
      expect(dy).toBeLessThan(150)
    }

    // New node should have a valid position (not at origin)
    expect(newNode.x !== 0 || newNode.y !== 0).toBe(true)
  })

  it("cold-starts when many nodes are new (>30%)", () => {
    // Start with 2 positioned nodes
    const nodeA = makeNode("A")
    nodeA.x = 300; nodeA.y = 300
    const nodeB = makeNode("B")
    nodeB.x = 350; nodeB.y = 350
    const nodes = [nodeA, nodeB, makeNode("C"), makeNode("D"), makeNode("E"), makeNode("F"), makeNode("G")]
    // 5 out of 7 nodes are new = 71% > 30% threshold = cold start
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 100 }

    forceLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    // All nodes should be positioned (cold start uses phyllotaxis for unpositioned)
    for (const n of nodes) {
      expect(n.x !== 0 || n.y !== 0).toBe(true)
    }
  })

  it("places new nodes near connected neighbors in warm start", () => {
    // Set up a positioned graph
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 100 }

    forceLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    const posB = { x: nodes[1].x, y: nodes[1].y }

    // Add node D connected to B — it should be placed near B initially
    const nodeD = makeNode("D")
    nodes.push(nodeD)
    edges.push(makeEdge("B", "D"))

    forceLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    // After warm start, D should be in the vicinity of its neighbor B
    const dx = Math.abs(nodeD.x - posB.x)
    const dy = Math.abs(nodeD.y - posB.y)
    // Should be reasonably close (within 200px) rather than at a random phyllotaxis position
    expect(dx).toBeLessThan(200)
    expect(dy).toBeLessThan(200)
  })

  it("uses previousPositions from config for bounded re-ingestion", () => {
    // Simulate bounded re-ingestion where nodes are recreated but positions are stashed
    const prevPositions = new Map<string, { x: number; y: number }>()
    prevPositions.set("A", { x: 200, y: 200 })
    prevPositions.set("B", { x: 400, y: 400 })

    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
    const config: NetworkPipelineConfig = {
      chartType: "force",
      iterations: 100
    }
    // Stash previous positions on config
    ;(config as any).__previousPositions = prevPositions

    forceLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    // All nodes should be positioned
    for (const n of nodes) {
      expect(n.x !== 0 || n.y !== 0).toBe(true)
    }
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
