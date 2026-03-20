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

    // Nodes should be clamped within the chart area
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(600)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(600)
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

  it("centers nodes in the chart area", () => {
    const nodes = Array.from({ length: 10 }, (_, i) => makeNode(`N${i}`))
    const edges = Array.from({ length: 9 }, (_, i) => makeEdge(`N${i}`, `N${i + 1}`))
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 200 }
    const size: [number, number] = [600, 400]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    // Compute the centroid of all node positions
    let sumX = 0, sumY = 0
    for (const n of nodes) { sumX += n.x; sumY += n.y }
    const centroidX = sumX / nodes.length
    const centroidY = sumY / nodes.length

    // The centroid should be close to the center of the chart (within 15% of each dimension)
    expect(Math.abs(centroidX - 300)).toBeLessThan(90)
    expect(Math.abs(centroidY - 200)).toBeLessThan(60)
  })

  it("clamps all nodes within the canvas boundaries", () => {
    // Use a small canvas with many nodes to stress-test boundary clamping
    const nodes = Array.from({ length: 20 }, (_, i) => makeNode(`N${i}`))
    const edges = Array.from({ length: 19 }, (_, i) => makeEdge(`N${i}`, `N${i + 1}`))
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 300 }
    const size: [number, number] = [300, 200]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(300)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(200)
    }
  })

  it("resets bounding box so finalizeLayout uses force-computed x/y", () => {
    // After computeLayout, x0/x1/y0/y1 should be zeroed so that the
    // pipeline store's finalizeLayout derives the bounding box from x/y
    // (not from stale x0/x1/y0/y1 left over from a previous layout).
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 100 }

    forceLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    for (const n of nodes) {
      expect(n.x0).toBe(0)
      expect(n.x1).toBe(0)
      expect(n.y0).toBe(0)
      expect(n.y1).toBe(0)
      // But x/y should be set by the force simulation
      expect(n.x !== 0 || n.y !== 0).toBe(true)
    }
  })

  it("updates existing node positions during streaming warm-start relayout", () => {
    // Simulate the full streaming pipeline: initial layout, then push new node
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 100 }
    const size: [number, number] = [600, 600]

    // First layout (cold start)
    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    // Simulate what finalizeLayout does: synthesize bounding box from x/y
    for (const n of nodes) {
      const r = 5
      n.x0 = n.x - r
      n.x1 = n.x + r
      n.y0 = n.y - r
      n.y1 = n.y + r
    }

    // Record positions
    const positionsAfterFirst = new Map<string, { x: number; y: number }>()
    for (const n of nodes) positionsAfterFirst.set(n.id, { x: n.x, y: n.y })

    // Push a new node (streaming)
    const nodeD = makeNode("D")
    nodes.push(nodeD)
    edges.push(makeEdge("A", "D"))

    // Second layout (warm start) — this is the streaming relayout
    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    // After force layout, x0/x1/y0/y1 should be zeroed for all nodes
    for (const n of nodes) {
      expect(n.x0).toBe(0)
      expect(n.x1).toBe(0)
      expect(n.y0).toBe(0)
      expect(n.y1).toBe(0)
    }

    // New node should have been positioned
    expect(nodeD.x !== 0 || nodeD.y !== 0).toBe(true)

    // Existing nodes should have shifted slightly due to the new node's forces
    // (they shouldn't be frozen at their old positions)
    let anyMoved = false
    for (const [id, oldPos] of positionsAfterFirst) {
      const node = nodes.find(n => n.id === id)!
      if (Math.abs(node.x - oldPos.x) > 0.01 || Math.abs(node.y - oldPos.y) > 0.01) {
        anyMoved = true
      }
    }
    expect(anyMoved).toBe(true)
  })

  it("centers nodes in non-square (wide) chart areas", () => {
    const nodes = Array.from({ length: 8 }, (_, i) => makeNode(`N${i}`))
    const edges = [
      makeEdge("N0", "N1"), makeEdge("N1", "N2"), makeEdge("N2", "N3"),
      makeEdge("N0", "N4"), makeEdge("N4", "N5"), makeEdge("N5", "N6"),
      makeEdge("N3", "N7"), makeEdge("N6", "N7")
    ]
    const config: NetworkPipelineConfig = { chartType: "force", iterations: 200 }
    const size: [number, number] = [800, 300]

    forceLayoutPlugin.computeLayout(nodes, edges, config, size)

    let sumX = 0, sumY = 0
    for (const n of nodes) { sumX += n.x; sumY += n.y }
    const centroidX = sumX / nodes.length
    const centroidY = sumY / nodes.length

    // Centroid should be near center of the wide canvas
    expect(Math.abs(centroidX - 400)).toBeLessThan(120)
    expect(Math.abs(centroidY - 150)).toBeLessThan(60)
  })
})
