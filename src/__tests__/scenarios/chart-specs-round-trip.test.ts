/**
 * Phase 1 shape proof for the Chart Spec Registry.
 *
 * Loads BarChart from `chartSpecs.ts`, runs each generator, and asserts
 * the output is structurally equivalent to the existing canonical entry
 * in schema.json / validationMap.ts / componentMetadata.cjs.
 *
 * "Structurally equivalent" means:
 *   - Same set of public prop keys (after `omitFromSchema` filter for schema)
 *   - Same `type` union per prop
 *   - Same `enum` set per prop
 *   - Same `default` per prop (where the canonical file declares one)
 *   - Same `required` array
 *
 * Order is intentionally NOT compared — the canonical schema.json has
 * hand-curated prop ordering that the registry won't reproduce; the
 * Phase 2 migration will re-baseline that file with the registry's
 * deterministic order. This test verifies semantic equivalence today.
 */
import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"
import { CHART_SPECS, composeProps } from "../../components/charts/shared/chartSpecs"
import {
  generateSchemaToolEntry,
  generateValidationMapEntry,
  generateMetadataEntry,
} from "../../../scripts/lib/chart-specs-generators.mjs"
import { VALIDATION_MAP } from "../../components/charts/shared/validationMap"

const require = createRequire(import.meta.url)
const schema = require("../../../ai/schema.json") as {
  tools: Array<{
    type: "function"
    function: {
      name: string
      description: string
      parameters: {
        type: "object"
        properties: Record<string, { type: unknown; enum?: unknown[]; default?: unknown }>
        required: string[]
      }
    }
  }>
}
const componentMetadata = require("../../../ai/componentMetadata.cjs") as {
  COMPONENTS_BY_CATEGORY: Record<string, string[]>
}

describe("Chart Spec Registry — Phase 1 round-trip", () => {
  describe("BarChart", () => {
    const spec = CHART_SPECS.BarChart
    const composed = composeProps(spec)

    it("generates a schema tool entry that matches the canonical schema.json", () => {
      const generated = generateSchemaToolEntry(spec, composed)
      const canonical = schema.tools.find((t) => t.function.name === "BarChart")!
      expect(canonical).toBeDefined()

      // Top-level structure
      expect(generated.type).toBe(canonical.type)
      expect(generated.function.name).toBe(canonical.function.name)
      expect(generated.function.description).toBe(canonical.function.description)
      expect(generated.function.parameters.required).toEqual(canonical.function.parameters.required)

      // Per-prop equivalence: same set of keys, same type/enum/default per key.
      const generatedKeys = new Set(Object.keys(generated.function.parameters.properties))
      const canonicalKeys = new Set(Object.keys(canonical.function.parameters.properties))
      expect(generatedKeys, "generated and canonical schema agree on which props are exposed").toEqual(canonicalKeys)

      // For every prop the generator emits, its shape must match the canonical.
      for (const propName of generatedKeys) {
        const gen = generated.function.parameters.properties[propName]
        const can = canonical.function.parameters.properties[propName]
        expect(can, `BarChart.${propName} present in canonical schema`).toBeDefined()
        expect(gen.type, `BarChart.${propName} type`).toEqual(can.type)
        if ("enum" in can) expect(gen.enum, `BarChart.${propName} enum`).toEqual(can.enum)
        if ("default" in can) expect(gen.default, `BarChart.${propName} default`).toEqual(can.default)
      }
    })

    it("generates a validationMap entry that matches the canonical VALIDATION_MAP", () => {
      const generated = generateValidationMapEntry(spec, composed)
      const canonical = VALIDATION_MAP.BarChart
      expect(canonical).toBeDefined()

      expect(generated.required).toEqual(canonical.required)
      expect(generated.dataShape).toBe(canonical.dataShape)
      expect(generated.dataAccessors).toEqual(canonical.dataAccessors)

      // Per-prop equivalence: same set of keys (full runtime surface),
      // same `type` union per key, same `enum` per key.
      const generatedKeys = new Set(Object.keys(generated.props))
      const canonicalKeys = new Set(Object.keys(canonical.props))
      expect(generatedKeys).toEqual(canonicalKeys)

      for (const propName of generatedKeys) {
        const gen = generated.props[propName]
        const can = canonical.props[propName]
        expect(gen.type, `BarChart.${propName} type`).toEqual(can.type)
        if (can.enum) {
          expect(gen.enum, `BarChart.${propName} enum`).toEqual([...can.enum])
        }
      }
    })

    it("generates a componentMetadata category entry that matches the canonical bucket", () => {
      const generated = generateMetadataEntry(spec)
      expect(generated.name).toBe("BarChart")
      expect(generated.category).toBe("ordinal")
      // Canonical: BarChart appears in the ordinal bucket.
      expect(componentMetadata.COMPONENTS_BY_CATEGORY.ordinal).toContain("BarChart")
    })
  })
})
