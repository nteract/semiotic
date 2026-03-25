import {
  extractXYNavPoints,
  extractOrdinalNavPoints,
  extractNetworkNavPoints,
  extractGeoNavPoints,
  nextIndex,
  navPointToHover,
  type NavPoint
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
    expect(result[0]).toEqual({ x: 10, y: 20, datum: { id: 2 }, shape: "circle" })
    expect(result[1]).toEqual({ x: 50, y: 30, datum: { id: 1 }, shape: "circle" })
  })

  it("extracts points from a line scene using path + datum array", () => {
    const scene = [
      {
        type: "line",
        path: [[0, 100], [50, 50], [100, 0]] as [number, number][],
        datum: [{ t: 0 }, { t: 1 }, { t: 2 }]
      }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ x: 0, y: 100, datum: { t: 0 }, shape: "circle" })
    expect(result[1]).toEqual({ x: 50, y: 50, datum: { t: 1 }, shape: "circle" })
    expect(result[2]).toEqual({ x: 100, y: 0, datum: { t: 2 }, shape: "circle" })
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
        topPath: [[10, 80], [50, 40]] as [number, number][],
        bottomPath: [[10, 100], [50, 100]] as [number, number][],
        datum: [{ v: "a" }, { v: "b" }]
      }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ x: 10, y: 80, datum: { v: "a" }, shape: "circle" })
    expect(result[1]).toEqual({ x: 50, y: 40, datum: { v: "b" }, shape: "circle" })
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
    expect(result[0]).toEqual({ x: 40, y: 40, datum: { cat: "A" }, shape: "rect", w: 40, h: 60 })
  })

  it("extracts center of heatcell nodes", () => {
    const scene = [
      { type: "heatcell", x: 0, y: 0, w: 20, h: 20, datum: { val: 5 } }
    ]
    const result = extractXYNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ x: 10, y: 10, datum: { val: 5 }, shape: "rect", w: 20, h: 20 })
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
  it("extracts center of bar (rect) nodes", () => {
    const scene = [
      { type: "rect", x: 0, y: 10, w: 30, h: 80, datum: { cat: "A" } },
      { type: "rect", x: 40, y: 20, w: 30, h: 70, datum: { cat: "B" } }
    ]
    const result = extractOrdinalNavPoints(scene)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ x: 15, y: 50, datum: { cat: "A" }, shape: "rect", w: 30, h: 80 })
    expect(result[1]).toEqual({ x: 55, y: 55, datum: { cat: "B" }, shape: "rect", w: 30, h: 70 })
  })

  it("extracts swarm (point) nodes", () => {
    const scene = [
      { type: "point", x: 25, y: 60, datum: { val: 3 } }
    ]
    const result = extractOrdinalNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ x: 25, y: 60, datum: { val: 3 }, shape: "circle" })
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
    // midAngle = PI/2, r = (0+80)/2 = 40
    // x = 100 + cos(PI/2)*40 ≈ 100, y = 100 + sin(PI/2)*40 = 140
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
    // midAngle = 0, r = (20+40)/2 = 30
    // x = 50 + cos(0)*30 = 80, y = 50 + sin(0)*30 = 50
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
  it("extracts circle nodes (force layout)", () => {
    const scene = [
      { type: "circle", cx: 100, cy: 200, r: 10, datum: { id: "A" } },
      { type: "circle", cx: 50, cy: 150, r: 8, datum: { id: "B" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(2)
    // Sorted by x
    expect(result[0]).toEqual({ x: 50, y: 150, datum: { id: "B" }, shape: "circle" })
    expect(result[1]).toEqual({ x: 100, y: 200, datum: { id: "A" }, shape: "circle" })
  })

  it("extracts rect nodes (sankey layout)", () => {
    const scene = [
      { type: "rect", x: 10, y: 20, w: 20, h: 60, datum: { id: "node1" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ x: 20, y: 50, datum: { id: "node1" }, shape: "rect", w: 20, h: 60 })
  })

  it("extracts arc nodes (chord layout)", () => {
    const scene = [
      { type: "arc", cx: 200, cy: 200, datum: { id: "group1" } }
    ]
    const result = extractNetworkNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ x: 200, y: 200, datum: { id: "group1" }, shape: "circle" })
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
    expect(result[0]).toEqual({ x: 50, y: 150, datum: { name: "city2" }, shape: "circle" })
    expect(result[1]).toEqual({ x: 100, y: 200, datum: { name: "city1" }, shape: "circle" })
  })

  it("extracts geoarea nodes using centroid", () => {
    const scene = [
      { type: "geoarea", centroid: [300, 200], datum: { properties: { name: "France" } } }
    ]
    const result = extractGeoNavPoints(scene)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ x: 300, y: 200, datum: { properties: { name: "France" } }, shape: "circle" })
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
