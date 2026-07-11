#!/usr/bin/env node
/**
 * Validate that every component parameter schema in ai/schema.json is a valid
 * JSON Schema Draft 2020-12 document.
 *
 * ai/schema.json is published for external MCP/agent consumers, so its per-tool
 * `function.parameters` must compile against the Draft 2020-12 metaschema. A
 * previous version emitted runtime-only `"type": "function"` (and unions
 * containing it), which is not a JSON Schema value type and fails metaschema
 * validation. Those runtime types now live in the `x-semiotic-runtime-types`
 * extension keyword instead; this gate keeps the wire schema honest.
 *
 * The top-level tool wrapper (`{ type: "function", function: {...} }`) is the
 * OpenAI tool-call format, not a JSON Schema, so only `function.parameters` is
 * validated here.
 *
 * Exit code is nonzero on any invalid schema so this can gate CI/release.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import Ajv2020 from "ajv/dist/2020.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(here, "..", "ai", "schema.json")
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"))

// `strict: false` lets our `x-semiotic-runtime-types` extension keyword through
// without a strict-mode error while still validating the schema against the
// Draft 2020-12 metaschema. We register the keyword explicitly for clarity.
//
// ajv's CJS/ESM interop build exposes the constructor both as the default
// export and as `default.default`; guard against either shape so this
// doesn't break on an ajv version that drops the self-reference.
const Ajv2020Constructor = Ajv2020.default ?? Ajv2020
const ajv = new Ajv2020Constructor({ strict: false, allErrors: true })
ajv.addKeyword({ keyword: "x-semiotic-runtime-types" })

const tools = Array.isArray(schema.tools) ? schema.tools : []
const failures = []

for (const tool of tools) {
  const name = tool?.function?.name ?? "(unnamed)"
  const parameters = tool?.function?.parameters
  if (!parameters) {
    failures.push(`${name}: missing function.parameters`)
    continue
  }
  const valid = ajv.validateSchema(parameters)
  if (!valid) {
    const detail = (ajv.errors || []).map((e) => `${e.instancePath} ${e.message}`).join("; ")
    failures.push(`${name}: ${detail || "invalid schema"}`)
  }
}

if (failures.length > 0) {
  console.error(`✗ ai/schema.json: ${failures.length}/${tools.length} component schemas are NOT valid Draft 2020-12:`)
  for (const f of failures) console.error(`  • ${f}`)
  process.exit(1)
}

console.log(`✅ ai/schema.json: all ${tools.length} component parameter schemas are valid JSON Schema Draft 2020-12`)
