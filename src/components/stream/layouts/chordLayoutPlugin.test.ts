import type { Chord } from "d3-chord"
import { NetworkPipelineStore } from "../NetworkPipelineStore"
import { chordLayoutPlugin } from "./chordLayoutPlugin"
import type { RealtimeNode, RealtimeEdge, NetworkPipelineConfig } from "../networkTypes"

function makeNode(id: string): RealtimeNode {
  return { id, x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0, width: 0, height: 0, value: 0 }
}

function makeEdge(source: string, target: string, value = 10): RealtimeEdge {
  return { source, target, value, y0: 0, y1: 0, sankeyWidth: 0 }
}

describe("chordLayoutPlugin", () => {
  it("preserves the dominant-direction raw callback datum and source color", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10), makeEdge("B", "A", 40), makeEdge("B", "A", 50)]
    const config: NetworkPipelineConfig = { chartType: "chord", colorScheme: ["red", "blue"] }
    chordLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])
    const scene = chordLayoutPlugin.buildScene(nodes, edges, config, [600, 600])
    expect(scene.sceneEdges).toHaveLength(1)
    expect(scene.sceneEdges[0].datum).toBe(edges[2])
    expect(scene.sceneEdges[0].style.fill).toBe("blue")
    expect(scene.sceneEdges[0].datum?.__chordEdges).toEqual(edges)
    const edgeStyle = vi.fn(() => ({ fill: "green" }))
    chordLayoutPlugin.buildScene(nodes, edges, { ...config, edgeStyle }, [600, 600])
    expect(edgeStyle).toHaveBeenCalledWith(edges[2])
  })

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

  it("stashes __arcData on nodes", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10)]
    const config: NetworkPipelineConfig = { chartType: "chord" }

    chordLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])

    for (const node of nodes) {
      expect(node.__arcData).toBeDefined()
      expect(node.__arcData?.startAngle).toBeDefined()
      expect(node.__arcData?.endAngle).toBeDefined()
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

  it("evaluates each style callback once per rendered mark", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B"), makeEdge("B", "C"), makeEdge("A", "C")]
    const nodeStyle = vi.fn(() => ({ fill: "red", stroke: "blue", strokeWidth: 3 }))
    const edgeStyle = vi.fn(() => ({ fill: "green", stroke: "purple", fillOpacity: 0.4 }))
    const config: NetworkPipelineConfig = { chartType: "chord", nodeStyle, edgeStyle }
    chordLayoutPlugin.computeLayout(nodes, edges, config, [600, 600])
    const scene = chordLayoutPlugin.buildScene(nodes, edges, config, [600, 600])
    expect(nodeStyle).toHaveBeenCalledTimes(scene.sceneNodes.length)
    expect(edgeStyle).toHaveBeenCalledTimes(scene.sceneEdges.length)
    for (const node of scene.sceneNodes) {
      expect(node.style).toMatchObject({ fill: "red", stroke: "blue", strokeWidth: 3 })
    }
    for (const edge of scene.sceneEdges) {
      expect(edge.style).toMatchObject({ fill: "green", stroke: "purple", fillOpacity: 0.4 })
    }
  })

  it.each([false, true])("translates ribbon endpoints and control points (self-link: %s)", (selfLink) => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", selfLink ? "A" : "B")]
    const config: NetworkPipelineConfig = { chartType: "chord" }
    chordLayoutPlugin.computeLayout(nodes, edges, config, [600, 400])
    const scene = chordLayoutPlugin.buildScene(nodes, edges, config, [600, 400])
    expect(scene.sceneEdges).toHaveLength(1)
    const edge = scene.sceneEdges[0]
    if (edge.type !== "ribbon") throw new Error("Expected a ribbon edge")
    expect(edge.pathD).toMatch(/^M 300 20 A 180 180 /)
    expect(edge.pathD).toContain("Q 300 200")
    expect(edge.pathD).not.toMatch(/NaN|Infinity/)
  })
})

// Exercise the public ingestion/update contract as well as the layout plugin:
// the configured accessor receives raw rows, never RealtimeEdge wrappers.

const chordSize: [number, number] = [600, 400]

function chordFor(edge: RealtimeEdge): Chord {
  return edge.__chordData as Chord
}

