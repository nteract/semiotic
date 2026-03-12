import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"

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
        oAccessor: (d: any) => d.label.toUpperCase(),
        rAccessor: (d: any) => d.x * 2
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
})
