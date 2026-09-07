#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { buildAdoptionArtifacts, jsonText } from "./lib/adoption-evals.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
if (args.some((arg) => arg !== "--check") || args.length > 1) {
  throw new Error("Usage: node scripts/prepare-adoption-evals.mjs [--check]")
}
const artifacts = await buildAdoptionArtifacts(root)
const stale = []
for (const [name, content] of Object.entries(artifacts)) {
  const path = join(root, "evals/adoption", `${name}.json`)
  const text = jsonText(content)
  if (args.includes("--check")) {
    const existing = await readFile(path, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null
      throw error
    })
    if (existing !== text) stale.push(`evals/adoption/${name}.json`)
  } else {
    await writeFile(path, text)
  }
}
if (stale.length) {
  throw new Error(
    `Adoption output is stale: ${stale.join(", ")}. Run node scripts/prepare-adoption-evals.mjs`
  )
}
console.log(
  `${args.includes("--check") ? "Checked" : "Prepared"} ${artifacts.jobs.jobs.length} adoption development jobs and source inventory; no model calls or adoption outcomes.`
)
