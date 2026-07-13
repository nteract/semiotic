import { describe, expect, it } from "vitest"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoPipelineConfig } from "./geoTypes"

function makeConfig(overrides: Partial<GeoPipelineConfig> = {}): GeoPipelineConfig {
  return {
    projection: "mercator",
    xAccessor: "lon",
    yAccessor: "lat",
    pointIdAccessor: "id",
    ...overrides
  }
}

function renderedPointCount(store: GeoPipelineStore): number {
  return store.scene.filter((node) => node.type === "point").length
}

describe("GeoPipelineStore retained point data", () => {
  it("retains a bounded replacement when the next push enters streaming mode", () => {
    const store = new GeoPipelineStore(makeConfig())
    const bounded = [{ id: "bounded", lon: -122.4, lat: 37.8 }]
    const streamed = { id: "streamed", lon: -74, lat: 40.7 }

    store.initStreaming(2)
    store.pushPoint({ id: "stale-stream", lon: -118.2, lat: 34.1 })
    store.setPoints(bounded)
    store.pushPoint(streamed)

    expect(store.getPoints()).toEqual([bounded[0], streamed])
    store.computeScene({ width: 320, height: 180 })
    expect(renderedPointCount(store)).toBe(2)
  })

  it("rebuilds from its retained bounded snapshot after a config update", () => {
    const store = new GeoPipelineStore(makeConfig())
    const supplied = [{ id: "retained", lon: -122.4, lat: 37.8 }]

    store.setPoints(supplied)
    supplied.push({ id: "external-mutation", lon: -74, lat: 40.7 })
    const result = store.updateConfigWithResult({ fitPadding: 0.1 })
    store.computeScene({ width: 320, height: 180 })

    expect(result.changed.has("domain")).toBe(true)
    expect(store.getPoints()).toEqual([{ id: "retained", lon: -122.4, lat: 37.8 }])
    expect(renderedPointCount(store)).toBe(1)
  })

  it("converts bounded points and lines into the newest configured stream window", () => {
    const store = new GeoPipelineStore(makeConfig({ windowSize: 3 }))
    const points = Array.from({ length: 5 }, (_, index) => ({
      id: `point-${index + 1}`,
      lon: -120 + index,
      lat: 35 + index
    }))
    const lines = Array.from({ length: 5 }, (_, index) => ({
      id: `line-${index + 1}`,
      coordinates: [[index, index], [index + 1, index + 1]]
    }))

    store.setPoints(points)
    store.setLines(lines)
    store.initStreaming()

    expect(store.getPoints().map((point) => point.id)).toEqual(["point-3", "point-4", "point-5"])
    expect(store.getLines().map((line) => line.id)).toEqual(["line-3", "line-4", "line-5"])

    store.pushPoint({ id: "point-6", lon: -115, lat: 40 })
    store.pushLine({ id: "line-6", coordinates: [[5, 5], [6, 6]] })

    expect(store.getPoints().map((point) => point.id)).toEqual(["point-4", "point-5", "point-6"])
    expect(store.getLines().map((line) => line.id)).toEqual(["line-4", "line-5", "line-6"])
  })

  it("resizes active point, timestamp, and line retention without reviving evicted data", () => {
    const store = new GeoPipelineStore(makeConfig({
      windowSize: 4,
      lineIdAccessor: "id",
      pointIdAccessor: "id",
      pulse: { duration: 1000 }
    }))

    store.setPoints([
      { id: "point-1", lon: -120, lat: 35 },
      { id: "point-2", lon: -119, lat: 36 },
      { id: "point-3", lon: -118, lat: 37 },
      { id: "point-4", lon: -117, lat: 38 }
    ])
    store.setLines([
      { id: "line-1", coordinates: [[0, 0], [1, 1]] },
      { id: "line-2", coordinates: [[1, 1], [2, 2]] },
      { id: "line-3", coordinates: [[2, 2], [3, 3]] },
      { id: "line-4", coordinates: [[3, 3], [4, 4]] }
    ])
    store.initStreaming()
    store.updateConfig({ windowSize: 2 })

    expect(store.getPoints().map((point) => point.id)).toEqual(["point-3", "point-4"])
    expect(store.getLines().map((line) => line.id)).toEqual(["line-3", "line-4"])
    expect(store.removePoint("point-3").map((point) => point.id)).toEqual(["point-3"])

    store.updateConfig({ windowSize: 3 })
    store.pushPoint({ id: "point-5", lon: -116, lat: 39 })
    store.pushLine({ id: "line-5", coordinates: [[4, 4], [5, 5]] })

    expect(store.getPoints().map((point) => point.id)).toEqual(["point-4", "point-5"])
    expect(store.getLines().map((line) => line.id)).toEqual(["line-3", "line-4", "line-5"])
    expect(store.hasActivePulses).toBe(true)

    store.clear()
    store.pushMany([
      { id: "point-6", lon: -115, lat: 40 },
      { id: "point-7", lon: -114, lat: 41 },
      { id: "point-8", lon: -113, lat: 42 },
      { id: "point-9", lon: -112, lat: 43 }
    ])
    store.pushManyLines([
      { id: "line-6", coordinates: [[5, 5], [6, 6]] },
      { id: "line-7", coordinates: [[6, 6], [7, 7]] },
      { id: "line-8", coordinates: [[7, 7], [8, 8]] },
      { id: "line-9", coordinates: [[8, 8], [9, 9]] }
    ])

    expect(store.getPoints().map((point) => point.id)).toEqual(["point-7", "point-8", "point-9"])
    expect(store.getLines().map((line) => line.id)).toEqual(["line-7", "line-8", "line-9"])
  })
})
