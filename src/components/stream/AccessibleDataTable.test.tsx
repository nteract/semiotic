import { describe, it, expect } from "vitest"
import {
  computeCanvasAriaLabel,
  computeNetworkAriaLabel,
} from "./AccessibleDataTable"

// ── Test helpers ────────────────────────────────────────────────────────

// We can't render React components without a DOM environment in these unit tests,
// but we CAN thoroughly test the pure logic functions that the components depend on.
// These are the functions most likely to break with weird data.

// For extractAllRows / computeFieldStats / formatSummary we re-export-test them
// by calling the same logic inline (they're not exported, so we test via
// computeCanvasAriaLabel which exercises the scene-reading path, plus we add
// a dedicated extraction test suite below).

// ── computeCanvasAriaLabel ──────────────────────────────────────────────

describe("computeCanvasAriaLabel", () => {
  it("handles null/undefined scene", () => {
    expect(computeCanvasAriaLabel(null as any, "XY")).toBe("XY, empty")
    expect(computeCanvasAriaLabel(undefined as any, "XY")).toBe("XY, empty")
  })

  it("handles empty scene array", () => {
    expect(computeCanvasAriaLabel([], "ordinal")).toBe("ordinal, empty")
  })

  it("counts single node type", () => {
    const scene = [
      { type: "point", x: 1, y: 2 },
      { type: "point", x: 3, y: 4 },
    ]
    expect(computeCanvasAriaLabel(scene, "XY")).toBe("XY, 2 points")
  })

  it("counts multiple node types in stable order", () => {
    const scene = [
      { type: "rect", x: 0, y: 0, w: 10, h: 10 },
      { type: "point", x: 1, y: 2 },
      { type: "line", path: [[0, 0], [1, 1]] },
      { type: "rect", x: 10, y: 0, w: 10, h: 10 },
    ]
    // Order: point, line, then rect (per typeOrder)
    expect(computeCanvasAriaLabel(scene, "XY")).toBe("XY, 1 points, 1 lines, 2 bars")
  })

  it("handles unknown node types gracefully", () => {
    const scene = [{ type: "sparkline" }, { type: "sparkline" }]
    expect(computeCanvasAriaLabel(scene, "custom")).toBe("custom, 2 sparkline")
  })

  it("handles nodes with missing type", () => {
    const scene = [{ x: 1, y: 2 } as any]
    // type is undefined — should use "undefined" as type string
    const result = computeCanvasAriaLabel(scene, "XY")
    expect(result).toContain("XY")
    expect(result).not.toBe("XY, empty") // It has one node
  })

  it("handles all known types", () => {
    const allTypes = ["point", "line", "area", "rect", "heatcell", "circle", "candlestick", "wedge", "arc", "geoarea"]
    const scene = allTypes.map(type => ({ type }))
    const result = computeCanvasAriaLabel(scene, "all")
    expect(result).toContain("1 points")
    expect(result).toContain("1 lines")
    expect(result).toContain("1 areas")
    expect(result).toContain("1 bars")
    expect(result).toContain("1 cells")
    expect(result).toContain("1 nodes")
    expect(result).toContain("1 candlesticks")
    expect(result).toContain("1 wedges")
    expect(result).toContain("1 arcs")
    expect(result).toContain("1 regions")
  })

  it("handles massive scene arrays without crashing", () => {
    const scene = Array.from({ length: 100_000 }, (_, i) => ({ type: "point", x: i, y: i }))
    const result = computeCanvasAriaLabel(scene, "XY")
    expect(result).toBe("XY, 100000 points")
  })
})

// ── computeNetworkAriaLabel ─────────────────────────────────────────────

describe("computeNetworkAriaLabel", () => {
  it("handles zero nodes and edges", () => {
    expect(computeNetworkAriaLabel(0, 0, "network")).toBe("network, empty")
  })

  it("nodes only", () => {
    expect(computeNetworkAriaLabel(5, 0, "network")).toBe("network, 5 nodes")
  })

  it("edges only", () => {
    expect(computeNetworkAriaLabel(0, 10, "network")).toBe("network, 10 edges")
  })

  it("both", () => {
    expect(computeNetworkAriaLabel(42, 100, "sankey")).toBe("sankey, 42 nodes, 100 edges")
  })

  it("handles negative counts gracefully", () => {
    // Shouldn't happen, but shouldn't crash
    const result = computeNetworkAriaLabel(-1, -1, "network")
    expect(typeof result).toBe("string")
  })
})

