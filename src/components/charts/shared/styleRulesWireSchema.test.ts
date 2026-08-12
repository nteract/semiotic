import Ajv2020 from "ajv/dist/2020.js"
import { describe, expect, it } from "vitest"
import { generateSchemaToolEntry } from "../../../../scripts/lib/chart-specs-generators.mjs"
import { CHART_SPECS, composeProps } from "./chartSpecs"
import {
  STYLE_RULES_PROP_SPEC,
  STYLE_RULES_WIRE_SCHEMA,
} from "./styleRulesWireSchema"

const styleRuleSpecs = Object.values(CHART_SPECS).filter(
  (spec) => composeProps(spec).styleRules !== undefined,
)

describe("serializable styleRules schema", () => {
  const validate = new Ajv2020({ strict: false, allErrors: true }).compile({
    type: "array",
    ...STYLE_RULES_WIRE_SCHEMA,
  })

  it("accepts declarative thresholds, cursor styles, and HatchFill", () => {
    expect(validate([
      {
        id: "review",
        label: "Needs review",
        when: {
          axis: "value",
          gte: 10,
          outside: [20, 40],
          in: [12, "pending"],
        },
        style: {
          cursor: "pointer",
          fill: {
            type: "hatch",
            background: "#fff",
            stroke: "#333",
            spacing: 6,
            angle: 45,
            lineWidth: 1.5,
            lineOpacity: 0.8,
          },
          stroke: "#111",
          strokeWidth: 2,
          strokeDasharray: "3 2",
          fillOpacity: 0.7,
          opacity: 0.9,
        },
      },
      { when: true, style: { fill: "tomato" } },
      { when: false, style: {} },
      { style: {} },
    ])).toBe(true)
  })

  it("rejects React-only functions and malformed nested descriptors", () => {
    expect(validate([{ when: () => true, style: { fill: "red" } }])).toBe(false)
    expect(validate([{ when: { gt: 1 }, style: () => ({ fill: "red" }) }])).toBe(false)
    expect(validate([{ when: { within: [1] }, style: { fill: "red" } }])).toBe(false)
    expect(validate([{ when: { gt: 1, predicate: "nope" }, style: { fill: "red" } }])).toBe(false)
    expect(validate([{ style: { fill: { type: "solid" } } }])).toBe(false)
    expect(validate([{ style: { pointerEvents: "none" } }])).toBe(false)
  })

  it("publishes the same nested contract for every wired chart spec", () => {
    expect(styleRuleSpecs.length).toBeGreaterThan(0)
    for (const spec of styleRuleSpecs) {
      const composed = composeProps(spec)
      expect(composed.styleRules, `${spec.name}.styleRules uses the shared contract`).toBe(
        STYLE_RULES_PROP_SPEC,
      )
      const generated = generateSchemaToolEntry(spec, composed)
      expect(
        generated.function.parameters.properties.styleRules,
        `${spec.name}.styleRules is present in the generated wire schema`,
      ).toEqual({
        type: "array",
        description: STYLE_RULES_PROP_SPEC.description,
        ...STYLE_RULES_WIRE_SCHEMA,
      })
    }
  })
})
