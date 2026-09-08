import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  buildBriefing,
  compareBriefings,
  type BriefingReading
} from "../../docs/src/pages/examples/jobs-report/packet"
import { ingest } from "./ingest"
import { bundle, checkSaved, json, writeEdition } from "./bundle"

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const options = new Map<string, string>()
  for (let i = 0; i < args.length; i++) {
    const key = args[i]
    if (
      ![
        "--source",
        "--month",
        "--vintage",
        "--output",
        "--before",
        "--after",
        "--review",
        "--reading",
        "--reason",
        "--json"
      ].includes(key) ||
      options.has(key)
    )
      throw new Error(`Unknown or duplicate option: ${key}`)
    if (key === "--json") options.set(key, "true")
    else {
      const value = args[++i]
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${key}`)
      options.set(key, value)
    }
  }
  const required = (key: string) => {
    const value = options.get(key)
    if (!value)
      throw new Error(
        `Missing ${key}; see README.md for build, compare and check recipes`
      )
    return value
  }
  const snapshot = ingest(resolve(required("--source")))
  const output = resolve(required("--output"))
  if (command === "build") {
    const result = await bundle(
      snapshot,
      required("--month"),
      required("--vintage"),
      (options.get("--reading") ?? "direction") as BriefingReading
    )
    writeEdition(output, result.files)
    console.log(
      options.has("--json")
        ? json(result.check)
        : `${result.check.status}: ${result.briefing.edition}\n${result.check.reason}\nBundle: ${output}`
    )
  } else if (command === "compare") {
    const month = required("--month")
    const before = buildBriefing(snapshot, month, required("--before"))
    const after = buildBriefing(
      snapshot,
      month,
      required("--after"),
      (options.get("--reading") ?? "direction") as BriefingReading
    )
    const report = compareBriefings(
      before,
      after,
      options.get("--reason") ?? "source-update"
    )
    writeEdition(output, {
      "change-report.json": json(report),
      "before.json": json(before),
      "after.json": json(after),
      "README.txt": `${before.edition} → ${after.edition}\nReason: ${report.reason}\n${report.changed.map((row) => `${row.key}: ${before.values.find((old) => old.key === row.key)?.value} → ${row.value} jobs`).join("\n")}\nReassessed claims: ${report.affectedClaims.join(", ")}\nThe earlier review does not apply. Human editorial review remains pending.\n`
    })
    console.log(
      options.has("--json")
        ? json(report)
        : `conditional: ${report.before} → ${report.after}\n${report.changed.length} changed value bindings; earlier review does not apply.`
    )
  } else if (command === "check") {
    const review = options.get("--review")
    const result = await checkSaved(
      snapshot,
      output,
      review ? JSON.parse(readFileSync(resolve(review), "utf8")) : undefined
    )
    console.log(
      options.has("--json")
        ? json(result)
        : `${result.status}: ${result.reason}`
    )
    // A check differs from a successful export: unresolved publication work is nonzero.
    process.exitCode =
      result.status === "ready-for-demo"
        ? 0
        : result.status === "refuse"
          ? 1
          : 2
  } else throw new Error("Choose build, compare or check; see README.md")
}
main().catch((error) => {
  console.error(
    process.argv.includes("--json")
      ? json({ status: "refuse", publishable: false, error: error.message })
      : `refuse: ${error.message}`
  )
  process.exitCode = 1
})
