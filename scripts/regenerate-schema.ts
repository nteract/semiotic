/** Regenerate or inspect the complete chart-spec output set. */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildChartSpecArtifacts,
  CHART_SPEC_INPUTS
} from "./lib/chart-spec-artifacts"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const { files, regeneratedCount, preservedCount, appendedCount } =
  buildChartSpecArtifacts(root)
if (process.argv.includes("--list")) {
  console.log(
    JSON.stringify(
      {
        entryInputs: CHART_SPEC_INPUTS,
        outputs: Object.keys(files),
        check: "npm run check:chart-specs",
        consumers: [
          { command: "npm run dist:prod", after: ["chart-spec generation"] },
          { command: "npm run build:mcp", after: ["npm run dist:prod"] },
          { command: "npm run check:mcp-bundle", after: ["npm run build:mcp"] }
        ]
      },
      null,
      2
    )
  )
} else {
  const check = process.argv.includes("--check")
  const changed: string[] = []
  for (const [relativePath, expected] of Object.entries(files)) {
    const target = join(root, relativePath)
    if (existsSync(target) && readFileSync(target, "utf8") === expected)
      continue
    changed.push(relativePath)
    if (!check) writeFileSync(target, expected, "utf8")
  }
  if (check && changed.length) {
    console.error(
      `Chart artifacts are stale (run npm run docs:chart-specs:schema):\n${changed.join("\n")}`
    )
    process.exitCode = 1
  } else {
    console.log(
      `${check ? "Checked" : "Regenerated"} ${Object.keys(files).length} chart artifacts (${regeneratedCount} entries, ${preservedCount} preserved, ${appendedCount} appended; ${changed.length} changed).`
    )
  }
}
