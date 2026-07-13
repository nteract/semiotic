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
  it("starts a fresh stream after a bounded replacement", () => {
    const store = new GeoPipelineStore(makeConfig())
    const bounded = [{ id: "bounded", lon: -122.4, lat: 37.8 }]
    const streamed = { id: "streamed", lon: -74, lat: 40.7 }

    store.initStreaming(2)
    store.pushPoint({ id: "stale-stream", lon: -118.2, lat: 34.1 })
    store.setPoints(bounded)
    store.pushPoint(streamed)

    expect(store.getPoints()).toEqual([streamed])
    store.computeScene({ width: 320, height: 180 })
    expect(renderedPointCount(store)).toBe(1)
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
})
