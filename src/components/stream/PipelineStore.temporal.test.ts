import "../../test-utils/registerBuiltInXYPlugins"
import { describe, expect, it } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import type { Datum } from "../charts/shared/datumTypes"

const dates = ["2024-01-01", "2024-03-01", "2024-06-01"]
const data = dates.map((date, i) => ({ x: date, date, time: date, y: i + 1, value: i + 1 }))
const domain = [Date.UTC(2024, 0, 1), Date.UTC(2024, 5, 1)]
const config = (patch: Partial<PipelineConfig> = {}): PipelineConfig => ({
  chartType: "line", windowSize: 20, windowMode: "sliding",
  arrowOfTime: "right", extentPadding: 0, ...patch
})

function expectTemporalLine(store: PipelineStore) {
  store.computeScene({ width: 600, height: 300 })
  expect(store.xIsDate).toBe(true)
  expect(store.scales!.x.domain().map(Number)).toEqual(domain)
  const line = store.scene.find(node => node.type === "line")
  expect(line?.type).toBe("line")
  if (line?.type === "line") {
    expect(line.path).toHaveLength(3)
    expect(line.path.flat().every(Number.isFinite)).toBe(true)
    expect(line.path.map(point => point[0])).toEqual([
      0, 600 * (Date.UTC(2024, 2, 1) - domain[0]) / (domain[1] - domain[0]), 600
    ])
  }
}

describe("temporal XY accessor lifecycle", () => {
  it("detects the default x accessor and retains parsing across config updates", () => {
    const store = new PipelineStore(config())
    store.ingest({ inserts: data, bounded: true })
    expectTemporalLine(store)
    for (const update of [
      { yAccessor: "value" },
      { xAccessor: (d: Datum) => d.date },
      { xAccessor: (d: Datum) => d.date },
      { xAccessor: "date" },
      { xAccessor: undefined },
      { runtimeMode: "streaming" as const },
      { runtimeMode: "bounded" as const }
    ]) {
      store.updateConfig(update)
      // The frame reuses this data reference and ingest intentionally does no work.
      expect(store.ingest({ inserts: data, bounded: true })).toBe(false)
      expectTemporalLine(store)
    }
  })

  it.each(["bar", "swarm", "waterfall"] as const)(
    "detects date strings from the resolved timeAccessor in bounded %s charts", chartType => {
      const store = new PipelineStore(config({ chartType, timeAccessor: "date", binSize: 86400000 }))
      store.ingest({ inserts: data.map(({ date, value }) => ({ date, value })), bounded: true })
      store.computeScene({ width: 600, height: 300 })
      expect(store.xIsDate).toBe(true)
      expect(store.getExtents()!.x).toEqual(domain)
      expect(store.scene.length).toBeGreaterThan(0)
      for (const node of store.scene) {
        if ("x" in node) expect(Number.isFinite(node.x)).toBe(true)
        if ("y" in node) expect(Number.isFinite(node.y)).toBe(true)
      }
    }
  )

  it.each([false, true])("detects pushed temporal values (Date objects: %s) and resets after clear", objects => {
    const store = new PipelineStore(config({ runtimeMode: "streaming", timeAccessor: "date" }))
    const pushed = data.map(row => ({ ...row, date: objects ? new Date(row.date) : row.date }))
    store.ingest({ inserts: [], bounded: false })
    store.ingest({ inserts: pushed.slice(0, 1), bounded: false })
    store.ingest({ inserts: pushed.slice(1), bounded: false })
    expectTemporalLine(store)
    store.clear()
    expect(store.xIsDate).toBe(false)
    store.ingest({ inserts: [{ date: 1, value: 2 }, { date: 2, value: 3 }], bounded: false })
    store.computeScene({ width: 600, height: 300 })
    expect(store.xIsDate).toBe(false)
    expect(store.scales!.x.domain()).toEqual([1, 2])
    expect(store.scales!.x.ticks()[0]).not.toBeInstanceOf(Date)
  })

  it("resniffs a stable accessor when accessorRevision changes its captured field", () => {
    let field = "y"
    const store = new PipelineStore(config({ xAccessor: d => d[field] }))
    store.ingest({ inserts: data, bounded: true })
    expect(store.xIsDate).toBe(false)
    field = "date"
    store.updateConfig({ accessorRevision: 1 })
    expectTemporalLine(store)
  })

  it.each(["bounded", "streaming"] as const)(
    "uses UTC calendar intervals for detected dates in %s mode, including resize", runtimeMode => {
      const store = new PipelineStore(config({ runtimeMode }))
      store.ingest({ inserts: data, bounded: runtimeMode === "bounded" })
      expectTemporalLine(store)
      for (const width of [600, 800]) {
        store.computeScene({ width, height: 300 })
        const ticks = store.scales!.x.ticks(5) as unknown as Date[]
        expect(ticks.map(tick => tick.toISOString())).toEqual([
          "2024-01-01T00:00:00.000Z", "2024-02-01T00:00:00.000Z",
          "2024-03-01T00:00:00.000Z", "2024-04-01T00:00:00.000Z",
          "2024-05-01T00:00:00.000Z", "2024-06-01T00:00:00.000Z"
        ])
        expect(store.scales!.x.range()).toEqual([0, width])
      }
    }
  )

  it("honors explicit linear axes on date data", () => {
    const store = new PipelineStore(config({ xScaleType: "linear" }))
    store.ingest({ inserts: data, bounded: true })
    expectTemporalLine(store)
    expect(typeof store.scales!.x.ticks()[0]).toBe("number")
  })
})
