import {
  extractXYNavPoints,
  extractOrdinalNavPoints,
  extractNetworkNavPoints,
  extractGeoNavPoints,
  nextIndex,
  navPointToHover,
  buildNavGraph,
  resolvePosition,
  nextGraphIndex,
  nextNetworkIndex,
  type NavPoint,
  type NavPosition
} from "./keyboardNav"

describe("extractXYNavPoints", () => {
  it("extracts points from a scatter scene", () => {
    const scene = [
      { type: "point", x: 50, y: 30, datum: { id: 1 } },
      { type: "point", x: 10, y: 20, datum: { id: 2 } }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(2)
    // Should be sorted by x
    expect(result[0]).toMatchObject({ x: 10, y: 20, datum: { id: 2 }, shape: "circle" })
    expect(result[1]).toMatchObject({ x: 50, y: 30, datum: { id: 1 }, shape: "circle" })
  })

  it("extracts points from a line scene with group", () => {
    const scene = [
      {
        type: "line",
        group: "seriesA",
        path: [[0, 100], [50, 50], [100, 0]] as [number, number][],
        datum: [{ t: 0 }, { t: 1 }, { t: 2 }]
      }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ x: 0, y: 100, datum: { t: 0 }, group: "seriesA" })
    expect(result[2]).toMatchObject({ x: 100, y: 0, datum: { t: 2 }, group: "seriesA" })
  })

  it("defaults group to _default for lines without group", () => {
    const scene = [
      {
        type: "line",
        path: [[0, 100]] as [number, number][],
        datum: [{ t: 0 }]
      }
    ]
    const result = extractXYNavPoints(scene)
    expect(result[0].group).toBe("_default")
  })

  it("handles line with non-array datum gracefully", () => {
    const scene = [
      { type: "line", path: [[10, 20]], datum: "not-an-array" }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(0)
  })

  it("extracts points from an area scene using topPath", () => {
    const scene = [
      {
        type: "area",
        group: "areaGroup",
        topPath: [[10, 80], [50, 40]] as [number, number][],
        bottomPath: [[10, 100], [50, 100]] as [number, number][],
        datum: [{ v: "a" }, { v: "b" }]
      }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ x: 10, y: 80, datum: { v: "a" }, group: "areaGroup" })
    expect(result[1]).toMatchObject({ x: 50, y: 40, datum: { v: "b" }, group: "areaGroup" })
  })

  it("handles area with non-array datum gracefully", () => {
    const scene = [
      { type: "area", topPath: [[10, 20]], datum: "not-an-array" }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(0)
  })

  it("extracts center of rect nodes", () => {
    const scene = [
      { type: "rect", x: 20, y: 10, w: 40, h: 60, datum: { cat: "A" } }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ x: 40, y: 40, datum: { cat: "A" }, shape: "rect", w: 40, h: 60 })
  })

  it("extracts center of heatcell nodes", () => {
    const scene = [
      { type: "heatcell", x: 0, y: 0, w: 20, h: 20, datum: { val: 5 } }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ x: 10, y: 10, datum: { val: 5 }, shape: "rect", w: 20, h: 20 })
  })

  it("returns empty array for empty scene", () => {
    expect(extractXYNavPoints([])).toEqual([])
  })

  it("ignores unknown node types", () => {
    const scene = [{ type: "unknown", x: 5, y: 5 }]
    expect(extractXYNavPoints(scene)).toEqual([])
  })

  it("sorts by x then y for tie-breaking", () => {
    const scene = [
      { type: "point", x: 10, y: 50, datum: "B" },
      { type: "point", x: 10, y: 10, datum: "A" },
      { type: "point", x: 5, y: 99, datum: "C" }
    ]
    const result = extractXYNavPoints(scene)
    expect(result.map(p => p.datum)).toEqual(["C", "A", "B"])
  })

  it("handles mixed node types in a single scene", () => {
    const scene = [
      { type: "point", x: 100, y: 10, datum: "pt" },
      { type: "rect", x: 0, y: 0, w: 20, h: 20, datum: "rect" },
      {
        type: "line",
        path: [[50, 50]] as [number, number][],
        datum: [{ line: true }]
      }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(3)
    // Sorted: rect center (10), line (50), point (100)
    expect(result[0].x).toBe(10)
    expect(result[1].x).toBe(50)
    expect(result[2].x).toBe(100)
  })
})

