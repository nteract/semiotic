import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"
import type { Datum } from "../charts/shared/datumTypes"

function makeConfig(overrides: Partial<OrdinalPipelineConfig> = {}): OrdinalPipelineConfig {
  return {
    chartType: "bar",
    windowSize: 1000,
    windowMode: "sliding",
    extentPadding: 0.05,
    projection: "vertical",
    oAccessor: "category",
    rAccessor: "value",
    ...overrides
  }
}

function makeData(categories: string[], valuesPerCat: number[]) {
  return categories.map((cat, i) => ({ category: cat, value: valuesPerCat[i] }))
}

describe("OrdinalPipelineStore", () => {
  // ── Configuration and initialization ─────────────────────────────────

  describe("configuration and initialization", () => {
    it("initializes with default state", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      expect(store.size).toBe(0)
      expect(store.scene).toEqual([])
      expect(store.scales).toBeNull()
      expect(store.columns).toEqual({})
      expect(store.version).toBe(0)
    })

    it("resolves string accessors", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        oAccessor: "name",
        rAccessor: "count"
      }))
      const getO = store.getOAccessor()
      const getR = store.getRAccessor()
      expect(getO({ name: "Alpha" })).toBe("Alpha")
      expect(getR({ count: 42 })).toBe(42)
    })

    it("resolves function accessors", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        oAccessor: (d: Datum) => d.label.toUpperCase(),
        rAccessor: (d: Datum) => d.x * 2
      }))
      expect(store.getOAccessor()({ label: "hello" })).toBe("HELLO")
      expect(store.getRAccessor()({ x: 5 })).toBe(10)
    })

    it("uses categoryAccessor as alias for oAccessor", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        oAccessor: undefined,
        categoryAccessor: "region"
      }))
      expect(store.getOAccessor()({ region: "West" })).toBe("West")
    })
  })

  // ── Data ingestion ───────────────────────────────────────────────────

  describe("data ingestion", () => {
    it("ingests bounded data", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      const data = makeData(["A", "B", "C"], [10, 20, 30])
      store.ingest({ inserts: data, bounded: true })
      expect(store.size).toBe(3)
      expect(store.getData()).toEqual(data)
    })

    it("ingests streaming data incrementally", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({ inserts: [{ category: "A", value: 10 }], bounded: false })
      expect(store.size).toBe(1)
      store.ingest({ inserts: [{ category: "B", value: 20 }], bounded: false })
      expect(store.size).toBe(2)
    })

    it("bounded ingest clears previous data", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({ inserts: makeData(["A"], [10]), bounded: true })
      expect(store.size).toBe(1)
      store.ingest({ inserts: makeData(["B", "C"], [20, 30]), bounded: true })
      expect(store.size).toBe(2)
      expect(store.getData().map(d => d.category)).toEqual(["B", "C"])
    })

  })

  // ── Category discovery ──────────────────────────────────────────────

  describe("category discovery from data", () => {
    it("discovers categories in insertion order", () => {
      const store = new OrdinalPipelineStore(makeConfig({ runtimeMode: "streaming" }))
      store.ingest({
        inserts: [
          { category: "Gamma", value: 5 },
          { category: "Alpha", value: 10 },
          { category: "Beta", value: 3 }
        ],
        bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      // In streaming mode categories preserve insertion order
      const colNames = Object.keys(store.columns)
      expect(colNames).toEqual(["Gamma", "Alpha", "Beta"])
    })

    it("sorts categories by value descending by default (bounded)", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: [
          { category: "Small", value: 1 },
          { category: "Big", value: 100 },
          { category: "Medium", value: 50 }
        ],
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })
      const colNames = Object.keys(store.columns)
      expect(colNames).toEqual(["Big", "Medium", "Small"])
    })
  })

  // ── Column layout computation ───────────────────────────────────────

  describe("column layout computation", () => {
    it("creates columns for each category", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: makeData(["A", "B", "C"], [10, 20, 30]),
        bounded: true
      })
      store.computeScene({ width: 300, height: 200 })

      expect(Object.keys(store.columns)).toHaveLength(3)
      for (const col of Object.values(store.columns)) {
        expect(col.width).toBeGreaterThan(0)
        expect(col.middle).toBe(col.x + col.width / 2)
        expect(col.pieceData.length).toBeGreaterThan(0)
      }
    })

    it("computes pct and pctStart for radial projection", () => {
      const store = new OrdinalPipelineStore(makeConfig({ projection: "radial", chartType: "pie" }))
      store.ingest({
        inserts: makeData(["A", "B"], [25, 75]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 400 })

      const cols = Object.values(store.columns)
      const totalPct = cols.reduce((s, c) => s + c.pct, 0)
      expect(totalPct).toBeCloseTo(1, 5)
      expect(cols[0].pctStart).toBe(0)
    })
  })

  // ── Scene generation: bar chart ─────────────────────────────────────

  describe("scene generation for bar chart", () => {
    it("generates rect scene nodes for vertical bars", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: makeData(["A", "B"], [10, 20]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })

      expect(store.scene.length).toBeGreaterThan(0)
      for (const node of store.scene) {
        expect(node.type).toBe("rect")
        if (node.type === "rect") {
          expect(node.w).toBeGreaterThan(0)
          expect(node.h).toBeGreaterThan(0)
        }
      }
    })

    it("generates rect scene nodes for horizontal bars", () => {
      const store = new OrdinalPipelineStore(makeConfig({ projection: "horizontal" }))
      store.ingest({
        inserts: makeData(["X", "Y"], [15, 30]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })
      expect(store.scene.length).toBe(2)
      for (const node of store.scene) {
        expect(node.type).toBe("rect")
      }
    })

  })

  // ── Scene generation: pie chart (radial) ────────────────────────────

  describe("scene generation for pie chart (radial)", () => {
    it("generates wedge nodes for pie chart", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "pie",
        projection: "radial"
      }))
      store.ingest({
        inserts: makeData(["A", "B", "C"], [10, 20, 30]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 400 })

      expect(store.scene.length).toBe(3)
      for (const node of store.scene) {
        expect(node.type).toBe("wedge")
        if (node.type === "wedge") {
          expect(node.outerRadius).toBeGreaterThan(0)
          expect(node.innerRadius).toBe(0) // pie, not donut
        }
      }
    })

    it("generates wedge nodes with inner radius for donut chart", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "donut",
        projection: "radial",
        innerRadius: 50
      }))
      store.ingest({
        inserts: makeData(["A", "B"], [40, 60]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 400 })

      for (const node of store.scene) {
        if (node.type === "wedge") {
          expect(node.innerRadius).toBe(50)
        }
      }
    })

    it("wedge angles sum to 2*PI", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "pie",
        projection: "radial"
      }))
      store.ingest({
        inserts: makeData(["A", "B", "C"], [10, 20, 30]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 400 })

      let totalAngle = 0
      for (const node of store.scene) {
        if (node.type === "wedge") {
          totalAngle += node.endAngle - node.startAngle
        }
      }
      expect(totalAngle).toBeCloseTo(Math.PI * 2, 3)
    })
  })

  // ── Stacking behavior ──────────────────────────────────────────────

  describe("stacking behavior", () => {
    it("stacks bars within the same category by stackBy key", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        stackBy: "group"
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 10, group: "g1" },
          { category: "A", value: 20, group: "g2" },
          { category: "B", value: 15, group: "g1" },
          { category: "B", value: 25, group: "g2" }
        ],
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })

      // Should produce 4 rects: 2 categories * 2 stack groups
      const rects = store.scene.filter(n => n.type === "rect")
      expect(rects.length).toBe(4)
    })
  })

  // ── Push-API FIFO category ordering ────────────────────────────────

  describe("push-API FIFO category ordering", () => {
    it("preserves insertion order for push-API data even without explicit runtimeMode", () => {
      // No runtimeMode set — simulates HOC charts using push API
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: [
          { category: "Gamma", value: 5 },
          { category: "Alpha", value: 100 },
          { category: "Beta", value: 50 }
        ],
        bounded: false  // push API sends bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      // Should be FIFO, not sorted by value descending (Alpha, Beta, Gamma)
      const colNames = Object.keys(store.columns)
      expect(colNames).toEqual(["Gamma", "Alpha", "Beta"])
    })

    it("appends new categories at the end during streaming", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: [{ category: "A", value: 10 }],
        bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["A"])

      store.ingest({
        inserts: [{ category: "C", value: 5 }, { category: "B", value: 20 }],
        bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      // B has higher value but should appear after C (FIFO)
      expect(Object.keys(store.columns)).toEqual(["A", "C", "B"])
    })

    it("prunes ghost categories after eviction", () => {
      const store = new OrdinalPipelineStore(makeConfig({ windowSize: 2 }))
      store.ingest({
        inserts: [{ category: "A", value: 10 }],
        bounded: false
      })
      store.ingest({
        inserts: [{ category: "B", value: 20 }],
        bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["A", "B"])

      // Push C — evicts A
      store.ingest({
        inserts: [{ category: "C", value: 30 }],
        bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      // A should be pruned since its data was evicted
      expect(Object.keys(store.columns)).toEqual(["B", "C"])
    })

    it("does not use FIFO for bounded-only data", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: [
          { category: "Small", value: 1 },
          { category: "Big", value: 100 },
          { category: "Medium", value: 50 }
        ],
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })
      // Should be sorted by value descending (default)
      const colNames = Object.keys(store.columns)
      expect(colNames).toEqual(["Big", "Medium", "Small"])
    })

    it("resets FIFO state on clear", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: [{ category: "A", value: 10 }],
        bounded: false
      })
      store.clear()
      // After clear, bounded data should use default sort again
      store.ingest({
        inserts: [
          { category: "Small", value: 1 },
          { category: "Big", value: 100 }
        ],
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["Big", "Small"])
    })
  })

  // ── preserveCategoryOrder (aggregator-HOC path) ─────────────────────

  describe("bounded ingest with preserveCategoryOrder", () => {
    // Regression: aggregator HOCs (LikertChart, future density/bin charts)
    // re-derive their full dataset from streaming input on every push.
    // They route through bounded ingest for atomic replacement, but the
    // user perceives a live stream and expects categories to stay in
    // place. Without `preserveCategoryOrder`, each replacement clears
    // the category memory and re-sorts — producing visible shuffling.

    it("preserves category insertion order across multiple replacements", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: [
          { category: "Q1", value: 10 },
          { category: "Q2", value: 20 },
          { category: "Q3", value: 15 },
        ],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["Q1", "Q2", "Q3"])

      // Replacement: Q2 now has the largest value. With ordinary bounded
      // ingest this would re-sort to ["Q2", "Q3", "Q1"] (value-desc), but
      // the preserve flag should keep FIFO order.
      store.ingest({
        inserts: [
          { category: "Q1", value: 5 },
          { category: "Q2", value: 99 },
          { category: "Q3", value: 40 },
        ],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["Q1", "Q2", "Q3"])
    })

    it("appends newly-arriving categories at the end without shuffling existing ones", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({
        inserts: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["A", "B"])

      // New category C arrives with a larger value than A/B — should
      // still appear last (insertion order), not first (value-desc).
      store.ingest({
        inserts: [
          { category: "A", value: 10 },
          { category: "B", value: 20 },
          { category: "C", value: 999 },
        ],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["A", "B", "C"])
    })

    it("flips the store into streaming mode so sort='auto' preserves order", () => {
      // `sort: "auto"` means "insertion-order-when-streaming, value-desc-when-
      // static". preserveCategoryOrder ingest should flip the streaming flag
      // so auto → preserve.
      const store = new OrdinalPipelineStore(makeConfig({ oSort: "auto" }))
      store.ingest({
        inserts: [
          { category: "Small", value: 1 },
          { category: "Big", value: 100 },
          { category: "Medium", value: 50 },
        ],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      // Insertion order, not value-desc
      expect(Object.keys(store.columns)).toEqual(["Small", "Big", "Medium"])
    })

    it("drops stale categories from the axis after a replace that removes them (even with explicit sort)", () => {
      // Regression: the preserve-order mechanism retains ghost categories in
      // `this.categories` for FIFO stability across re-appearances, but
      // every resolveCategories branch must filter against the live data
      // set. Without this, `oSort: "desc"` or a comparator would render
      // empty ticks for categories whose data was dropped by a replace().
      const store = new OrdinalPipelineStore(makeConfig({ oSort: "desc" }))
      store.ingest({
        inserts: [
          { category: "A", value: 10 },
          { category: "B", value: 20 },
          { category: "C", value: 30 },
        ],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns).sort()).toEqual(["A", "B", "C"])

      // B gets dropped by the replacement.
      store.ingest({
        inserts: [
          { category: "A", value: 5 },
          { category: "C", value: 40 },
        ],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns).sort()).toEqual(["A", "C"])
    })

    it("drops stale categories even when sort is false (insertion-order)", () => {
      const store = new OrdinalPipelineStore(makeConfig({ oSort: false }))
      store.ingest({
        inserts: [{ category: "A", value: 1 }, { category: "B", value: 2 }],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["A", "B"])

      store.ingest({
        inserts: [{ category: "B", value: 99 }],
        bounded: true,
        preserveCategoryOrder: true,
      })
      store.computeScene({ width: 400, height: 300 })
      // A is evicted from the current dataset; the axis should not render
      // a ghost column for it even though A stays in the category Set.
      expect(Object.keys(store.columns)).toEqual(["B"])
    })
  })

  // ── sort: "auto" ────────────────────────────────────────────────────

  describe("sort='auto' mode", () => {
    it("preserves insertion order for streaming push data", () => {
      const store = new OrdinalPipelineStore(makeConfig({ oSort: "auto" }))
      store.ingest({
        inserts: [
          { category: "Gamma", value: 5 },
          { category: "Alpha", value: 100 },
          { category: "Beta", value: 50 },
        ],
        bounded: false,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["Gamma", "Alpha", "Beta"])
    })

    it("falls through to value-descending for static bounded data", () => {
      const store = new OrdinalPipelineStore(makeConfig({ oSort: "auto" }))
      store.ingest({
        inserts: [
          { category: "Small", value: 1 },
          { category: "Big", value: 100 },
          { category: "Medium", value: 50 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 300 })
      expect(Object.keys(store.columns)).toEqual(["Big", "Medium", "Small"])
    })
  })

  // ── Window/eviction behavior ────────────────────────────────────────

  describe("window/eviction behavior", () => {
    it("evicts old data when window is exceeded (streaming)", () => {
      const store = new OrdinalPipelineStore(makeConfig({ windowSize: 3 }))
      store.ingest({ inserts: [{ category: "A", value: 1 }], bounded: false })
      store.ingest({ inserts: [{ category: "B", value: 2 }], bounded: false })
      store.ingest({ inserts: [{ category: "C", value: 3 }], bounded: false })
      expect(store.size).toBe(3)

      store.ingest({ inserts: [{ category: "D", value: 4 }], bounded: false })
      expect(store.size).toBe(3)
      // First item should have been evicted
      const data = store.getData()
      expect(data.map(d => d.category)).toEqual(["B", "C", "D"])
    })

    it("resizes buffer for large bounded datasets", () => {
      const store = new OrdinalPipelineStore(makeConfig({ windowSize: 5 }))
      const data = Array.from({ length: 20 }, (_, i) => ({ category: `C${i}`, value: i }))
      store.ingest({ inserts: data, bounded: true, totalSize: 20 })
      expect(store.size).toBe(20)
    })
  })

  // ── Pulse application ──────────────────────────────────────────────

  describe("pulse application", () => {
    it("applies pulse to point scene nodes on recent inserts", () => {
      // Bar rects use aggregate datums that don't reference original data objects,
      // so pulse doesn't apply to them. Use point chart type where datum identity is preserved.
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "point",
        pulse: { duration: 500 }
      }))
      store.ingest({
        inserts: makeData(["A", "B"], [10, 20]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })

      // Since data was just inserted, point nodes should have pulse intensity
      const pulsed = store.scene.filter((n: any) => n._pulseIntensity && n._pulseIntensity > 0)
      expect(pulsed.length).toBeGreaterThan(0)
    })

    it("hasActivePulses returns true right after ingest", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        pulse: { duration: 1000 }
      }))
      store.ingest({
        inserts: makeData(["A"], [10]),
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })
      expect(store.hasActivePulses).toBe(true)
    })
  })

  // ── Empty data handling ────────────────────────────────────────────

  describe("empty data handling", () => {
    it("handles clear operation", () => {
      const store = new OrdinalPipelineStore(makeConfig())
      store.ingest({ inserts: makeData(["A"], [10]), bounded: true })
      store.computeScene({ width: 400, height: 300 })
      expect(store.size).toBe(1)

      store.clear()
      expect(store.size).toBe(0)
      expect(store.scene).toEqual([])
      expect(store.scales).toBeNull()
      expect(store.columns).toEqual({})
      expect(store.lastIngestTime).toBe(0)
    })
  })

  // ── rExtent with zero ─────────────────────────────────────────────────

  describe("rExtent with explicit zero", () => {
    it("respects rExtent: [0, N] without adding padding to the zero end", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        rExtent: [0, 9],
        extentPadding: 0.05
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 3 },
          { category: "B", value: 5 },
          { category: "C", value: 9 }
        ],
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })

      // rScale should map exactly [0, 9] → [300, 0] for vertical projection
      const scales = store.scales!
      expect(scales.r(0)).toBe(300)   // bottom of chart
      expect(scales.r(9)).toBe(0)     // top of chart
    })

    it("respects rExtent: [0, undefined] — pads only the max end", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        rExtent: [0, undefined],
        extentPadding: 0.05
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 3 },
          { category: "B", value: 5 }
        ],
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })

      const scales = store.scales!
      // Min should be exactly 0 (user-specified)
      expect(scales.r(0)).toBe(300)
      // Max should be padded beyond 5
      expect(scales.r(5)).toBeGreaterThan(0)
    })

    it("produces uniform bar heights when each piece has value=1", () => {
      // Simulate isotype chart: 3 persons stacked in one column, each value=1
      const store = new OrdinalPipelineStore(makeConfig({
        rExtent: [0, 3],
        stackBy: "personId",
        extentPadding: 0.05
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 1, personId: "p0" },
          { category: "A", value: 1, personId: "p1" },
          { category: "A", value: 1, personId: "p2" }
        ],
        bounded: true
      })
      store.computeScene({ width: 400, height: 300 })

      const scales = store.scales!
      // Each unit should occupy exactly 100px (300 / 3)
      const unitHeight = scales.r(0) - scales.r(1)
      expect(unitHeight).toBeCloseTo(100, 5)

      // All units should be the same height
      const unit2 = scales.r(1) - scales.r(2)
      const unit3 = scales.r(2) - scales.r(3)
      expect(unit2).toBeCloseTo(100, 5)
      expect(unit3).toBeCloseTo(100, 5)

      // Bar scene nodes should align with these positions
      const scene = store.scene
      expect(scene.length).toBe(3)
      for (const node of scene) {
        if (node.type === "rect") {
          // All rects should have equal height of 100px
          expect(node.h).toBeCloseTo(100, 1)
        }
      }
    })
  })

  // ── axisExtent="exact" skips extent padding ───────────────────────────

  describe('axisExtent="exact"', () => {
    it("pins r-domain to literal data min/max for swarm charts (no extentPadding)", () => {
      // Without exact mode, the swarm r-domain would be padded by 5%
      // (extentPadding default), so the first/last ticks land outside
      // [dataMin, dataMax]. Exact mode collapses the padding so the
      // ticks read as the actual data bounds.
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "swarm",
        axisExtent: "exact",
        extentPadding: 0.05,
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 4.2 },
          { category: "A", value: 30 },
          { category: "B", value: 98.7 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 300 })
      // Vertical projection: scales.r maps domain → [height, 0].
      // r(min) === 300 and r(max) === 0 only when the domain endpoints
      // ARE the data min/max — i.e., extent padding was skipped.
      expect(store.scales!.r(4.2)).toBeCloseTo(300, 5)
      expect(store.scales!.r(98.7)).toBeCloseTo(0, 5)
    })

    it("nice mode (default) still pads the r-domain", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "swarm",
        extentPadding: 0.05,
        // axisExtent omitted → defaults to nice
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 4.2 },
          { category: "B", value: 98.7 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 300 })
      // Padded: r(dataMin) is somewhere inside [0, 300], not at 300.
      expect(store.scales!.r(4.2)).toBeLessThan(300)
      expect(store.scales!.r(98.7)).toBeGreaterThan(0)
    })

    it("explicit rExtent still wins over exact mode (user override)", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "swarm",
        axisExtent: "exact",
        rExtent: [0, 100],
      }))
      store.ingest({
        inserts: [{ category: "A", value: 50 }],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 300 })
      // User pinned to [0, 100]; exact mode doesn't undo that.
      expect(store.scales!.r(0)).toBe(300)
      expect(store.scales!.r(100)).toBe(0)
    })
  })

  // ── Histogram shared bins with rExtent ────────────────────────────────

  describe("histogram shared bins via rExtent", () => {
    it("two categories with disjoint data ranges produce bins on the same global grid", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "histogram",
        bins: 10,
        rExtent: [0, 100],
        projection: "horizontal",
        extentPadding: 0
      }))

      store.ingest({
        inserts: [
          // Category A: values in [5, 45]
          { category: "A", value: 5 },
          { category: "A", value: 15 },
          { category: "A", value: 25 },
          { category: "A", value: 35 },
          { category: "A", value: 45 },
          // Category B: values in [55, 95]
          { category: "B", value: 55 },
          { category: "B", value: 65 },
          { category: "B", value: 75 },
          { category: "B", value: 85 },
          { category: "B", value: 95 },
        ],
        bounded: true
      })

      store.computeScene({ width: 400, height: 300 })

      // rScale domain should be [0, 100] from the rExtent override
      const scales = store.scales!
      expect(scales.r.domain()[0]).toBe(0)
      expect(scales.r.domain()[1]).toBe(100)

      // Scene should have rect nodes for both categories
      const rects = store.scene.filter(n => n.type === "rect")
      expect(rects.length).toBeGreaterThan(0)

      // All rects should have the same bin width (same grid)
      const widths = rects.map(r => Math.round(r.w * 100) / 100)
      const uniqueWidths = new Set(widths)
      expect(uniqueWidths.size).toBe(1)
    })
  })

  // ── Swimlane domain computation ──────────────────────────────────────

  describe("swimlane value domain", () => {
    it("uses per-lane sums (not individual values) for rScale domain", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "swimlane",
        projection: "horizontal",
      }))
      // Lane A: 3 + 5 = 8, Lane B: 2 + 4 = 6 → max should be 8
      store.ingest({
        inserts: [
          { category: "A", value: 3 },
          { category: "A", value: 5 },
          { category: "B", value: 2 },
          { category: "B", value: 4 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 300 })

      const scales = store.scales!
      // Domain max should be at least 8 (the largest lane sum), not 5 (the largest individual value)
      const domain = scales.r.domain()
      expect(domain[1]).toBeGreaterThanOrEqual(8)
    })

    it("explicit rExtent suppresses forced zero inclusion for swimlane", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "swimlane",
        projection: "horizontal",
        rExtent: [5, 20],
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 10 },
          { category: "B", value: 8 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 300 })

      const scales = store.scales!
      const domain = scales.r.domain()
      // Domain min should be 5 (from rExtent), NOT forced to 0
      expect(domain[0]).toBe(5)
      expect(domain[1]).toBe(20)
    })

    it("includes zero when no rExtent is set on swimlane", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "swimlane",
        projection: "horizontal",
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 10 },
          { category: "B", value: 8 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 300 })

      const scales = store.scales!
      const domain = scales.r.domain()
      // Zero-inclusion should still apply when no explicit rExtent
      expect(domain[0]).toBeLessThanOrEqual(0)
    })
  })

  // ── Degenerate layout regression ───────────────────────────────────
  //
  // A horizontal swimlane with `showCategoryTicks: false` shrinks the
  // left margin, which on short heights produces a content area smaller
  // than `barPadding * 2`. The raw padding ratio (barPadding / height)
  // lands ≥ 1, and a d3-scale-band with padding(1) has zero bandwidth
  // — rects paint as invisible 0-width strips and the canvas stays blank.
  //
  // Pipeline clamps the padding ratio to ≤ 0.9 so at least 10% of each
  // band is bandwidth. The concrete symptom this guards against was a
  // Playwright integration test that saw 0 non-transparent pixels on
  // the swimlane-no-ticks example (`integration-tests/ordinal-frame.spec.ts`).
  describe("scaleBand padding clamp (crushed-height swimlane)", () => {
    it("produces non-zero bandwidth even when barPadding exceeds content area", () => {
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "swimlane",
        projection: "horizontal",
        barPadding: 40,
      }))
      store.ingest({
        inserts: [
          { category: "A", value: 3 },
          { category: "B", value: 2 },
          { category: "C", value: 6 },
        ],
        bounded: true,
      })
      // Content area 275 × 40 — same shape as the failing ord-swimlane-no-ticks
      // example. barPadding (40) equals the content height → raw ratio 1.0.
      store.computeScene({ width: 275, height: 40 })

      const bandwidth = store.scales!.o.bandwidth()
      expect(bandwidth).toBeGreaterThan(0)
      // Every column should have painted with that bandwidth.
      for (const col of Object.values(store.columns)) {
        expect(col.width).toBeGreaterThan(0)
      }
    })

    it("does not break normal layouts where barPadding is well under content size", () => {
      // Sanity check the happy path still behaves the same.
      const store = new OrdinalPipelineStore(makeConfig({
        chartType: "bar",
        projection: "vertical",
        barPadding: 40,
      }))
      store.ingest({
        inserts: makeData(["A", "B", "C"], [10, 20, 30]),
        bounded: true,
      })
      store.computeScene({ width: 600, height: 400 })

      // With width 600 and barPadding 40, raw ratio is 40/600 ≈ 0.067 —
      // nowhere near the clamp, so behavior is unchanged.
      const bandwidth = store.scales!.o.bandwidth()
      expect(bandwidth).toBeGreaterThan(100) // three bands across ~560 usable px
    })
  })
})
