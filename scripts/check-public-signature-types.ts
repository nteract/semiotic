import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  inventorySignatureTypes,
  reviewSignatureTypes
} from "./lib/public-signature-types"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
if (args.some((arg) => arg !== "--json"))
  throw new Error("Usage: check-public-signature-types.ts [--json]")
const reviews = JSON.parse(
  readFileSync(resolve(root, "scripts/public-signature-types.json"), "utf8")
)
if (reviews.schemaVersion !== 1 || !Array.isArray(reviews.types))
  throw new Error("Invalid public signature review schema")
const report = reviewSignatureTypes(
  inventorySignatureTypes(root),
  reviews.types
)
const path = resolve(root, "dist/public-signature-types.json")
mkdirSync(dirname(path), { recursive: true })
writeFileSync(path, JSON.stringify(report, null, 2) + "\n")
if (args.includes("--json")) console.log(JSON.stringify(report, null, 2))
else {
  const unreviewed = report.types.filter(
    (type) => type.classification === "unreviewed"
  )
  console.log(
    `Public signature types: ${report.types.length} named types; ${unreviewed.length} package types without public imports remain unreviewed.`
  )
  for (const type of unreviewed) console.log(`  ${type.id}`)
  console.log(
    `Full inventory (including external types, imports, references and review reasons): ${path}`
  )
}
for (const failure of report.failures) console.error(failure)
if (report.failures.length) process.exitCode = 1
