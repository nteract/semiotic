import "../../test-utils/registerBuiltInXYPlugins"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineStore } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { DataSourceAdapter } from "./DataSourceAdapter"
import type { Datum } from "../charts/shared/datumTypes"

const rows = (n: number) =>
  Array.from({ length: n }, (_, x) => ({
    id: String(x),
    x,
    y: x,
    category: String(x),
    value: x
  }))
const options = {
  windowSize: 10,
  windowMode: "sliding" as const,
  extentPadding: 0,
  pulse: { duration: 100 }
}
const families = {
  xy: (overrides = {}) =>
    new PipelineStore({
      ...options,
      chartType: "scatter",
      arrowOfTime: "right",
      ...overrides
    }),
  ordinal: (overrides = {}) =>
    new OrdinalPipelineStore({
      ...options,
      chartType: "point",
      projection: "vertical",
      ...overrides
    })
}

afterEach(() => vi.unstubAllGlobals())

for (const [family, create] of Object.entries(families))
  describe(`${family} streaming retention`, () => {
    it("preserves history when a growing stream begins", () => {
      const store = create({ windowMode: "growing" })
      store.ingest({ inserts: rows(100), bounded: true })
      store.ingest({ inserts: [{ ...rows(1)[0], x: 100 }], bounded: false })
      expect(store.getData()).toHaveLength(101)
      expect(store.getData()[0].x).toBe(0)
    })

    it("applies sliding retention on the first live append, not the snapshot", () => {
      const store = create()
      store.ingest({ inserts: rows(100), bounded: true })
      expect(store.getData()).toHaveLength(100)
      store.ingest({ inserts: [{ ...rows(1)[0], x: 100 }], bounded: false })
      expect(store.getData().map((d) => d.x)).toEqual(
        Array.from({ length: 10 }, (_, i) => i + 91)
      )
    })

    it("grows to the cap, then slides; lowering the cap retains newest rows", () => {
      const store = create({
        windowSize: 2,
        windowMode: "growing",
        maxCapacity: 5
      })
      store.ingest({ inserts: rows(8), bounded: false })
      expect(store.getData().map((d) => d.x)).toEqual([3, 4, 5, 6, 7])
      store.updateConfig({ maxCapacity: 3 })
      expect(store.getData().map((d) => d.x)).toEqual([5, 6, 7])
    })

    it("resizes live windows without resurrecting evicted rows or mutating bounded data", () => {
      const store = create()
      store.ingest({ inserts: rows(10), bounded: false })
      store.updateConfig({ windowSize: 3 })
      expect(store.getData().map((d) => d.x)).toEqual([7, 8, 9])
      store.updateConfig({ windowSize: 20 })
      expect(store.getData().map((d) => d.x)).toEqual([7, 8, 9])
      store.ingest({ inserts: rows(100), bounded: true })
      store.updateConfig({ windowSize: 5 })
      expect(store.getData()).toHaveLength(100)
      store.ingest({ inserts: [rows(1)[0]], bounded: false })
      expect(store.getData()).toHaveLength(5)
    })

    it("keeps FIFO extents ordered after repairing an invalid older row", () => {
      const store = create({ windowSize: 3, pointIdAccessor: "id", dataIdAccessor: "id" })
      store.ingest({ inserts: [
        { id: "a", category: "A", x: NaN, y: NaN, value: NaN },
        { id: "b", category: "B", x: 2, y: 2, value: 2 },
        { id: "c", category: "C", x: 3, y: 3, value: 3 }
      ], bounded: false })
      store.update("a", (d) => ({ ...d, x: 1, y: 1, value: 1 }))
      store.computeScene({ width: 400, height: 300 })
      store.ingest({ inserts: [{ id: "d", category: "D", x: 4, y: 4, value: 4 }], bounded: false })
      store.computeScene({ width: 400, height: 300 })
      if (store instanceof PipelineStore) {
        expect(store.getExtents()).toEqual({ x: [2, 4], y: [2, 4] })
      } else {
        expect(store.scales!.r.domain()).toEqual([2, 4])
      }
    })

    it("returns independent arrays retaining original datum identity", () => {
      const store = create()
      const data = rows(3)
      store.ingest({ inserts: data, bounded: true })
      store.getData().splice(0, 2)
      expect(store.getData()).toEqual(data)
      expect(store.getData()[0]).toBe(data[0])
    })

    it.each([0, -1, 1.5, NaN, Infinity])(
      "rejects invalid live capacity %s before changing configuration",
      (value) => {
        const store = create()
        expect(() => store.updateConfig({ windowSize: value })).toThrow(
          /positive/
        )
        expect(() => store.updateConfig({ maxCapacity: value })).toThrow(
          /positive/
        )
        store.ingest({ inserts: rows(15), bounded: false })
        expect(store.getData()).toHaveLength(10)
      }
    )

    it("finishes progressive history before applying live retention", async () => {
      const pending = new Map<number, FrameRequestCallback>()
      let id = 0
      vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
        pending.set(++id, fn)
        return id
      })
      vi.stubGlobal("cancelAnimationFrame", (key: number) =>
        pending.delete(key)
      )
      const store = create({ windowSize: 3 })
      const adapter = new DataSourceAdapter<Datum>((cs) => store.ingest(cs), {
        chunkThreshold: 3,
        chunkSize: 2
      })
      adapter.setBoundedData(rows(10))
      expect(store.getData()).toHaveLength(2)
      adapter.push({ ...rows(1)[0], x: 10 })
      await Promise.resolve()
      expect(store.getData().map((d) => d.x)).toEqual([8, 9, 10])
      expect(pending.size).toBe(0)
    })

    it("keeps every progressive bounded row even when the snapshot exceeds the live cap", () => {
      vi.stubGlobal("requestAnimationFrame", () => 1)
      vi.stubGlobal("cancelAnimationFrame", vi.fn())
      const store = create({
        windowSize: 2,
        maxCapacity: 3,
        windowMode: "growing"
      })
      const adapter = new DataSourceAdapter<Datum>((cs) => store.ingest(cs), {
        chunkThreshold: 2,
        chunkSize: 2
      })
      adapter.setBoundedData(rows(10))
      adapter.flush()
      expect(store.getData()).toEqual(rows(10))
    })
  })

