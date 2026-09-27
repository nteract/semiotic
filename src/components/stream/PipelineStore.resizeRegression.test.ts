import "../../test-utils/registerBuiltInXYPlugins"
import { describe, expect, it } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import type { Datum } from "../charts/shared/datumTypes"
import type { SceneNode } from "./types"

const data = [
  { id: "a", x: 2, y: 3, open: 2, close: 3, high: 4, low: 1, shape: "a" },
  { id: "b", x: 5, y: 7, open: 5, close: 7, high: 8, low: 4, shape: "b" }
]
const layout = { width: 400, height: 200 }
const resized = { width: 100, height: 50 }

function makeStore(config: Partial<PipelineConfig> = {}, rows: Datum[] = data) {
  const store = new PipelineStore({
    chartType: "scatter",
    runtimeMode: "bounded",
    xAccessor: "x",
    yAccessor: "y",
    pointIdAccessor: "id",
    windowSize: 100,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0,
    xExtent: [1, 10],
    yExtent: [0, 10],
    ...config
  })
  store.ingest({ inserts: rows, bounded: config.runtimeMode !== "streaming" })
  return store
}

function geometry(scene: SceneNode[]) {
  return scene.map((node) =>
    Object.fromEntries(
      Object.entries(node).filter(([key]) =>
        [
          "type",
          "x",
          "y",
          "r",
          "w",
          "h",
          "size",
          "path",
          "topPath",
          "bottomPath",
          "openY",
          "closeY",
          "highY",
          "lowY",
          "bodyWidth",
          "dotRadius"
        ].includes(key)
      )
    )
  )
}

function expectGeometry(actual: SceneNode[], expected: SceneNode[]) {
  const closeNumbers = (value: unknown): unknown => {
    if (typeof value === "number") return expect.closeTo(value, 8)
    if (Array.isArray(value)) return value.map(closeNumbers)
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, closeNumbers(v)])
      )
    }
    return value
  }
  expect(actual.length).toBeGreaterThan(0)
  expect(geometry(actual)).toEqual(closeNumbers(geometry(expected)))
}

describe("XY resize correctness (#1319)", () => {
  for (const chartType of [
    "scatter",
    "line",
    "area",
    "bar",
    "waterfall",
    "candlestick"
  ] as const) {
    // Candlesticks have update transitions but no synthesized intro state.
    it.each(chartType === "candlestick" ? [false] : [false, true])(
      `${chartType} retargets interrupted transitions (intro: %s)`,
      (intro) => {
        let now = 1000
        const config: Partial<PipelineConfig> = {
          chartType,
          clock: () => now,
          binSize: 1,
          openAccessor: "open",
          closeAccessor: "close",
          highAccessor: "high",
          lowAccessor: "low",
          transition: { duration: 1000, easing: "linear" },
          introAnimation: intro
        }
        const store = makeStore(config)
        store.computeScene(layout)
        if (!intro) {
          store.ingest({
            inserts: data.map((d) => ({
              ...d,
              x: d.x + 1,
              y: d.y - 1,
              close: d.close - 1
            })),
            bounded: true
          })
          store.computeScene(layout)
        }
        expect(store.activeTransition).not.toBeNull()
        now += 400
        expect(store.advanceTransition(now)).toBe(true)
        store.computeScene(resized)
        now += 1500
        expect(store.advanceTransition(now)).toBe(false)
        const fresh = makeStore(
          { ...config, transition: undefined },
          store.getData()
        )
        fresh.computeScene(resized)
        expectGeometry(store.scene, fresh.scene)
        expect(store.exitNodes).toEqual([])
      }
    )
  }

  it.each([
    { chartType: "scatter", symbolAccessor: "shape" },
    { chartType: "bar", binSize: 1, barStyle: { gap: 6 } },
    { chartType: "waterfall", waterfallStyle: { gap: 6 } },
    {
      chartType: "candlestick",
      openAccessor: "open",
      closeAccessor: "close",
      highAccessor: "high",
      lowAccessor: "low"
    },
    { chartType: "candlestick", highAccessor: "high", lowAccessor: "low" },
    {
      chartType: "candlestick",
      highAccessor: "high",
      lowAccessor: "low",
      candlestickStyle: { bodyWidth: 12 }
    }
  ] satisfies Partial<PipelineConfig>[])(
    "resizes $chartType with pixel constants and symbols",
    (config) => {
      const store = makeStore(config)
      store.computeScene(layout)
      for (const size of [resized, { width: 1200, height: 500 }, layout]) {
        store.computeScene(size)
        const fresh = makeStore(config)
        fresh.computeScene(size)
        expectGeometry(store.scene, fresh.scene)
      }
    }
  )

  it.each([0, -10, NaN, Infinity])(
    "defers invalid dimensions %s and recovers with retained data",
    (width) => {
      const store = makeStore()
      store.computeScene({ width, height: 100 })
      expect(store.scene).toEqual([])
      store.computeScene(layout)
      const fresh = makeStore()
      fresh.computeScene(layout)
      expectGeometry(store.scene, fresh.scene)
      store.computeScene({ width: 400, height: width })
      store.computeScene(resized)
      fresh.computeScene(resized)
      expectGeometry(store.scene, fresh.scene)
    }
  )

  for (const runtimeMode of ["bounded", "streaming"] as const) {
    for (const xScaleType of ["linear", "log", "time"] as const) {
      it.each(["left", "right"] as const)(
        `${runtimeMode} ${xScaleType} scales agree with marks across resize (%s)`,
        (arrowOfTime) => {
          const store = makeStore({
            runtimeMode,
            xScaleType,
            arrowOfTime,
            invertY: true
          })
          for (const size of [layout, resized, layout]) {
            store.computeScene(size)
            for (const node of store.scene) {
              expect(node.type).toBe("point")
              if (node.type !== "point") throw new Error("expected point")
              expect(node.x).toBeCloseTo(store.scales!.x(Number(node.datum!.x)), 8)
              expect(node.y).toBeCloseTo(store.scales!.y(Number(node.datum!.y)), 8)
            }
            const fraction = xScaleType === "log" ? Math.log10(2) : 1 / 9
            expect(store.scales!.x(2)).toBeCloseTo(
              size.width *
                (runtimeMode === "streaming" && arrowOfTime === "left"
                  ? 1 - fraction
                  : fraction),
              8
            )
            if (xScaleType === "time")
              expect(store.scales!.x.invert(0)).toBeInstanceOf(Date)
          }
        }
      )
    }
  }
})
