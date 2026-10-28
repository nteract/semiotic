import "../../test-utils/registerBuiltInXYPlugins"
import { PipelineStore } from "./PipelineStore"

const layout = { width: 400, height: 300, x: 0, y: 0 }
const rows = (count: number) =>
  Array.from({ length: count }, (_, time) => ({
    id: String(time),
    time,
    value: 10
  }))
const createStore = (extra = {}) =>
  new PipelineStore({
    chartType: "waterfall",
    windowSize: 3,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0,
    pointIdAccessor: "id",
    ...extra
  })
const values = (store: PipelineStore) => {
  store.computeScene(layout)
  return store.scene.map((node) => {
    if (node.type !== "rect") throw new Error("Expected a waterfall bar")
    return [node.datum?.baseline, node.datum?.cumEnd]
  })
}

it.each(["sliding", "growing"] as const)(
  "carries evicted deltas across %s windows and keeps the scale consistent",
  (windowMode) => {
    const store = createStore({ windowMode, maxCapacity: 3 })
    store.ingest({ inserts: rows(4), bounded: false })
    expect(values(store)).toEqual([
      [10, 20],
      [20, 30],
      [30, 40]
    ])
    expect(store.scales!.y.domain()).toEqual([0, 40])
    store.updateConfig({ windowSize: 2, maxCapacity: 2 })
    expect(values(store)).toEqual([
      [20, 30],
      [30, 40]
    ])
    store.updateConfig({ initialValue: 100 })
    expect(values(store)).toEqual([
      [120, 130],
      [130, 140]
    ])
    expect(store.scales!.y.domain()).toEqual([0, 140])
  }
)

it("preserves the full bounded balance on first live append and resets on clear or replacement", () => {
  const store = createStore({ initialValue: 100 })
  store.ingest({ inserts: rows(10), bounded: true })
  expect(values(store).at(-1)).toEqual([190, 200])
  store.ingest({ inserts: [{ id: "10", time: 10, value: 10 }], bounded: false })
  expect(values(store)).toEqual([
    [180, 190],
    [190, 200],
    [200, 210]
  ])
  store.clear()
  store.ingest({ inserts: rows(1), bounded: false })
  expect(values(store)).toEqual([[100, 110]])
  store.ingest({ inserts: rows(4), bounded: true })
  expect(values(store).at(-1)).toEqual([130, 140])
})

it("only carries eviction, while edits/removals recompute retained deltas and invalid rows contribute nothing", () => {
  const store = createStore()
  store.ingest({ inserts: rows(4), bounded: false })
  store.remove("1")
  store.update("2", (row) => ({ ...row, value: -5 }))
  expect(values(store)).toEqual([
    [10, 5],
    [5, 15]
  ])
  store.ingest({
    inserts: [
      { time: 4, value: Infinity },
      { time: NaN, value: 100 },
      { time: 6, value: 10 }
    ],
    bounded: false
  })
  expect(values(store)).toEqual([[15, 25]])
  store.ingest({
    inserts: [
      { time: 7, value: 10 },
      { time: 8, value: -5 }
    ],
    bounded: false
  })
  expect(values(store)).toEqual([
    [15, 25],
    [25, 35],
    [35, 30]
  ])
})