describe("atomic data replacement", () => {
  it.each(["setBoundedData", "setReplacementData"] as const)(
    "%s discards stale pushes but accepts subsequent pushes",
    async (method) => {
      const received: string[] = []
      const adapter = new DataSourceAdapter<{ id: string }>((cs) =>
        received.push(...cs.inserts.map((d) => d.id))
      )
      adapter.push({ id: "stale" })
      adapter[method]([{ id: "new" }])
      adapter.push({ id: "live" })
      await Promise.resolve()
      expect(received).toEqual(["new", "live"])
    }
  )

  it("does not schedule chunks after a reentrant clear", () => {
    const request = vi.fn()
    vi.stubGlobal("requestAnimationFrame", request)
    const adapter = new DataSourceAdapter(() => adapter.clear(), {
      chunkThreshold: 1,
      chunkSize: 1
    })
    adapter.setBoundedData(rows(4))
    expect(request).not.toHaveBeenCalled()
  })
})

describe("streaming derived state", () => {
  it("keeps pulse timestamps paired with the newest retained rows after resize", () => {
    let now = 100
    for (const create of Object.values(families)) {
      const store = create({ windowSize: 4, clock: () => now })
      for (const row of rows(4)) {
        now += 100
        store.ingest({ inserts: [row], bounded: false })
      }
      const before = now
      store.updateConfig({ windowSize: 2 })
      const timestamps = (
        store as unknown as { timestampBuffer: { toArray(): number[] } }
      ).timestampBuffer.toArray()
      expect(timestamps).toEqual([before - 100, before])
      store.computeScene({ width: 400, height: 300 })
      expect(store.getData().map((d) => d.x)).toEqual([2, 3])
    }
  })

  it("does not rescan monotonic sliding data to resolve its extents", () => {
    const x = vi.fn((d: Datum) => d.x)
    const y = vi.fn((d: Datum) => d.y)
    const store = families.xy({ windowSize: 1000, xAccessor: x, yAccessor: y })
    store.ingest({ inserts: rows(1000), bounded: false })
    x.mockClear()
    y.mockClear()
    store.ingest({ inserts: [{ x: 1000, y: 1000 }], bounded: false })
    expect(store.getExtents()).toEqual({ x: [1, 1000], y: [1, 1000] })
    expect(x.mock.calls.length).toBeLessThan(5)
    expect(y.mock.calls.length).toBeLessThan(5)
  })

  it("clears all ordinal value axes before reloading", () => {
    const store = families.ordinal({
      valueAccessor: ["value", "other"],
      multiAxis: true
    })
    store.ingest({
      inserts: [{ category: "old", value: 1000, other: 5000 }],
      bounded: false
    })
    store.computeScene({ width: 400, height: 300 })
    store.clear()
    store.ingest({
      inserts: [{ category: "new", value: 5, other: 10 }],
      bounded: false
    })
    store.computeScene({ width: 400, height: 300 })
    expect(store.multiScales).toHaveLength(2)
    expect(
      store.multiScales.every((scale) => Math.max(...scale.domain()) < 100)
    ).toBe(true)
  })

  it("repairs an absent timeline range without losing later FIFO extrema", () => {
    const store = families.ordinal({ windowSize: 3, chartType: "timeline", dataIdAccessor: "id", valueAccessor: "span" })
    store.ingest({ inserts: [
      { id: "a", category: "A", span: null },
      { id: "b", category: "B", span: [2, 2.5] },
      { id: "c", category: "C", span: [3, 3.5] }
    ], bounded: false })
    store.update("a", (d) => ({ ...d, span: [1, 1.5] }))
    store.computeScene({ width: 400, height: 300 })
    store.ingest({ inserts: [{ id: "d", category: "D", span: [4, 4.5] }], bounded: false })
    store.computeScene({ width: 400, height: 300 })
    expect(store.scales!.r.domain()).toEqual([2, 4.5])
  })

  it("repairs an invalid secondary axis without losing later FIFO extrema", () => {
    const store = families.ordinal({ windowSize: 3, dataIdAccessor: "id", valueAccessor: ["value", "other"], multiAxis: true })
    store.ingest({ inserts: [
      { id: "a", category: "A", value: 1, other: NaN },
      { id: "b", category: "B", value: 2, other: 20 },
      { id: "c", category: "C", value: 3, other: 30 }
    ], bounded: false })
    store.update("a", (d) => ({ ...d, other: 10 }))
    store.computeScene({ width: 400, height: 300 })
    store.ingest({ inserts: [{ id: "d", category: "D", value: 4, other: 40 }], bounded: false })
    store.computeScene({ width: 400, height: 300 })
    expect(store.multiScales.map((scale) => scale.domain())).toEqual([[0, 4], [0, 40]])
  })

  it("uses a changed ordinal ID accessor for remove and update", () => {
    const store = families.ordinal({ dataIdAccessor: "id" })
    store.ingest({
      inserts: [{ id: "old", nextId: "new", category: "A", value: 1 }],
      bounded: true
    })
    store.updateConfig({ dataIdAccessor: "nextId" })
    expect(store.update("new", (d) => ({ ...d, value: 7 }))).toHaveLength(1)
    expect(store.getData()[0].value).toBe(7)
    expect(store.remove("old")).toHaveLength(0)
    expect(store.remove("new")).toHaveLength(1)
  })

  it("re-derives timeline extents when the ordinal chart type changes", () => {
    const store = families.ordinal({ valueAccessor: "span" })
    store.ingest({
      inserts: [{ category: "A", span: [10, 30] }],
      bounded: true
    })
    store.updateConfig({ chartType: "timeline" })
    store.computeScene({ width: 400, height: 300 })
    expect(store.scales!.r.domain()).toEqual([10, 30])
  })
})
