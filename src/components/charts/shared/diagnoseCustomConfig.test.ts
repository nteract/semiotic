import { describe, expect, it } from "vitest"
import { diagnoseConfig } from "./diagnoseConfig"
import { validateProps } from "./validateProps"

describe("programmatic custom-chart diagnostics", () => {
  it.each([
    "XYCustomChart",
    "OrdinalCustomChart",
    "NetworkCustomChart",
    "GeoCustomChart",
    "PhysicsCustomChart"
  ])(
    "checks %s without adding executable callbacks to the serialized schema",
    (component) => {
      const props = {
        layout: () => ({}),
        data: [{ id: "one" }],
        nodes: [{ id: "one" }],
        edges: [],
        width: 640,
        height: 400
      }
      expect(diagnoseConfig(component, props).ok).toBe(true)
      expect(validateProps(component, props).valid).toBe(false)
      expect(
        diagnoseConfig(component, {
          ...props,
          layout: "source-code"
        }).diagnoses
      ).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "VALIDATION",
          message: "Provide a layout function."
        })
      )
      expect(
        diagnoseConfig(component, { ...props, width: 0 }).diagnoses.map(
          (finding) => finding.code
        )
      ).toContain("BAD_WIDTH")
      const field =
        component === "NetworkCustomChart"
          ? "nodes"
          : component === "GeoCustomChart"
            ? "points"
            : "data"
      expect(
        diagnoseConfig(component, { ...props, [field]: {} }).diagnoses
      ).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "VALIDATION",
          message: `Provide an array for ${field}.`
        })
      )
    }
  )
  it("keeps unpublished atlas reader names outside the serialized and programmatic chart registries", () => {
    expect(diagnoseConfig("FlowCircuitChart", { layout: () => ({}) }).ok).toBe(
      false
    )
  })
})
