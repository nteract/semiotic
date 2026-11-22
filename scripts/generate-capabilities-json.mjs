#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { capabilityIndex, parseCapabilityMatrix } from "./lib/capabilityMatrix.mjs"
import { renderAccessCapabilitiesModule } from "./lib/accessCapabilities.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")
const OUT = path.join(ROOT, "ai/capabilities.json")
const ACCESS_OUT = path.join(
  ROOT,
  "src/components/access/chartAccessCapabilities.generated.ts"
)

const entries = parseCapabilityMatrix()

const output = {
  __generated: true,
  __source: "src/components/charts/shared/chartSpecs.ts",
  charts: capabilityIndex(entries)
}

fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n")
fs.writeFileSync(ACCESS_OUT, renderAccessCapabilitiesModule(entries))
console.log(`✅ wrote ${OUT}`)
console.log(`✅ wrote ${ACCESS_OUT}`)
console.log(`   ${entries.length} chart(s) indexed`)
