import { describe, expect, it } from "vitest"
import { scaleLinear } from "d3-scale"
import {
  buildPythonTutorMemoryGraph,
  createGofishGlyphLayout,
  gofishBottleFillLayout,
  gofishFlowerLayout,
  gofishPolarRibbonLayout,
  gofishPythonTutorLayout,
  gofishPythonTutorNetworkLayout,
  gofishTitanicCircleTreemapLayout,
} from "./gofish"
import type { LayoutContext } from "../stream/customLayout"
import type { PointSceneNode, RectSceneNode, SceneNode } from "../stream/types"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { RealtimeEdge, RealtimeNode } from "../stream/networkTypes"

function makeCtx<C extends object>(config: C, overrides?: Partial<LayoutContext<C>>): LayoutContext<C> {
  const x = scaleLinear().domain([0, 100]).range([0, 500])
  const y = scaleLinear().domain([0, 100]).range([320, 0])
  return {
    data: [],
    scales: { x, y } as unknown as LayoutContext["scales"],
    dimensions: {
      width: 500,
      height: 320,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 0, y: 0, width: 500, height: 320 },
    },
    theme: {
      semantic: { primary: "#4e79a7", success: "#2e7d32", danger: "#c62828", surface: "#eee" },
      categorical: ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2"],
    },
    resolveColor: (group) => {
      const palette = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f"]
      let hash = 0
      for (let i = 0; i < group.length; i++) hash = (hash * 31 + group.charCodeAt(i)) | 0
      return palette[Math.abs(hash) % palette.length]
    },
    config,
    ...overrides,
  }
}

function makeNetworkCtx<C extends object>(
  config: C,
  overrides?: Partial<NetworkLayoutContext<C>>
): NetworkLayoutContext<C> {
  return {
    nodes: [],
    edges: [],
    dimensions: {
      width: 600,
      height: 340,
      plot: { x: 0, y: 0, width: 600, height: 340 },
    },
    theme: {
      semantic: { primary: "#4e79a7", success: "#2e7d32", danger: "#c62828", surface: "#eee" },
      categorical: ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2"],
    },
    resolveColor: (key) => key === "heap" ? "#59a14f" : "#4e79a7",
    config,
    selection: null,
    ...overrides,
  }
}

const seafood = [
  { lake: "Erie", species: "Trout", count: 42, x: 0 },
  { lake: "Erie", species: "Perch", count: 28, x: 0 },
  { lake: "Huron", species: "Trout", count: 31, x: 1 },
  { lake: "Huron", species: "Bass", count: 22, x: 1 },
  { lake: "Michigan", species: "Perch", count: 35, x: 2 },
  { lake: "Michigan", species: "Bass", count: 18, x: 2 },
]

function isRectNode(node: SceneNode): node is RectSceneNode {
  return node.type === "rect"
}

function isPointNode(node: SceneNode): node is PointSceneNode {
  return node.type === "point"
}

describe("createGofishGlyphLayout", () => {
  it("compiles interactive glyph marks to Semiotic scene nodes and leaves chrome as overlays", () => {
    const layout = createGofishGlyphLayout(() => ({
      marks: [
        { kind: "rect", id: "r", x: 10, y: 20, width: 30, height: 40, datum: { id: "r" } },
        { kind: "circle", id: "c", cx: 90, cy: 80, r: 7, datum: { id: "c" } },
        { kind: "path", id: "p", d: "M0,0L10,10", style: { stroke: "#333" } },
      ],
    }))

    const result = layout(makeCtx({}))

    expect(result.nodes?.map((node) => node.type)).toEqual(["rect", "point"])
    expect(result.nodes?.map((node) => node._transitionKey)).toEqual(["r", "c"])
    expect(result.overlays).toBeTruthy()
  })
})

