import { describe, it, expect } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  AccessibleDataTable,
  NetworkAccessibleDataTable,
  computeCanvasAriaLabel,
  computeNetworkAriaLabel,
  extractAllRows,
} from "./AccessibleDataTable"
import type { Datum } from "../charts/shared/datumTypes"

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
    expect(computeCanvasAriaLabel(null, "XY")).toBe("XY, empty")
    expect(computeCanvasAriaLabel(undefined, "XY")).toBe("XY, empty")
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

  it("skips explicitly non-interactive null-datum nodes", () => {
    const scene = [
      { type: "wedge", datum: null },
      { type: "wedge", datum: { category: "A", value: 10 } },
    ]
    expect(computeCanvasAriaLabel(scene, "gauge")).toBe("gauge, 1 wedges")
  })

  it("reports empty when only non-interactive null-datum nodes are present", () => {
    expect(computeCanvasAriaLabel([{ type: "wedge", datum: null }], "gauge")).toBe("gauge, empty")
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
    const scene = [{ x: 1, y: 2 }]
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

// ── public styling hooks ───────────────────────────────────────────────

describe("AccessibleDataTable styling hooks", () => {
  it("renders stable classes and CSS variable hooks on the visible panel", () => {
    render(
      <AccessibleDataTable
        tableId="semiotic-table-test"
        chartType="line chart"
        scene={[{ type: "point", x: 1, y: 2 }]}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /view data summary/i }))

    const region = screen.getByRole("region", { name: /data summary for line chart/i })
    expect(region).toHaveClass("semiotic-accessible-data-table")
    expect(region).toHaveClass("semiotic-accessible-data-table-visible")
    expect(region.getAttribute("style")).toContain("--semiotic-data-table-bg")
    expect(region.getAttribute("style")).toContain("--semiotic-data-table-z-index")
    expect(screen.getByRole("button", { name: /close data summary/i })).toHaveClass(
      "semiotic-accessible-data-table-close"
    )
    expect(screen.getByRole("table")).toHaveClass("semiotic-accessible-data-table-table")
  })

  it("renders the same public hook plus network marker for network tables", () => {
    render(
      <NetworkAccessibleDataTable
        tableId="semiotic-table-network"
        chartType="Network chart"
        nodes={[{ id: "a" }, { id: "b" }]}
        edges={[{ source: "a", target: "b" }]}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /view data summary/i }))

    const region = screen.getByRole("region", { name: /data summary for network chart/i })
    expect(region).toHaveClass("semiotic-accessible-data-table")
    expect(region).toHaveClass("semiotic-accessible-data-table-visible")
    expect(region).toHaveClass("semiotic-accessible-data-table-network")
  })
})

// ── interaction fixes (issue #971) ──────────────────────────────────────

