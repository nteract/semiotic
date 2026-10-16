import { expect, it } from "vitest"
import { classifyXYConfigPatch } from "./pipelineStoreUpdateResults"
import { classifyOrdinalConfigPatch } from "./ordinalPipelineUpdateResults"
import { classifyGeoConfigPatch } from "./geoPipelineUpdateResults"
import { classifyNetworkConfigPatch } from "./networkPipelineUpdateResults"
import { classifyPhysicsConfigPatch } from "./physics/physicsPipelineUpdateResults"

it.each([
  ["xy", classifyXYConfigPatch],
  ["ordinal", classifyOrdinalConfigPatch],
  ["geo", classifyGeoConfigPatch],
  ["network", classifyNetworkConfigPatch],
  ["physics", classifyPhysicsConfigPatch]
] as const)("treats prototype names as unknown %s config keys", (_family, classify) => {
  const expected = classify(["unknown-extension-option"])
  for (const key of Object.getOwnPropertyNames(Object.prototype)) {
    expect(classify([key])).toEqual(expected)
  }
})