describe("chord value ingestion and updates", () => {
  it.each(["weight" as const, (d: Record<string, unknown>) => Number(d.weight)])(
    "preserves the 90:10 ratio with accessor %s",
    (valueAccessor) => {
      const store = new NetworkPipelineStore({ chartType: "chord", valueAccessor })
      store.ingestBounded([], [
        { source: "A", target: "B", weight: 90 },
        { source: "A", target: "C", weight: 10 }
      ], chordSize)
      const [large, small] = [...store.edges.values()].map(chordFor)
      expect(large.source.value).toBe(90)
      expect(small.source.value).toBe(10)
      const span = (chord: Chord) => chord.source.endAngle - chord.source.startAngle
      expect(span(large) / span(small)).toBeCloseTo(9)
    }
  )

  it("sums parallel edges, retains both directions, and paints each ribbon once", () => {
    const raw = [
      { source: "A", target: "B", value: 3 },
      { source: "A", target: "B", value: 7 },
      { source: "B", target: "A", value: 5 },
      { source: "A", target: "C", value: 2 }
    ]
    const store = new NetworkPipelineStore({ chartType: "chord" })
    store.ingestBounded([], raw, chordSize)
    store.buildScene(chordSize)
    const edges = [...store.edges.values()]
    expect(chordFor(edges[0]).source.value).toBe(10)
    expect(chordFor(edges[0]).target.value).toBe(5)
    for (const edge of edges.slice(0, 3)) {
      expect(edge.__chordData).toBe(edges[0].__chordData)
      expect(edge.__chordEdges?.map((contributor) => contributor.data)).toEqual(raw.slice(0, 3))
    }
    expect(store.sceneEdges).toHaveLength(2)
  })

  it("removes zeroed ribbons, isolated arcs, and labels, then restores positive updates", () => {
    const store = new NetworkPipelineStore({ chartType: "chord", showLabels: true })
    store.ingestBounded([], [
      { source: "A", target: "B", value: 8 },
      { source: "A", target: "C", value: 2 }
    ], chordSize)
    store.updateEdge("A", "B", (d) => ({ ...d, value: 0 }))
    store.runLayout(chordSize)
    store.buildScene(chordSize)
    expect(store.sceneEdges).toHaveLength(1)
    expect(store.sceneNodes.map((n) => n.id)).toEqual(["A", "C"])
    expect(store.labels.map((label) => label.text)).toEqual(["A", "C"])
    expect([...store.edges.values()][0].__chordData).toBeUndefined()
    store.updateEdge("A", "C", (d) => ({ ...d, value: 0 }))
    store.runLayout(chordSize)
    store.buildScene(chordSize)
    expect(store.sceneEdges).toEqual([])
    expect(store.sceneNodes).toEqual([])
    expect(store.labels).toEqual([])
    store.updateEdge("A", "B", (d) => ({ ...d, value: 4 }))
    store.runLayout(chordSize)
    store.buildScene(chordSize)
    expect(store.sceneEdges).toHaveLength(1)
    expect(chordFor([...store.edges.values()][0]).source.value).toBe(4)
  })

  it("ignores nonpositive/nonfinite values without changing valid geometry", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")]
    const edges = [makeEdge("A", "B", 10), ...[-1, NaN, Infinity, 0].map((value) => makeEdge("B", "C", value))]
    const config: NetworkPipelineConfig = { chartType: "chord" }
    chordLayoutPlugin.computeLayout(nodes, edges, config, chordSize)
    const scene = chordLayoutPlugin.buildScene(nodes, edges, config, chordSize)
    expect(scene.sceneNodes.map((n) => n.id)).toEqual(["A", "B"])
    expect(scene.sceneEdges).toHaveLength(1)
    expect(JSON.stringify(scene.sceneEdges[0].type === "ribbon" && scene.sceneEdges[0].pathD)).not.toMatch(/NaN|Infinity/)
    for (const node of scene.sceneNodes) {
      if (node.type !== "arc") throw new Error("Expected arc")
      expect(Number.isFinite(node.startAngle)).toBe(true)
      expect(Number.isFinite(node.endAngle)).toBe(true)
    }
  })

  it("keeps positive arc extent when default padding would consume the circle", () => {
    const nodes = Array.from({ length: 650 }, (_, i) => makeNode(String(i)))
    const edges = nodes.map((node) => makeEdge(node.id, node.id, 1))
    chordLayoutPlugin.computeLayout(nodes, edges, { chartType: "chord" }, chordSize)
    for (const node of nodes) {
      expect(node.__arcData!.endAngle - node.__arcData!.startAngle).toBeGreaterThan(0)
    }
  })

  it("uses outgoing magnitude for asymmetric arcs and equal endpoints for symmetric data", () => {
    const nodes = [makeNode("A"), makeNode("B")]
    const edges = [makeEdge("A", "B", 10)]
    chordLayoutPlugin.computeLayout(nodes, edges, { chartType: "chord" }, chordSize)
    expect(nodes[1].__arcData!.endAngle - nodes[1].__arcData!.startAngle).toBe(0)
    edges.push(makeEdge("B", "A", 10))
    chordLayoutPlugin.computeLayout(nodes, edges, { chartType: "chord" }, chordSize)
    const chord = chordFor(edges[0])
    expect(chord.source.endAngle - chord.source.startAngle).toBeCloseTo(chord.target.endAngle - chord.target.startAngle)
  })
})