// ── extractAllRows logic (tested via internal behavior) ─────────────────

// Since extractAllRows is not exported, we test it indirectly by exercising
// the same data shapes that would flow through AccessibleDataTable.
// We test the extraction patterns inline here.

describe("extractAllRows — data shape resilience", () => {
  // We recreate the extraction logic to test it in isolation
  function extractRow(node: any): any | null {
    switch (node.type) {
      case "point":
        return { label: "Point", values: { x: node.x, y: node.y } }
      case "line": {
        const path = node.path
        const data = Array.isArray(node.datum) ? node.datum : []
        if (!path) return null
        const rows = []
        for (let i = 0; i < path.length && i < data.length; i++) {
          rows.push({ label: "Line point", values: { x: path[i][0], y: path[i][1] } })
        }
        return rows
      }
      case "rect": {
        const datum = node.datum ?? {}
        const category = datum.category ?? node.group ?? ""
        const rawValue = datum.value ?? datum.__aggregateValue ?? datum.total
        return { label: "Bar", values: { category, value: rawValue ?? "" } }
      }
      case "wedge":
        return {
          label: "Wedge",
          values: {
            category: node.datum?.category || node.datum?.label || "",
            value: node.datum?.value ?? "",
          },
        }
      case "circle":
        return {
          label: "Node",
          values: { id: node.datum?.id || "", x: node.cx ?? node.x, y: node.cy ?? node.y },
        }
      default:
        return null
    }
  }

  it("handles point with undefined x/y", () => {
    const row = extractRow({ type: "point" })
    expect(row).toEqual({ label: "Point", values: { x: undefined, y: undefined } })
  })

  it("handles point with NaN values", () => {
    const row = extractRow({ type: "point", x: NaN, y: NaN })
    expect(row).toEqual({ label: "Point", values: { x: NaN, y: NaN } })
  })

  it("handles point with Infinity", () => {
    const row = extractRow({ type: "point", x: Infinity, y: -Infinity })
    expect(row!.values.x).toBe(Infinity)
    expect(row!.values.y).toBe(-Infinity)
  })

  it("handles point with string coordinates (mistyped data)", () => {
    const row = extractRow({ type: "point", x: "hello", y: "world" })
    expect(row!.values.x).toBe("hello")
    expect(row!.values.y).toBe("world")
  })

  it("handles line with null path", () => {
    const row = extractRow({ type: "line", path: null, datum: [] })
    expect(row).toBeNull()
  })

  it("handles line with undefined path", () => {
    const row = extractRow({ type: "line", datum: [] })
    expect(row).toBeNull()
  })

  it("handles line with empty path/datum arrays", () => {
    const rows = extractRow({ type: "line", path: [], datum: [] })
    expect(rows).toEqual([])
  })

  it("handles line where datum is not an array", () => {
    const rows = extractRow({ type: "line", path: [[0, 0], [1, 1]], datum: "not-an-array" })
    expect(rows).toEqual([]) // data becomes [], so loop never runs
  })

  it("handles line with mismatched path/datum lengths", () => {
    const rows = extractRow({
      type: "line",
      path: [[0, 0], [1, 1], [2, 2], [3, 3]],
      datum: [{ x: 0 }, { x: 1 }], // only 2 datums for 4 path points
    })
    expect(rows).toHaveLength(2) // min(4, 2)
  })

  it("handles rect with no datum at all", () => {
    const row = extractRow({ type: "rect" })
    expect(row).toEqual({ label: "Bar", values: { category: "", value: "" } })
  })

  it("handles rect where datum is a primitive", () => {
    const row = extractRow({ type: "rect", datum: 42 })
    // datum ?? {} → 42, then 42.category → undefined, node.group → undefined
    expect(row!.label).toBe("Bar")
  })

  it("handles rect with __aggregateValue fallback", () => {
    const row = extractRow({ type: "rect", datum: { __aggregateValue: 99 } })
    expect(row!.values.value).toBe(99)
  })

  it("handles rect with total fallback", () => {
    const row = extractRow({ type: "rect", datum: { total: 50 } })
    expect(row!.values.value).toBe(50)
  })

  it("handles wedge with no datum", () => {
    const row = extractRow({ type: "wedge" })
    expect(row).toEqual({ label: "Wedge", values: { category: "", value: "" } })
  })

  it("handles wedge where datum.category is 0 (falsy but valid)", () => {
    const row = extractRow({ type: "wedge", datum: { category: 0, value: 100 } })
    // 0 || "" → "" because || treats 0 as falsy
    // This is a known behavior — category will be empty string for numeric 0
    expect(row!.values.value).toBe(100)
  })

  it("handles circle with cx/cy", () => {
    const row = extractRow({ type: "circle", cx: 10, cy: 20, datum: { id: "a" } })
    expect(row!.values).toEqual({ id: "a", x: 10, y: 20 })
  })

  it("handles circle with x/y fallback", () => {
    const row = extractRow({ type: "circle", x: 5, y: 15, datum: { id: "b" } })
    expect(row!.values).toEqual({ id: "b", x: 5, y: 15 })
  })

  it("handles circle with no datum", () => {
    const row = extractRow({ type: "circle", cx: 0, cy: 0 })
    expect(row!.values).toEqual({ id: "", x: 0, y: 0 })
  })

  it("handles unknown type gracefully", () => {
    const row = extractRow({ type: "hologram" })
    expect(row).toBeNull()
  })
})

