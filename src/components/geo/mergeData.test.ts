import { describe, expect, it } from "vitest"
import { mergeData } from "./mergeData"

function feature(properties: GeoJSON.GeoJsonProperties): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties
  }
}

describe("mergeData", () => {
  it("does not join through inherited feature-key segments", () => {
    const properties = Object.create({ code: "match" }) as GeoJSON.GeoJsonProperties
    const source = feature(properties)
    const [result] = mergeData([source], [{ join: "match", value: 42 }], {
      featureKey: "properties.code",
      dataKey: "join"
    })

    expect(result).toBe(source)
  })

  it("preserves legitimate own prototype-named join fields", () => {
    const source = feature(Object.fromEntries([["constructor", "match"]]))
    const row = Object.fromEntries([
      ["constructor", "match"],
      ["value", 42]
    ])
    const [result] = mergeData([source], [row], {
      featureKey: "properties.constructor",
      dataKey: "constructor"
    })

    expect(result).not.toBe(source)
    expect(result.properties?.value).toBe(42)
  })

  it("does not join through an inherited data key", () => {
    const source = feature({ code: "match" })
    const row = Object.assign(Object.create({ join: "match" }), {
      value: 42
    }) as Record<string, unknown>
    const [result] = mergeData([source], [row], {
      featureKey: "properties.code",
      dataKey: "join"
    })

    expect(result).toBe(source)
  })
})
