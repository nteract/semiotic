import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkPipelineConfig } from "./networkTypes"

function makeConfig(overrides: Partial<NetworkPipelineConfig> = {}): NetworkPipelineConfig {
  return {
    chartType: "sankey",
    orientation: "horizontal",
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    valueAccessor: "value",
    ...overrides
  }
}

describe("NetworkPipelineStore", () => {
  // ── Configuration and initialization ─────────────────────────────────

  describe("configuration and initialization", () => {
    it("initializes with empty state", () => {
      const store = new NetworkPipelineStore(makeConfig())
      expect(store.nodes.size).toBe(0)
      expect(store.edges.size).toBe(0)
      expect(store.sceneNodes).toEqual([])
      expect(store.sceneEdges).toEqual([])
      expect(store.labels).toEqual([])
      expect(store.layoutVersion).toBe(0)
      expect(store.tension).toBe(0)
    })

    it("creates particle pool for sankey with showParticles", () => {
      const store = new NetworkPipelineStore(makeConfig({
        chartType: "sankey",
        showParticles: true
      }))
      expect(store.particlePool).not.toBeNull()
    })

    it("does not create particle pool for force layout", () => {
      const store = new NetworkPipelineStore(makeConfig({
        chartType: "force"
      }))
      expect(store.particlePool).toBeNull()
    })
  })

  // ── Node and edge ingestion (bounded) ────────────────────────────────

  describe("node and edge ingestion (bounded)", () => {
    it("ingests nodes and edges from arrays", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }, { id: "C" }],
        [{ source: "A", target: "B", value: 10 }, { source: "B", target: "C", value: 5 }],
        [600, 400]
      )
      expect(store.nodes.size).toBe(3)
      expect(store.edges.size).toBe(2)
      expect(store.layoutVersion).toBe(1)
    })

    it("resolves node IDs via accessors", () => {
      const store = new NetworkPipelineStore(makeConfig({
        nodeIDAccessor: "name"
      }))
      store.ingestBounded(
        [{ name: "X" }, { name: "Y" }],
        [{ source: "X", target: "Y", value: 7 }],
        [600, 400]
      )
      expect(store.nodes.has("X")).toBe(true)
      expect(store.nodes.has("Y")).toBe(true)
    })

    it("uses default value of 1 when valueAccessor returns undefined", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }],
        [{ source: "A", target: "B" }],  // no value
        [600, 400]
      )
      const edge = store.edges.get("A\0B")
      expect(edge).toBeDefined()
      expect(edge!.value).toBe(1)
    })
  })

  // ── Auto-creation of nodes from edges ────────────────────────────────

  describe("auto-creation of nodes from edges", () => {
    it("creates nodes automatically when only edges are provided (bounded)", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestBounded(
        [],  // no nodes!
        [
          { source: "A", target: "B", value: 10 },
          { source: "B", target: "C", value: 5 }
        ],
        [600, 400]
      )
      expect(store.nodes.size).toBe(3)
      expect(store.nodes.has("A")).toBe(true)
      expect(store.nodes.has("B")).toBe(true)
      expect(store.nodes.has("C")).toBe(true)
    })

    it("creates nodes automatically from streaming edge pushes", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestEdge({ source: "X", target: "Y", value: 10 })
      expect(store.nodes.has("X")).toBe(true)
      expect(store.nodes.has("Y")).toBe(true)
      expect(store.nodes.size).toBe(2)
    })

    it("does not duplicate nodes for repeated edge pushes", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestEdge({ source: "A", target: "B", value: 5 })
      store.ingestEdge({ source: "A", target: "B", value: 3 })
      expect(store.nodes.size).toBe(2)
      // Value should be accumulated
      const edge = store.edges.get("A\0B")
      expect(edge!.value).toBe(8)
    })
  })

  // ── Layout dispatch to plugins ──────────────────────────────────────

  describe("layout dispatch", () => {
    it("runs sankey layout and sets node positions", () => {
      const store = new NetworkPipelineStore(makeConfig({ chartType: "sankey" }))
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }],
        [{ source: "A", target: "B", value: 10 }],
        [600, 400]
      )

      // After layout, nodes should have meaningful positions
      const nodeA = store.nodes.get("A")!
      const nodeB = store.nodes.get("B")!
      // In sankey, source should be to the left of target (horizontal)
      expect(nodeA.x).toBeLessThan(nodeB.x)
    })

    it("runs force layout and assigns positions", () => {
      const store = new NetworkPipelineStore(makeConfig({
        chartType: "force",
        iterations: 10
      }))
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }, { id: "C" }],
        [
          { source: "A", target: "B", value: 1 },
          { source: "B", target: "C", value: 1 }
        ],
        [600, 400]
      )

      // After force layout, nodes should have been positioned
      for (const node of store.nodes.values()) {
        // Force layout sets x/y, then finalizeLayout derives x0/x1
        expect(typeof node.x).toBe("number")
        expect(typeof node.y).toBe("number")
      }
    })

  })

  // ── Scene generation ───────────────────────────────────────────────

  describe("scene generation", () => {
    it("builds scene nodes and edges for sankey", () => {
      const store = new NetworkPipelineStore(makeConfig({ chartType: "sankey" }))
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }],
        [{ source: "A", target: "B", value: 10 }],
        [600, 400]
      )
      store.buildScene([600, 400])

      expect(store.sceneNodes.length).toBeGreaterThan(0)
      // Sankey produces rect nodes
      for (const node of store.sceneNodes) {
        expect(node.type).toBe("rect")
      }
    })

    it("builds scene nodes for force layout (circles)", () => {
      const store = new NetworkPipelineStore(makeConfig({
        chartType: "force",
        iterations: 10
      }))
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }],
        [{ source: "A", target: "B", value: 1 }],
        [600, 400]
      )
      store.buildScene([600, 400])

      expect(store.sceneNodes.length).toBe(2)
      for (const node of store.sceneNodes) {
        expect(node.type).toBe("circle")
      }
    })
  })

  // ── Streaming updates ──────────────────────────────────────────────

  describe("streaming updates", () => {
    it("ingestEdge returns true on first edge (triggers layout)", () => {
      const store = new NetworkPipelineStore(makeConfig())
      const needsLayout = store.ingestEdge({ source: "A", target: "B", value: 10 })
      expect(needsLayout).toBe(true)
    })

    it("ingestEdge accumulates tension for new nodes", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestEdge({ source: "A", target: "B", value: 10 })
      // Two new nodes = 2 * newNode tension + 1 * newEdge tension
      expect(store.tension).toBeGreaterThan(0)
    })

    it("ingestEdge triggers relayout when tension exceeds threshold", () => {
      const store = new NetworkPipelineStore(makeConfig({
        tensionConfig: {
          weightChange: 0.1,
          newEdge: 0.5,
          newNode: 1.0,
          threshold: 3.0,
          transitionDuration: 0
        }
      }))
      // First edge: always returns true (isFirst)
      store.ingestEdge({ source: "A", target: "B", value: 1 })
      // Reset tension to simulate a prior layout
      store.tension = 0

      // Existing edge weight change: small tension
      const result = store.ingestEdge({ source: "A", target: "B", value: 1 })
      expect(result).toBe(false) // tension 0.1 < threshold 3.0

      // New topology change with new nodes: large tension
      const result2 = store.ingestEdge({ source: "C", target: "D", value: 1 })
      expect(result2).toBe(true) // topology changed
    })

    it("tracks topology diffs after layout", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }],
        [{ source: "A", target: "B", value: 10 }],
        [600, 400]
      )
      // First layout: all nodes are "added"
      expect(store.addedNodes.size).toBe(2)
      expect(store.removedNodes.size).toBe(0)
    })

  })

  // ── Empty data handling ────────────────────────────────────────────

  describe("empty data handling", () => {
    it("buildScene with no data produces empty arrays", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.buildScene([600, 400])
      expect(store.sceneNodes).toEqual([])
      expect(store.sceneEdges).toEqual([])
    })

    it("clear resets all state", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.ingestBounded(
        [{ id: "A" }, { id: "B" }],
        [{ source: "A", target: "B", value: 10 }],
        [600, 400]
      )
      store.buildScene([600, 400])
      expect(store.nodes.size).toBe(2)

      store.clear()
      expect(store.nodes.size).toBe(0)
      expect(store.edges.size).toBe(0)
      expect(store.sceneNodes).toEqual([])
      expect(store.sceneEdges).toEqual([])
      expect(store.labels).toEqual([])
      expect(store.tension).toBe(0)
      expect(store.layoutVersion).toBe(0)
      expect(store.lastIngestTime).toBe(0)
    })
  })

  // ── Config update ──────────────────────────────────────────────────

  describe("config update", () => {
    it("updateConfig replaces config", () => {
      const store = new NetworkPipelineStore(makeConfig())
      store.updateConfig(makeConfig({ chartType: "force" }))
      // The store should now use force config (hard to observe directly,
      // but at least it shouldn't crash)
      expect(store.particlePool).toBeNull()
    })

    it("updateConfig creates particle pool on demand", () => {
      const store = new NetworkPipelineStore(makeConfig({
        chartType: "sankey",
        showParticles: false
      }))
      expect(store.particlePool).toBeNull()
      store.updateConfig(makeConfig({
        chartType: "sankey",
        showParticles: true
      }))
      expect(store.particlePool).not.toBeNull()
    })
  })

  // ── getLayoutData ──────────────────────────────────────────────────

})