describe("extractOrdinalNavPoints", () => {
  it("extracts center of bar (rect) nodes with group", () => {
    const scene = [
      { type: "rect", x: 0, y: 10, w: 30, h: 80, datum: { cat: "A" }, group: "stack1" },
      { type: "rect", x: 40, y: 20, w: 30, h: 70, datum: { cat: "B" }, group: "stack2" }
    ]
    const result = extractOrdinalNavPoints(scene)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ x: 15, y: 50, group: "stack1" })
    expect(result[1]).toMatchObject({ x: 55, y: 55, group: "stack2" })
  })

  it("falls back to category as group for rects without group", () => {
    const scene = [
      { type: "rect", x: 0, y: 10, w: 30, h: 80, datum: { category: "CatA" } }
    ]
    const result = extractOrdinalNavPoints(scene)
    expect(result[0].group).toBe("CatA")
  })

  it("extracts swarm (point) nodes", () => {
    const scene = [
      { type: "point", x: 25, y: 60, datum: { val: 3 } }
    ]
    const result = extractOrdinalNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ x: 25, y: 60, datum: { val: 3 }, shape: "circle" })
  })

  it("extracts pie (wedge) nodes using arc midpoint", () => {
    const scene = [
      {
        type: "wedge",
        cx: 100,
        cy: 100,
        innerRadius: 0,
        outerRadius: 80,
        startAngle: 0,
        endAngle: Math.PI,
        datum: { slice: "half" }
      }
    ]
    const result = extractOrdinalNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBeCloseTo(100, 0)
    expect(result[0].y).toBeCloseTo(140, 0)
    expect(result[0].datum).toEqual({ slice: "half" })
  })

  it("handles donut wedge with innerRadius", () => {
    const scene = [
      {
        type: "wedge",
        cx: 50,
        cy: 50,
        innerRadius: 20,
        outerRadius: 40,
        startAngle: 0,
        endAngle: 0,
        datum: { d: 1 }
      }
    ]
    const result = extractOrdinalNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBeCloseTo(80)
    expect(result[0].y).toBeCloseTo(50)
  })

  it("returns empty array for empty scene", () => {
    expect(extractOrdinalNavPoints([])).toEqual([])
  })

  it("skips rect nodes with null x", () => {
    const scene = [
      { type: "rect", x: null, y: 10, w: 20, h: 20, datum: { skip: true } }
    ]
    expect(extractOrdinalNavPoints(scene)).toEqual([])
  })

  it("skips wedge nodes with null cx", () => {
    const scene = [
      { type: "wedge", cx: null, cy: 50, startAngle: 0, endAngle: Math.PI, datum: { skip: true } }
    ]
    expect(extractOrdinalNavPoints(scene)).toEqual([])
  })

})