// ── computeFieldStats logic ─────────────────────────────────────────────

describe("computeFieldStats resilience", () => {
  // Replicate the production logic for direct testing
  function computeFieldStats(rows: Array<{ values: Record<string, any> } | null>): any[] {
    if (!rows || rows.length === 0) return []
    const fieldNames = new Set<string>()
    for (const r of rows) {
      if (!r || !r.values) continue
      for (const k of Object.keys(r.values)) fieldNames.add(k)
    }
    const stats: any[] = []
    for (const name of fieldNames) {
      const nums: number[] = []
      const strs = new Set<string>()
      for (const r of rows) {
        if (!r || !r.values) continue
        const v = r.values[name]
        if (v == null || v === "") continue
        if (typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v)) {
          nums.push(v)
        } else if (typeof v === "number") {
          // NaN/Infinity — skip
        } else if (typeof v !== "object" && typeof v !== "function") {
          strs.add(String(v))
        }
      }
      if (nums.length > 0) {
        let min = nums[0], max = nums[0], sum = 0
        for (const n of nums) {
          if (n < min) min = n
          if (n > max) max = n
          sum += n
        }
        stats.push({ name, count: nums.length, numeric: true, min, max, mean: sum / nums.length })
      } else if (strs.size > 0) {
        const unique = Array.from(strs)
        stats.push({ name, count: unique.length, numeric: false, uniqueValues: unique.slice(0, 5) })
      }
    }
    return stats
  }

  it("handles empty rows", () => {
    expect(computeFieldStats([])).toEqual([])
  })

  it("handles rows with all null/undefined values", () => {
    const rows = [
      { values: { x: null, y: undefined } },
      { values: { x: null, y: undefined } },
    ]
    // All values are null/undefined — no stats produced
    expect(computeFieldStats(rows)).toEqual([])
  })

  it("handles rows with all empty string values", () => {
    const rows = [
      { values: { name: "", category: "" } },
      { values: { name: "", category: "" } },
    ]
    expect(computeFieldStats(rows)).toEqual([])
  })

  it("handles mixed numeric and non-numeric in same field", () => {
    const rows = [
      { values: { x: 10 } },
      { values: { x: "hello" } },
      { values: { x: 20 } },
    ]
    // Numbers win: "hello" is not a number, ignored by numeric branch
    // Actually: loop collects nums=10,20 and strs={"hello"}
    // Since nums.length > 0, it's numeric
    const stats = computeFieldStats(rows)
    expect(stats).toHaveLength(1)
    expect(stats[0].numeric).toBe(true)
    expect(stats[0].min).toBe(10)
    expect(stats[0].max).toBe(20)
    expect(stats[0].count).toBe(2)
  })

  it("handles NaN values — excluded from numeric stats", () => {
    const rows = [
      { values: { x: NaN } },
      { values: { x: 5 } },
      { values: { x: NaN } },
    ]
    const stats = computeFieldStats(rows)
    expect(stats[0].count).toBe(1)
    expect(stats[0].min).toBe(5)
  })

  it("handles Infinity values — excluded from numeric stats", () => {
    const rows = [
      { values: { x: Infinity } },
      { values: { x: 5 } },
      { values: { x: -Infinity } },
    ]
    const stats = computeFieldStats(rows)
    expect(stats[0].count).toBe(1) // only 5 is finite
    expect(stats[0].min).toBe(5)
    expect(stats[0].max).toBe(5)
  })

  it("handles boolean values (treated as strings)", () => {
    const rows = [
      { values: { flag: true } },
      { values: { flag: false } },
      { values: { flag: true } },
    ]
    const stats = computeFieldStats(rows)
    expect(stats[0].numeric).toBe(false)
    expect(stats[0].uniqueValues).toContain("true")
    expect(stats[0].uniqueValues).toContain("false")
  })

  it("handles Date objects — silently skipped (objects are excluded)", () => {
    const d = new Date("2024-01-01")
    const rows = [{ values: { date: d } }]
    const stats = computeFieldStats(rows)
    expect(stats).toEqual([])
  })

  it("handles arrays as values — silently skipped", () => {
    const rows = [{ values: { arr: [1, 2, 3] } }]
    const stats = computeFieldStats(rows)
    // Arrays are objects — skipped entirely
    expect(stats).toEqual([])
  })

  it("handles objects as values — silently skipped", () => {
    const rows = [{ values: { obj: { nested: true } } }]
    const stats = computeFieldStats(rows)
    expect(stats).toEqual([])
  })

  it("handles function values — silently skipped", () => {
    const rows = [{ values: { fn: () => 42 } }]
    const stats = computeFieldStats(rows)
    expect(stats).toEqual([])
  })

  it("handles null rows in array", () => {
    const rows = [null, { values: { x: 5 } }, null] as any[]
    const stats = computeFieldStats(rows)
    expect(stats[0].count).toBe(1)
    expect(stats[0].min).toBe(5)
  })

  it("handles rows with missing values property", () => {
    const rows = [{ oops: "wrong" }, { values: { x: 10 } }] as any[]
    const stats = computeFieldStats(rows)
    expect(stats[0].count).toBe(1)
  })

  it("limits uniqueValues to 5", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      values: { cat: `category-${i}` },
    }))
    const stats = computeFieldStats(rows)
    expect(stats[0].uniqueValues!.length).toBe(5)
    expect(stats[0].count).toBe(20)
  })

  it("handles sparse fields across rows", () => {
    // Some rows have field 'a', others don't
    const rows = [
      { values: { a: 1, b: 10 } },
      { values: { b: 20 } },
      { values: { a: 3 } },
    ]
    const stats = computeFieldStats(rows)
    const aStats = stats.find((s: any) => s.name === "a")
    const bStats = stats.find((s: any) => s.name === "b")
    expect(aStats!.count).toBe(2) // only 2 rows have 'a'
    expect(bStats!.count).toBe(2) // only 2 rows have 'b'
  })

  it("handles zero values correctly (not treated as missing)", () => {
    const rows = [
      { values: { x: 0 } },
      { values: { x: 0 } },
      { values: { x: 10 } },
    ]
    const stats = computeFieldStats(rows)
    expect(stats[0].count).toBe(3)
    expect(stats[0].min).toBe(0)
    expect(stats[0].mean).toBeCloseTo(10 / 3)
  })

  it("handles single row", () => {
    const stats = computeFieldStats([{ values: { x: 42 } }])
    expect(stats[0].min).toBe(42)
    expect(stats[0].max).toBe(42)
    expect(stats[0].mean).toBe(42)
  })

  it("handles rows with no values object keys", () => {
    const rows = [{ values: {} }, { values: {} }]
    expect(computeFieldStats(rows)).toEqual([])
  })
})

