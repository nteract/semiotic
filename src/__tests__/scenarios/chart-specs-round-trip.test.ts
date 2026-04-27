/**
 * Round-trip gate for the Chart Spec Registry.
 *
 * For every chart registered in `chartSpecs.ts`, this suite runs each
 * generator and asserts the output equals the canonical entry in
 * schema.json / validationMap.ts / componentMetadata.cjs.
 *
 * Equivalence is checked with vitest's `toEqual`, so the comparison is
 * deep structural equality on the parsed objects (same keys, same `type`
 * unions, same `enum`/`default`/`required`/`description`, same nested
 * shapes). It is NOT a serialized-bytes check: JSON property ordering
 * inside an object can differ between the registry's deterministic
 * emission and the on-disk file without failing this suite. That's
 * intentional — the canonical files have hand-curated prop ordering and
 * we treat the registry as the semantic source of truth, not the
 * lexical formatter. Run `npm run docs:chart-specs:schema` to refresh
 * the on-disk byte order when needed.
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

describe("Chart Spec Registry round-trip", () => {
  // Iterate over every chart registered in CHART_SPECS so a new entry
  // automatically gets the same equivalence checks. The bigger the
  // registry grows, the more ground this matrix covers without test edits.
  for (const [name, spec] of Object.entries(CHART_SPECS)) {
    describe(name, () => {
      const composed = composeProps(spec)

      it("generates a schema tool entry deeply equal to the canonical schema.json entry", () => {
        // Phase 3a tightened this from the Phase 2 structural-only check.
        // `ai/schema.json` is now regenerated from `chartSpecs.ts` via
        // `npx tsx scripts/regenerate-schema.ts`. Edits to chartSpecs.ts
        // must be paired with a regeneration commit; this test fails the
        // build otherwise. The check is a deep structural equality on the
        // parsed object (same keys, types, enums, defaults, descriptions,
        // and required array) rather than a serialized-bytes comparison.
        const generated = generateSchemaToolEntry(spec, composed)
        const canonical = schema.tools.find((t) => t.function.name === name)!
        expect(canonical, `${name} present in canonical schema`).toBeDefined()
        expect(generated, `${name} schema entry round-trips`).toEqual(canonical)
      })

      it("generates a validationMap entry that matches the canonical VALIDATION_MAP", () => {
        const generated = generateValidationMapEntry(spec, composed)
        const canonical = VALIDATION_MAP[name]
        expect(canonical, `${name} present in VALIDATION_MAP`).toBeDefined()

        expect(generated.required, `${name} required`).toEqual(canonical.required)
        expect(generated.dataShape, `${name} dataShape`).toBe(canonical.dataShape)
        expect(generated.dataAccessors, `${name} dataAccessors`).toEqual(canonical.dataAccessors)

        const generatedKeys = new Set(Object.keys(generated.props))
        const canonicalKeys = new Set(Object.keys(canonical.props))
        expect(generatedKeys, `${name} runtime prop set`).toEqual(canonicalKeys)

        for (const propName of generatedKeys) {
          const gen = generated.props[propName]
          const can = canonical.props[propName]
          expect(gen.type, `${name}.${propName} runtime type`).toEqual(can.type)
          if (can.enum) {
            expect(gen.enum, `${name}.${propName} runtime enum`).toEqual([...can.enum])
          }
        }
      })

      it("generates a componentMetadata category entry that matches the canonical bucket", () => {
        const generated = generateMetadataEntry(spec)
        expect(generated.name).toBe(name)
        expect(generated.category).toBe(spec.category)
        expect(componentMetadata.COMPONENTS_BY_CATEGORY[spec.category]).toContain(name)
      })
    })
  }
})
