import { describe, expect, it } from "vitest"
import {
  findUnclassifiedPublicProps,
  unsupportedPublicEnumValues,
  type PublicPropRuntimeShape
} from "./public-chart-prop-parity"

const shape = (
  runtimeTypes: string[],
  stringLiterals: string[] = [],
  broadString = false
): PublicPropRuntimeShape => ({
  runtimeTypes: new Set(runtimeTypes),
  stringLiterals: new Set(stringLiterals),
  broadString
})

describe("public chart prop parity", () => {
  it("reports a newly added serializable prop unless this chart classifies it", () => {
    const publicProps = new Map([
      ["data", shape(["array"])],
      ["onHover", shape(["function", "null"])],
      ["newSerializableOption", shape(["string"])]
    ])

    expect(
      findUnclassifiedPublicProps({
        publicProps,
        composedPropNames: new Set(["data"]),
        exceptionPropNames: new Set()
      })
    ).toEqual(["newSerializableOption"])

    expect(
      findUnclassifiedPublicProps({
        publicProps,
        composedPropNames: new Set(["data"]),
        exceptionPropNames: new Set(["newSerializableOption"])
      })
    ).toEqual([])
  })

  it("reports public literal values rejected by a narrower schema enum", () => {
    const arrow = shape(["string"], ["up", "down", "left", "right"])
    expect(unsupportedPublicEnumValues(arrow, ["left", "right"])).toEqual([
      "up",
      "down"
    ])
    expect(
      unsupportedPublicEnumValues(arrow, ["left", "right"], ["up", "down"])
    ).toEqual([])
    expect(
      unsupportedPublicEnumValues(arrow, ["up", "down", "left", "right"])
    ).toEqual([])
  })
})
