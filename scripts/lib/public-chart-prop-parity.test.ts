import { describe, expect, it } from "vitest"
import {
  findUndeclaredPublicProps,
  publicTypesRejectedBySpec,
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
  it("reports every public prop the spec does not declare, callbacks included", () => {
    const publicProps = new Map([
      ["data", shape(["array"])],
      ["onHover", shape(["function", "null"])],
      ["newSerializableOption", shape(["string"])]
    ])

    expect(
      findUndeclaredPublicProps({
        publicProps,
        composedPropNames: new Set(["data"])
      })
    ).toEqual(["onHover", "newSerializableOption"])

    expect(
      findUndeclaredPublicProps({
        publicProps,
        composedPropNames: new Set(["data", "onHover", "newSerializableOption"])
      })
    ).toEqual([])
  })

  it("reports public runtime types a runtime-only declaration would reject", () => {
    const linkedHover = shape(["boolean", "string", "object", "null"])
    expect(
      publicTypesRejectedBySpec(linkedHover, new Set(["boolean", "object"]))
    ).toEqual(["string"])
    expect(
      publicTypesRejectedBySpec(
        linkedHover,
        new Set(["boolean", "string", "object"])
      )
    ).toEqual([])
    // A generic or `any` member has no runtime category to compare.
    expect(publicTypesRejectedBySpec(shape(["unknown"]), new Set(["string"]))).toEqual([])
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