describe("AccessibleDataTable — focus & pagination", () => {
  const lineScene = (n: number) => [
    {
      type: "line",
      path: Array.from({ length: n }, (_, i) => [i, i]),
      datum: Array.from({ length: n }, (_, i) => ({ month: i + 1, sales: 100 * (i + 1) })),
    },
  ]

  it("does NOT auto-expand when focus bubbles up from the trigger button", () => {
    render(<AccessibleDataTable tableId="t1" chartType="line chart" scene={lineScene(3)} />)
    // Focusing the inner button (target !== region container) must not expand.
    fireEvent.focus(screen.getByRole("button", { name: /view data summary/i }))
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("auto-expands when the region container itself receives focus (skip-link path)", () => {
    render(<AccessibleDataTable tableId="t2" chartType="line chart" scene={lineScene(3)} />)
    const region = screen.getByRole("region", { name: /data summary for line chart/i })
    fireEvent.focus(region) // target === currentTarget
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("pages through rows beyond the initial sample via Show more", () => {
    render(<AccessibleDataTable tableId="t3" chartType="line chart" scene={lineScene(40)} />)
    fireEvent.click(screen.getByRole("button", { name: /view data summary/i }))

    // Initial sample is 5 rows (+1 header row).
    expect(screen.getAllByRole("row")).toHaveLength(5 + 1)
    expect(screen.getByText(/first 5 of 40 data points/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /show .* more rows/i }))
    expect(screen.getAllByRole("row")).toHaveLength(30 + 1) // 5 + 25 page

    fireEvent.click(screen.getByRole("button", { name: /show .* more rows/i }))
    expect(screen.getAllByRole("row")).toHaveLength(40 + 1) // capped at total
    expect(screen.getByText(/all 40 data points/i)).toBeInTheDocument()
    // No further "Show more" once everything is shown.
    expect(screen.queryByRole("button", { name: /show .* more/i })).toBeNull()
  })
})

// ── extractAllRows logic ────────────────────────────────────────────────

describe("extractAllRows — surfaces raw data, not pixels", () => {
  it("emits a scatter point's raw datum fields, not pixel x/y", () => {
    // The scene node carries pixel x/y for rendering; the table must show data.
    const rows = extractAllRows([
      { type: "point", x: 412, y: 88, datum: { month: 1, sales: 4200 } },
    ])
    expect(rows).toEqual([{ label: "Point", values: { month: 1, sales: 4200 } }])
  })

  it("emits each line vertex from the datum array (data, not path pixels)", () => {
    const rows = extractAllRows([
      {
        type: "line",
        path: [[0, 0], [50, 50]], // pixel path — must be ignored
        datum: [{ month: 1, sales: 4200 }, { month: 2, sales: 5100 }],
      },
    ])
    expect(rows).toEqual([
      { label: "Line point", values: { month: 1, sales: 4200 } },
      { label: "Line point", values: { month: 2, sales: 5100 } },
    ])
  })

  it("emits area vertices from the datum array", () => {
    const rows = extractAllRows([
      { type: "area", topPath: [[0, 0]], datum: [{ x: 1, y: 2 }] },
    ])
    expect(rows).toEqual([{ label: "Area point", values: { x: 1, y: 2 } }])
  })

  it("skips redundant point nodes when a series node carries the same data", () => {
    // showPoints=true emits both a line node and per-point nodes; the points
    // are decorative duplicates and must not double-count.
    const rows = extractAllRows([
      { type: "line", path: [[0, 0]], datum: [{ month: 1, sales: 4200 }] },
      { type: "point", x: 412, y: 88, datum: { month: 1, sales: 4200 } },
    ])
    expect(rows).toEqual([{ label: "Line point", values: { month: 1, sales: 4200 } }])
  })

  it("emits a candlestick's raw OHLC datum, not undefined node fields", () => {
    // The node only carries openY/closeY pixels — node.open etc. don't exist.
    const rows = extractAllRows([
      {
        type: "candlestick",
        x: 100, openY: 50, closeY: 20, highY: 10, lowY: 60,
        datum: { date: "2024-01-01", open: 10, high: 15, low: 8, close: 12 },
      },
    ])
    expect(rows[0].values).toEqual({ date: "2024-01-01", open: 10, high: 15, low: 8, close: 12 })
  })

  it("falls back to the rendered cell value when a heatcell datum omits it", () => {
    const rows = extractAllRows([
      { type: "heatcell", x: 5, y: 9, value: 42, datum: { row: "A", col: "B" } },
    ])
    expect(rows[0].values).toEqual({ row: "A", col: "B", value: 42 })
  })

  it("skips synthetic underscore-prefixed keys", () => {
    const rows = extractAllRows([
      { type: "point", x: 1, y: 2, datum: { month: 1, _transitionKey: "k", _decayOpacity: 0.5 } },
    ])
    expect(rows[0].values).toEqual({ month: 1 })
  })

  it("preserves a falsy-but-valid 0 value", () => {
    const rows = extractAllRows([
      { type: "point", x: 1, y: 2, datum: { month: 0, sales: 4200 } },
    ])
    expect(rows[0].values).toEqual({ month: 0, sales: 4200 })
  })
})

describe("extractAllRows — data shape resilience (never throws)", () => {
  it("returns [] for a non-array scene", () => {
    expect(extractAllRows(null as any)).toEqual([])
    expect(extractAllRows("nope" as any)).toEqual([])
  })

  it("skips nodes with null datum", () => {
    expect(extractAllRows([{ type: "point", datum: null }])).toEqual([])
  })

  it("handles a point with no datum (empty values, no throw)", () => {
    const rows = extractAllRows([{ type: "point", x: NaN, y: NaN }])
    expect(rows).toEqual([{ label: "Point", values: {} }])
  })

  it("handles a line whose datum is not an array", () => {
    expect(extractAllRows([{ type: "line", path: [[0, 0]], datum: "not-an-array" }])).toEqual([])
  })

  it("drops non-finite and non-primitive datum fields", () => {
    const rows = extractAllRows([
      { type: "point", x: 1, y: 2, datum: { a: Infinity, b: NaN, c: { nested: 1 }, d: 5 } },
    ])
    expect(rows[0].values).toEqual({ d: 5 })
  })

  it("keeps the rect aggregate-value fallbacks", () => {
    expect(extractAllRows([{ type: "rect", datum: { __aggregateValue: 99 } }])[0].values.value).toBe(99)
    expect(extractAllRows([{ type: "rect", datum: { total: 50 } }])[0].values.value).toBe(50)
  })

  it("preserves a wedge category of 0", () => {
    const rows = extractAllRows([{ type: "wedge", datum: { category: 0, value: 100 } }])
    expect(rows[0].values).toEqual({ category: 0, value: 100 })
  })

  it("skips unknown node types", () => {
    expect(extractAllRows([{ type: "hologram", datum: { a: 1 } }])).toEqual([])
  })
})

// ── computeFieldStats logic ─────────────────────────────────────────────

describe("computeFieldStats resilience", () => {
  // Replicate the production logic for direct testing
  function computeFieldStats(rows: Array<{ values?: Datum } | null>): any[] {
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
    const rows = [null, { values: { x: 5 } }, null]
    const stats = computeFieldStats(rows)
    expect(stats[0].count).toBe(1)
    expect(stats[0].min).toBe(5)
  })

  it("handles rows with missing values property", () => {
    const rows = [{ oops: "wrong" }, { values: { x: 10 } }]
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
  const fmt = (v: number | string | boolean | null | undefined): string => {
    if (v == null) return ""
    const n = Math.round(Number(v) * 100) / 100
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
  it("handles string coercion", () => expect(fmt("42")).toBe("42"))
  it("handles boolean coercion", () => {
    // true * 100 = 100, round = 100
    expect(fmt(true)).toBe("1")
  })
})

// ── Network degree distribution resilience ──────────────────────────────

describe("network degree distribution", () => {
  type NetworkEndpoint = string | number | ({ id?: string | number } & Record<string, unknown>) | null | undefined
  function computeDegrees(edges: Array<{ source?: NetworkEndpoint; target?: NetworkEndpoint }>): Map<string | number, number> {
    const degreeMap = new Map<string | number, number>()
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
    expect(degrees.get(1)).toBe(2)
    expect(degrees.get(2)).toBe(1)
    expect(degrees.get(3)).toBe(1)
  })

  it("handles self-loops", () => {
    const edges = [{ source: "a", target: "a" }]
    const degrees = computeDegrees(edges)
    expect(degrees.get("a")).toBe(2)
  })
})
