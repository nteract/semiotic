import { describe, expect, it } from "vitest"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoPipelineConfig } from "./geoTypes"

function makeConfig(overrides: Partial<GeoPipelineConfig> = {}): GeoPipelineConfig {
  return {
    projection: "mercator",
    xAccessor: "lon",
    yAccessor: "lat",
    pointIdAccessor: "id",
    ...overrides,
  }
}

describe("GeoPipelineStore update-result reference path", () => {
  it("reports bounded and streaming data changes while retaining existing methods", () => {
    const store = new GeoPipelineStore(makeConfig())
    const points = [
      { id: "sf", lon: -122.4, lat: 37.8 },
      { id: "ny", lon: -74, lat: 40.7 },
    ]

    const bounded = store.setPointsWithResult(points)
    expect(bounded.changeSet).toEqual({ kind: "replace", count: 2 })
    expect([...bounded.changed]).toEqual(expect.arrayContaining([
      "data",
      "domain",
      "layout",
      "scene-geometry",
      "data-paint",
      "accessibility",
      "evidence",
    ]))

    store.pushPoint({ id: "la", lon: -118.2, lat: 34.1 })
    const streamed = store.getLastUpdateResult()
    expect(streamed.changeSet).toEqual({ kind: "ingest", count: 1 })
    expect(streamed.revisions.data).toBe(2)

    expect(store.removePoint("missing")).toEqual([])
    const noOp = store.getLastUpdateResult()
    expect(noOp.changeSet).toEqual({ kind: "remove", count: 0 })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(streamed.revisions)
  })

  it("classifies projection/style config and explicit no-op restyles", () => {
    const store = new GeoPipelineStore(makeConfig())

    const config = store.updateConfigWithResult({
      projection: "orthographic",
      pointStyle: () => ({ fill: "tomato" }),
    })
    expect(config.changeSet).toEqual({
      kind: "config",
      keys: ["projection", "pointStyle"],
    })
    expect(config.changed.has("domain")).toBe(true)
    expect(config.changed.has("scene-style")).toBe(true)
    expect(config.changed.has("data-paint")).toBe(true)

    store.restyleScene(null)
    const noOp = store.getLastUpdateResult()
    expect(noOp.changeSet).toEqual({ kind: "restyle" })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(config.revisions)
  })
})
