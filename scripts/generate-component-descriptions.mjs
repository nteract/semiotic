#!/usr/bin/env node
/**
 * Extracts `{ [componentName]: description }` from ai/schema.json and writes
 * docs/public/api/component-descriptions.json. The docs ApiReferencePage
 * fetches this small file at runtime instead of importing the full 177KB
 * schema, which would otherwise be inlined into the website JS bundle.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")
const schemaPath = join(repoRoot, "ai/schema.json")
const outPath = join(repoRoot, "docs/public/api/component-descriptions.json")

const schema = JSON.parse(readFileSync(schemaPath, "utf8"))
const descriptions = Object.fromEntries(
  schema.tools.map((tool) => [tool.function.name, tool.function.description])
)

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(descriptions, null, 2) + "\n")
console.log(`✅ wrote ${Object.keys(descriptions).length} descriptions → ${outPath.replace(repoRoot + "/", "")}`)