describe("extractNetworkNavPoints", () => {
  it("extracts circle nodes with id-based group", () => {
    const scene = [
      { type: "circle", cx: 100, cy: 200, r: 10, datum: { id: "A" } },
      { type: "circle", cx: 50, cy: 150, r: 8, datum: { id: "B" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(2)
    // Sorted by x
    expect(result[0]).toMatchObject({ x: 50, y: 150, group: "B" })
    expect(result[1]).toMatchObject({ x: 100, y: 200, group: "A" })
  })

  it("extracts rect nodes (sankey layout)", () => {
    const scene = [
      { type: "rect", x: 10, y: 20, w: 20, h: 60, datum: { id: "node1" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ x: 20, y: 50, group: "node1" })
  })

  it("extracts arc nodes (chord layout)", () => {
    const scene = [
      { type: "arc", cx: 200, cy: 200, datum: { id: "group1" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ x: 200, y: 200, group: "group1" })
  })

  it("ignores edge types (line, bezier, ribbon)", () => {
    const scene = [
      { type: "line", x1: 0, y1: 0, x2: 100, y2: 100, datum: {} },
      { type: "bezier", pathD: "M0,0 C...", datum: {} }
    ]
    expect(extractNetworkNavPoints(scene)).toEqual([])
  })

  it("returns empty array for empty scene", () => {
    expect(extractNetworkNavPoints([])).toEqual([])
  })

  it("skips circle nodes without coordinates", () => {
    const scene = [
      { type: "circle", cx: null, cy: 100, r: 5, datum: { id: "no-x" } },
      { type: "circle", cx: 50, cy: 75, r: 5, datum: { id: "valid" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0].datum.id).toBe("valid")
  })

  it("skips rect nodes with null x", () => {
    const scene = [
      { type: "rect", x: null, y: 0, w: 10, h: 10, datum: { id: "skip" } }
    ]
    expect(extractNetworkNavPoints(scene)).toEqual([])
  })

  it("skips arc nodes with null cx", () => {
    const scene = [
      { type: "arc", cx: null, cy: 200, datum: { id: "skip" } }
    ]
    expect(extractNetworkNavPoints(scene)).toEqual([])
  })

  it("handles mixed node types", () => {
    const scene = [
      { type: "circle", cx: 300, cy: 100, r: 5, datum: { id: "c" } },
      { type: "rect", x: 0, y: 0, w: 10, h: 40, datum: { id: "r" } },
      { type: "arc", cx: 150, cy: 150, datum: { id: "a" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(3)
    expect(result[0].x).toBe(5)   // rect center
    expect(result[1].x).toBe(150) // arc
    expect(result[2].x).toBe(300) // circle
  })
})

describe("nextIndex", () => {
  it("ArrowRight increments index", () => {
    expect(nextIndex("ArrowRight", 0, 5)).toBe(1)
    expect(nextIndex("ArrowRight", 3, 5)).toBe(4)
  })

  it("ArrowRight clamps at end", () => {
    expect(nextIndex("ArrowRight", 4, 5)).toBe(4)
  })

  it("ArrowDown increments index", () => {
    expect(nextIndex("ArrowDown", 0, 5)).toBe(1)
    expect(nextIndex("ArrowDown", 3, 5)).toBe(4)
  })

  it("ArrowDown clamps at end", () => {
    expect(nextIndex("ArrowDown", 4, 5)).toBe(4)
  })

  it("ArrowLeft decrements index", () => {
    expect(nextIndex("ArrowLeft", 3, 5)).toBe(2)
  })

  it("ArrowLeft clamps at start", () => {
    expect(nextIndex("ArrowLeft", 0, 5)).toBe(0)
  })

  it("ArrowUp decrements index", () => {
    expect(nextIndex("ArrowUp", 3, 5)).toBe(2)
  })

  it("ArrowUp clamps at start", () => {
    expect(nextIndex("ArrowUp", 0, 5)).toBe(0)
  })

  it("Home returns 0", () => {
    expect(nextIndex("Home", 4, 5)).toBe(0)
  })

  it("End returns last index", () => {
    expect(nextIndex("End", 0, 5)).toBe(4)
  })

  it("Escape returns -1", () => {
    expect(nextIndex("Escape", 2, 5)).toBe(-1)
  })

  it("unrecognized key returns null", () => {
    expect(nextIndex("a", 0, 5)).toBeNull()
    expect(nextIndex("Tab", 0, 5)).toBeNull()
    expect(nextIndex("Enter", 0, 5)).toBeNull()
  })

  it("PageDown skips by 10% of total", () => {
    expect(nextIndex("PageDown", 0, 100)).toBe(10)
    expect(nextIndex("PageDown", 95, 100)).toBe(99) // clamps at end
  })

  it("PageUp skips back by 10% of total", () => {
    expect(nextIndex("PageUp", 50, 100)).toBe(40)
    expect(nextIndex("PageUp", 3, 100)).toBe(0) // clamps at start
  })

  it("PageDown/PageUp with small total still moves at least 1", () => {
    expect(nextIndex("PageDown", 0, 5)).toBe(1)
    expect(nextIndex("PageUp", 2, 5)).toBe(1)
  })

})

describe("extractGeoNavPoints", () => {
  it("extracts point nodes", () => {
    const scene = [
      { type: "point", x: 100, y: 200, datum: { name: "city1" } },
      { type: "point", x: 50, y: 150, datum: { name: "city2" } }
    ]
    const result = extractGeoNavPoints(scene)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ x: 50, y: 150, datum: { name: "city2" }, shape: "circle" })
    expect(result[1]).toMatchObject({ x: 100, y: 200, datum: { name: "city1" }, shape: "circle" })
  })

  it("extracts geoarea nodes using centroid", () => {
    const scene = [
      { type: "geoarea", centroid: [300, 200], datum: { properties: { name: "France" } } }
    ]
    const result = extractGeoNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ x: 300, y: 200, datum: { properties: { name: "France" } }, shape: "circle" })
  })

  it("returns empty array for empty scene", () => {
    expect(extractGeoNavPoints([])).toEqual([])
  })

  it("ignores non-navigable node types", () => {
    const scene = [
      { type: "line", path: [[0, 0], [100, 100]], datum: {} },
      { type: "graticule", pathData: "M...", datum: null }
    ]
    expect(extractGeoNavPoints(scene)).toEqual([])
  })

  it("skips point nodes with null x", () => {
    const scene = [
      { type: "point", x: null, y: 100, datum: { id: "skip" } }
    ]
    expect(extractGeoNavPoints(scene)).toEqual([])
  })
})

describe("navPointToHover", () => {
  it("converts NavPoint to HoverData", () => {
    const point: NavPoint = { x: 42, y: 99, datum: { id: "test", val: 10 } }
    const hover = navPointToHover(point)
    // Spreads raw datum fields + adds normalized keys
    expect(hover.data).toEqual({ id: "test", val: 10 })
    expect(hover.id).toBe("test")
    expect(hover.val).toBe(10)
    expect(hover.x).toBe(42)
    expect(hover.y).toBe(99)
    expect(hover.time).toBe(42)
    expect(hover.value).toBe(99)
  })

  it("handles null datum", () => {
    const point: NavPoint = { x: 0, y: 0, datum: null }
    const hover = navPointToHover(point)
    // null datum falls back to {} via || {}
    expect(hover.data).toEqual({})
    expect(hover.x).toBe(0)
    expect(hover.y).toBe(0)
    expect(hover.time).toBe(0)
    expect(hover.value).toBe(0)
  })
})

// ── Navigation Graph Tests ──────────────────────────────────────────────

describe("buildNavGraph", () => {
  it("groups points by their group field", () => {
    const points: NavPoint[] = [
      { x: 0, y: 10, datum: "a1", group: "A" },
      { x: 0, y: 50, datum: "b1", group: "B" },
      { x: 10, y: 15, datum: "a2", group: "A" },
      { x: 10, y: 55, datum: "b2", group: "B" },
    ]
    const graph = buildNavGraph(points)
    expect(graph.groups).toHaveLength(2)
    expect(graph.byGroup.get("A")).toHaveLength(2)
    expect(graph.byGroup.get("B")).toHaveLength(2)
  })

  it("sorts within-group points by x", () => {
    const points: NavPoint[] = [
      { x: 50, y: 10, datum: "a2", group: "A" },
      { x: 10, y: 10, datum: "a1", group: "A" },
    ]
    const graph = buildNavGraph(points)
    const groupA = graph.byGroup.get("A")!
    expect(groupA[0].datum).toBe("a1")
    expect(groupA[1].datum).toBe("a2")
  })

  it("sorts groups by first-point y (top to bottom)", () => {
    const points: NavPoint[] = [
      { x: 0, y: 100, datum: "b", group: "bottom" },
      { x: 0, y: 10, datum: "t", group: "top" },
    ]
    const graph = buildNavGraph(points)
    expect(graph.groups[0]).toBe("top")
    expect(graph.groups[1]).toBe("bottom")
  })

  it("defaults missing group to _default", () => {
    const points: NavPoint[] = [
      { x: 0, y: 0, datum: "a" },
      { x: 10, y: 10, datum: "b" },
    ]
    const graph = buildNavGraph(points)
    expect(graph.groups).toEqual(["_default"])
    expect(graph.byGroup.get("_default")).toHaveLength(2)
  })

  it("flat array contains all points sorted by x", () => {
    const points: NavPoint[] = [
      { x: 50, y: 10, datum: "a", group: "A" },
      { x: 10, y: 20, datum: "b", group: "B" },
      { x: 30, y: 15, datum: "c", group: "A" },
    ]
    const graph = buildNavGraph(points)
    expect(graph.flat).toHaveLength(3)
    expect(graph.flat[0].x).toBe(10)
    expect(graph.flat[1].x).toBe(30)
    expect(graph.flat[2].x).toBe(50)
  })
})

describe("resolvePosition", () => {
  it("finds correct group and index for a flat index", () => {
    const points: NavPoint[] = [
      { x: 0, y: 10, datum: "a1", group: "A" },
      { x: 0, y: 50, datum: "b1", group: "B" },
      { x: 10, y: 15, datum: "a2", group: "A" },
    ]
    const graph = buildNavGraph(points)

    // flat is sorted by x,y: [a1(0,10), b1(0,50), a2(10,15)]
    const posA1 = resolvePosition(graph, 0) // a1
    expect(posA1.group).toBe("A")
    expect(posA1.indexInGroup).toBe(0)

    const posB1 = resolvePosition(graph, 1) // b1
    expect(posB1.group).toBe("B")
    expect(posB1.indexInGroup).toBe(0)

    const posA2 = resolvePosition(graph, 2) // a2
    expect(posA2.group).toBe("A")
    expect(posA2.indexInGroup).toBe(1)
  })
})

describe("nextGraphIndex — XY series navigation", () => {
  // Two series: "top" at y=10 and "bottom" at y=50, each with 3 x-positions
  const points: NavPoint[] = [
    { x: 0, y: 10, datum: "t0", group: "top" },
    { x: 50, y: 10, datum: "t1", group: "top" },
    { x: 100, y: 10, datum: "t2", group: "top" },
    { x: 0, y: 50, datum: "b0", group: "bottom" },
    { x: 50, y: 50, datum: "b1", group: "bottom" },
    { x: 100, y: 50, datum: "b2", group: "bottom" },
  ]

  function getGraph() { return buildNavGraph(points) }

  it("ArrowRight moves within the same series", () => {
    const graph = getGraph()
    // Start at t0 (group "top", index 0)
    const t0idx = graph.flat.findIndex(p => p.datum === "t0")
    const pos = resolvePosition(graph, t0idx)
    const nextIdx = nextGraphIndex("ArrowRight", pos, graph)!
    expect(graph.flat[nextIdx].datum).toBe("t1")
  })

  it("ArrowLeft moves back within the same series", () => {
    const graph = getGraph()
    const t1idx = graph.flat.findIndex(p => p.datum === "t1")
    const pos = resolvePosition(graph, t1idx)
    const nextIdx = nextGraphIndex("ArrowLeft", pos, graph)!
    expect(graph.flat[nextIdx].datum).toBe("t0")
  })

  it("ArrowRight at end of series stays put", () => {
    const graph = getGraph()
    const t2idx = graph.flat.findIndex(p => p.datum === "t2")
    const pos = resolvePosition(graph, t2idx)
    const nextIdx = nextGraphIndex("ArrowRight", pos, graph)!
    expect(nextIdx).toBe(t2idx) // stays at end
  })

  it("ArrowDown switches to the nearest point in the next series", () => {
    const graph = getGraph()
    const t1idx = graph.flat.findIndex(p => p.datum === "t1")
    const pos = resolvePosition(graph, t1idx)
    const nextIdx = nextGraphIndex("ArrowDown", pos, graph)!
    // Should jump to bottom series at x=50
    expect(graph.flat[nextIdx].datum).toBe("b1")
  })

  it("ArrowUp switches to the nearest point in the previous series", () => {
    const graph = getGraph()
    const b2idx = graph.flat.findIndex(p => p.datum === "b2")
    const pos = resolvePosition(graph, b2idx)
    const nextIdx = nextGraphIndex("ArrowUp", pos, graph)!
    // Should jump to top series at x=100
    expect(graph.flat[nextIdx].datum).toBe("t2")
  })

  it("ArrowDown at last group stays put", () => {
    const graph = getGraph()
    const b0idx = graph.flat.findIndex(p => p.datum === "b0")
    const pos = resolvePosition(graph, b0idx)
    const nextIdx = nextGraphIndex("ArrowDown", pos, graph)!
    expect(nextIdx).toBe(b0idx) // already at last group
  })

  it("ArrowUp at first group stays put", () => {
    const graph = getGraph()
    const t0idx = graph.flat.findIndex(p => p.datum === "t0")
    const pos = resolvePosition(graph, t0idx)
    const nextIdx = nextGraphIndex("ArrowUp", pos, graph)!
    expect(nextIdx).toBe(t0idx) // already at first group
  })

  it("Escape returns -1", () => {
    const graph = getGraph()
    const pos = resolvePosition(graph, 0)
    expect(nextGraphIndex("Escape", pos, graph)).toBe(-1)
  })

  it("Home returns 0", () => {
    const graph = getGraph()
    const pos = resolvePosition(graph, 3)
    expect(nextGraphIndex("Home", pos, graph)).toBe(0)
  })

  it("End returns last index", () => {
    const graph = getGraph()
    const pos = resolvePosition(graph, 0)
    expect(nextGraphIndex("End", pos, graph)).toBe(graph.flat.length - 1)
  })

  it("unrecognized key returns null", () => {
    const graph = getGraph()
    const pos = resolvePosition(graph, 0)
    expect(nextGraphIndex("Tab", pos, graph)).toBeNull()
  })
})

describe("nextGraphIndex — single series falls back to within-group", () => {
  const points: NavPoint[] = [
    { x: 0, y: 10, datum: "a", group: "only" },
    { x: 50, y: 20, datum: "b", group: "only" },
    { x: 100, y: 30, datum: "c", group: "only" },
  ]

  it("ArrowRight moves forward", () => {
    const graph = buildNavGraph(points)
    const pos = resolvePosition(graph, 0)
    const next = nextGraphIndex("ArrowRight", pos, graph)!
    expect(graph.flat[next].datum).toBe("b")
  })

  it("ArrowDown stays put (no other group)", () => {
    const graph = buildNavGraph(points)
    const pos = resolvePosition(graph, 1)
    const next = nextGraphIndex("ArrowDown", pos, graph)!
    expect(next).toBe(1)
  })
})

describe("nextNetworkIndex — neighbor traversal", () => {
  // Simple graph: A -- B -- C
  const scene = [
    { type: "circle", cx: 0, cy: 0, r: 5, datum: { id: "A" } },
    { type: "circle", cx: 50, cy: 0, r: 5, datum: { id: "B" } },
    { type: "circle", cx: 100, cy: 0, r: 5, datum: { id: "C" } },
  ]
  const edges = [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
  ]

  function setup() {
    const navPoints = extractNetworkNavPoints(scene)
    const graph = buildNavGraph(navPoints)
    const neighborIdx = { current: -1 }
    return { graph, neighborIdx }
  }

  it("ArrowRight cycles through neighbors of current node", () => {
    const { graph, neighborIdx } = setup()
    // Start at B (which has neighbors A and C)
    const bIdx = graph.flat.findIndex(p => p.datum.id === "B")
    const pos = resolvePosition(graph, bIdx)

    // First ArrowRight → one of B's neighbors
    const next1 = nextNetworkIndex("ArrowRight", pos, graph, edges, neighborIdx)!
    const datum1 = graph.flat[next1].datum.id
    expect(["A", "C"]).toContain(datum1)

    // Update position and press again
    const pos2 = resolvePosition(graph, bIdx) // still at B for neighbor cycling
    const next2 = nextNetworkIndex("ArrowRight", pos2, graph, edges, neighborIdx)!
    const datum2 = graph.flat[next2].datum.id
    expect(["A", "C"]).toContain(datum2)
    // Should have cycled to the other neighbor
    expect(datum2).not.toBe(datum1)
  })

  it("Enter follows the currently highlighted neighbor", () => {
    const { graph, neighborIdx } = setup()
    const bIdx = graph.flat.findIndex(p => p.datum.id === "B")
    const pos = resolvePosition(graph, bIdx)

    // First ArrowRight to highlight a neighbor
    nextNetworkIndex("ArrowRight", pos, graph, edges, neighborIdx)

    // Enter follows that neighbor
    const enterIdx = nextNetworkIndex("Enter", pos, graph, edges, neighborIdx)!
    expect(enterIdx).not.toBe(bIdx)
    expect(["A", "C"]).toContain(graph.flat[enterIdx].datum.id)
  })

  it("stays put when node has no neighbors", () => {
    const isolated = [
      { type: "circle", cx: 0, cy: 0, r: 5, datum: { id: "X" } }
    ]
    const navPoints = extractNetworkNavPoints(isolated)
    const graph = buildNavGraph(navPoints)
    const neighborIdx = { current: -1 }
    const pos = resolvePosition(graph, 0)
    const next = nextNetworkIndex("ArrowRight", pos, graph, [], neighborIdx)!
    expect(next).toBe(0)
  })

  it("Escape clears focus", () => {
    const { graph, neighborIdx } = setup()
    const pos = resolvePosition(graph, 0)
    expect(nextNetworkIndex("Escape", pos, graph, edges, neighborIdx)).toBe(-1)
  })

  it("PageDown/PageUp use flat navigation", () => {
    const { graph, neighborIdx } = setup()
    const pos = resolvePosition(graph, 0)
    const next = nextNetworkIndex("PageDown", pos, graph, edges, neighborIdx)!
    expect(next).toBeGreaterThanOrEqual(0)
  })
})
