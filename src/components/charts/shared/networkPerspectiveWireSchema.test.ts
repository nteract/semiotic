import Ajv2020 from "ajv/dist/2020.js"
import { describe, expect, it } from "vitest"
import { CHART_DEFINITIONS } from "./chartDefinitions"
import { NETWORK_PERSPECTIVE_PROP_SPEC } from "./networkPerspectiveWireSchema"

const ajv = new Ajv2020({ strict: false })
const surfaces = [
  ["shared", NETWORK_PERSPECTIVE_PROP_SPEC.schema],
  ...Object.entries(CHART_DEFINITIONS)
    .filter(([, definition]) => definition.wire.schema.properties.perspective)
    .map(([name, definition]) => [name, definition.wire.schema.properties.perspective] as const)
] as const

describe.each(surfaces)("%s perspective wire schema", (_name, schema) => {
  const validate = ajv.compile(schema)

  it.each(["elevationScale", "extrudeScale"])("restricts %s to numbers or auto", (key) => {
    for (const value of [0, 2, "auto"]) expect(validate({ [key]: value })).toBe(true)
    for (const value of ["log", "linear", "", true, null]) expect(validate({ [key]: value })).toBe(false)
  })

  it("restricts edge elevation to supported modes or numbers", () => {
    for (const elevation of [0, 20, "surface", "ground", "nodes"]) {
      expect(validate({ edges: { elevation } })).toBe(true)
    }
    for (const elevation of ["node", "auto", "", true, null]) {
      expect(validate({ edges: { elevation } })).toBe(false)
    }
  })
})