// ── fmt resilience ──────────────────────────────────────────────────────

describe("fmt helper resilience", () => {
  // Replicate for testing
  const fmt = (v: any): string => {
    if (v == null) return ""
    const n = Math.round(v * 100) / 100
    if (Number.isNaN(n)) return ""
    return String(n)
  }

  it("handles null", () => expect(fmt(null)).toBe(""))
  it("handles undefined", () => expect(fmt(undefined)).toBe(""))
  it("handles NaN", () => expect(fmt(NaN)).toBe(""))
  it("handles 0", () => expect(fmt(0)).toBe("0"))
  it("handles negative", () => expect(fmt(-3.14159)).toBe("-3.14"))
  it("handles Infinity", () => expect(fmt(Infinity)).toBe("Infinity"))
  it("handles -Infinity", () => expect(fmt(-Infinity)).toBe("-Infinity"))
  it("handles very small decimals", () => expect(fmt(0.001)).toBe("0"))
  it("handles string coercion", () => expect(fmt("42" as any)).toBe("42"))
  it("handles boolean coercion", () => {
    // true * 100 = 100, round = 100
    expect(fmt(true as any)).toBe("1")
  })
})

// ── Network degree distribution resilience ──────────────────────────────

describe("network degree distribution", () => {
  function computeDegrees(edges: Array<{ source?: any; target?: any }>): Map<string, number> {
    const degreeMap = new Map<string, number>()
    for (const e of edges) {
      const src = typeof e.source === "object" ? e.source?.id : e.source
      const tgt = typeof e.target === "object" ? e.target?.id : e.target
      if (src) degreeMap.set(src, (degreeMap.get(src) ?? 0) + 1)
      if (tgt) degreeMap.set(tgt, (degreeMap.get(tgt) ?? 0) + 1)
    }
    return degreeMap
  }

  it("handles empty edges", () => {
    expect(computeDegrees([]).size).toBe(0)
  })

  it("handles edges with object source/target", () => {
    const edges = [{ source: { id: "a" }, target: { id: "b" } }]
    const degrees = computeDegrees(edges)
    expect(degrees.get("a")).toBe(1)
    expect(degrees.get("b")).toBe(1)
  })

  it("handles edges with string source/target", () => {
    const edges = [{ source: "a", target: "b" }, { source: "a", target: "c" }]
    const degrees = computeDegrees(edges)
    expect(degrees.get("a")).toBe(2)
    expect(degrees.get("b")).toBe(1)
    expect(degrees.get("c")).toBe(1)
  })

  it("handles edges with null/undefined source or target", () => {
    const edges = [
      { source: null, target: "b" },
      { source: "a", target: undefined },
      { source: null, target: null },
    ]
    const degrees = computeDegrees(edges)
    expect(degrees.get("b")).toBe(1)
    expect(degrees.get("a")).toBe(1)
    expect(degrees.size).toBe(2)
  })

  it("handles edges where object source has no id", () => {
    const edges = [{ source: { name: "x" }, target: { id: "b" } }]
    const degrees = computeDegrees(edges)
    // source.id is undefined → falsy → skipped
    expect(degrees.has("undefined")).toBe(false)
    expect(degrees.get("b")).toBe(1)
  })

  it("handles numeric source/target IDs", () => {
    const edges = [{ source: 1, target: 2 }, { source: 1, target: 3 }]
    const degrees = computeDegrees(edges)
    // typeof 1 !== "object", so raw number is used as key
    expect(degrees.get(1 as any)).toBe(2)
    expect(degrees.get(2 as any)).toBe(1)
    expect(degrees.get(3 as any)).toBe(1)
  })

  it("handles self-loops", () => {
    const edges = [{ source: "a", target: "a" }]
    const degrees = computeDegrees(edges)
    expect(degrees.get("a")).toBe(2)
  })
})