describe("GoFish-style recipes", () => {
  it("renders the flower chart as interactive stems plus petal overlays", () => {
    const result = gofishFlowerLayout(makeCtx({ flowerRadius: 30 }, { data: seafood }))
    const nodes = result.nodes ?? []

    expect(nodes.filter((node) => node.type === "rect")).toHaveLength(3)
    expect(nodes.every((node) => node.datum != null)).toBe(true)
    expect(result.overlays).toBeTruthy()
  })

  it("renders the bottle fill chart with one hit target per bottle", () => {
    const data = [
      { category: "A", amount: 72 },
      { category: "B", amount: 48 },
      { category: "C", amount: 91 },
    ]
    const result = gofishBottleFillLayout(makeCtx({ bottleHeight: 180 }, { data }))
    const nodes = result.nodes ?? []
    const rects = nodes.filter(isRectNode)

    expect(nodes).toHaveLength(data.length)
    expect(rects).toHaveLength(data.length)
    expect(rects.map((node) => node.group)).toEqual(["A", "B", "C"])
  })

  it("renders the polar ribbon chart with data-bearing hit nodes", () => {
    const result = gofishPolarRibbonLayout(makeCtx({ outerRadius: 120 }, { data: seafood }))
    const nodes = result.nodes ?? []
    const points = nodes.filter(isPointNode)

    expect(nodes).toHaveLength(seafood.length)
    expect(points).toHaveLength(seafood.length)
    expect(new Set(points.map((node) => node.datum?.species))).toEqual(new Set(["Trout", "Perch", "Bass"]))
    expect(result.overlays).toBeTruthy()
  })

  it("renders the Titanic fare circle treemap as packed passenger circles inside class regions", () => {
    const data = [
      { name: "p1-a", pclass: 1, survived: true, fare: 71 },
      { name: "p1-b", pclass: 1, survived: false, fare: 38 },
      { name: "p2-a", pclass: 2, survived: true, fare: 26 },
      { name: "p3-a", pclass: 3, survived: false, fare: 8 },
      { name: "p3-b", pclass: 3, survived: true, fare: 12 },
    ]
    const result = gofishTitanicCircleTreemapLayout(makeCtx({ padding: 1.5 }, { data }))
    const nodes = result.nodes ?? []
    const points = nodes.filter(isPointNode)

    expect(points).toHaveLength(data.length)
    expect(nodes.filter(isRectNode)).toHaveLength(0)
    expect(new Set(points.map((node) => String(node.datum?.survived)))).toEqual(new Set(["true", "false"]))
  })

  it("renders the Python Tutor memory diagram as stack and heap scene nodes", () => {
    const diagram = {
      stack: [
        { name: "c", value: { pointer: 0 } },
        { name: "d", value: { pointer: 1 } },
        { name: "x", value: "5" },
      ],
      heap: [
        { values: ["12", { pointer: 1 }, "1", "0", { pointer: 2 }, { pointer: 3 }] },
        { values: ["9", "8"] },
        { values: ["7", "6"] },
        { values: ["5", "4"] },
      ],
      heapArrangement: [[0, 3, null], [null, 1, 2]],
    }
    const result = gofishPythonTutorLayout(makeCtx({ diagram }, { data: [] }))
    const nodes = result.nodes ?? []
    const rects = nodes.filter(isRectNode)

    expect(rects.length).toBeGreaterThanOrEqual(7)
    expect(new Set(rects.map((node) => node.group))).toEqual(new Set(["binding", "heap"]))
    expect(result.overlays).toBeTruthy()
  })

  it("renders the Python Tutor memory diagram as a network custom layout with particle-ready edges", () => {
    const diagram = {
      stack: [
        { name: "c", value: { pointer: 0 } },
        { name: "d", value: { pointer: 1 } },
        { name: "x", value: "5" },
      ],
      heap: [
        { values: ["12", { pointer: 1 }, "1", "0", { pointer: 2 }, { pointer: 3 }] },
        { values: ["9", "8"] },
        { values: ["7", "6"] },
        { values: ["5", "4"] },
      ],
      heapArrangement: [[0, 3, null], [null, 1, 2]],
    }
    const graph = buildPythonTutorMemoryGraph(diagram)
    const nodes = graph.nodes.map((node) => ({
      id: String(node.id),
      data: node,
      value: 1,
      x: 0,
      y: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      width: 0,
      height: 0,
    })) as RealtimeNode[]
    const edges = graph.edges.map((edge) => ({
      source: String(edge.source),
      target: String(edge.target),
      value: Number(edge.value ?? 1),
      y0: 0,
      y1: 0,
      sankeyWidth: 1,
      data: edge,
    })) as RealtimeEdge[]

    const result = gofishPythonTutorNetworkLayout(makeNetworkCtx({ diagram }, { nodes, edges }))

    expect(result.sceneNodes?.filter((node) => node.type === "rect").length).toBeGreaterThan(8)
    expect(result.sceneEdges).toHaveLength(graph.edges.length)
    expect(edges.every((edge) => edge.bezier?.points?.length === 4)).toBe(true)
    expect(result.overlays).toBeTruthy()

    const compact = gofishPythonTutorNetworkLayout(makeNetworkCtx({ diagram, heapGap: 4 }, { nodes, edges }))
    const spacious = gofishPythonTutorNetworkLayout(makeNetworkCtx({ diagram, heapGap: 34 }, { nodes, edges }))
    const compactHeap = compact.sceneNodes?.find((node) => node.type === "rect" && node.id === "cell-1-0")
    const spaciousHeap = spacious.sceneNodes?.find((node) => node.type === "rect" && node.id === "cell-1-0")

    expect(spaciousHeap?.type).toBe("rect")
    expect(compactHeap?.type).toBe("rect")
    if (compactHeap?.type === "rect" && spaciousHeap?.type === "rect") {
      expect(spaciousHeap.y).toBeGreaterThan(compactHeap.y)
    }
  })
})
