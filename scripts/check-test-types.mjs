import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { isAbsolute, join, relative } from "node:path"

const baseline = JSON.parse(readFileSync("scripts/test-typecheck-baseline.json", "utf8"))
if (!baseline || typeof baseline !== "object" || Array.isArray(baseline) || !baseline.files || typeof baseline.files !== "object" || Array.isArray(baseline.files)) {
  const topLevelFiles = baseline && typeof baseline === "object" && !Array.isArray(baseline)
    ? Object.keys(baseline).filter((key) => /\.(?:ts|tsx)$/.test(key.replace(/\\/g, "/")))
    : []
  const hint = topLevelFiles.length > 0
    ? " Did you mean to wrap file counts in a top-level \"files\" object?"
    : ""
  console.error(`Invalid scripts/test-typecheck-baseline.json: expected { "files": { ... } }.${hint}`)
  process.exit(1)
}
const known = baseline.files
if (Object.keys(known).length === 0) {
  console.error("Invalid scripts/test-typecheck-baseline.json: baseline.files is empty.")
  process.exit(1)
}
const tscBin = join("node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc")

const result = spawnSync(tscBin, ["-p", "tsconfig.tests.json", "--noEmit", "--pretty", "false"], {
  encoding: "utf8",
})

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if (result.status === 0) {
  console.log("Test typecheck passed with no errors.")
  process.exit(0)
}

function normalizeDiagnosticPath(file) {
  const normalized = file.replace(/\\/g, "/")
  const cwd = process.cwd().replace(/\\/g, "/")
  if (normalized.startsWith(`${cwd}/`)) {
    return normalized.slice(cwd.length + 1)
  }
  if (isAbsolute(file)) {
    const rel = relative(process.cwd(), file).replace(/\\/g, "/")
    return rel.startsWith("../") ? normalized : rel
  }
  return normalized.replace(/^\.\//, "")
}

const counts = new Map()
for (const line of output.split(/\r?\n/)) {
  const match = line.match(/^(.+\.(?:ts|tsx))\(\d+,\d+\):\s+error\s+TS\d+:/)
  if (!match) continue
  const file = normalizeDiagnosticPath(match[1])
  counts.set(file, (counts.get(file) ?? 0) + 1)
}

const newFiles = []
const regressions = []
const improvements = []

for (const [file, count] of counts) {
  const expected = known[file]
  if (expected == null) {
    newFiles.push([file, count])
  } else if (count > expected) {
    regressions.push([file, count, expected])
  } else if (count < expected) {
    improvements.push([file, expected - count, expected, count])
  }
}
for (const [file, expected] of Object.entries(known)) {
  if (!counts.has(file)) {
    improvements.push([file, expected, expected, 0])
  }
}

const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0)

if (newFiles.length === 0 && regressions.length === 0) {
  console.log(`Test typecheck has ${total} known baseline errors across ${counts.size} files; no new files or per-file regressions.`)
  if (improvements.length > 0) {
    console.log("Baseline can shrink:")
    for (const [file, reducedBy, from, to] of improvements.slice(0, 20)) {
      console.log(`  ${file}: ${from} -> ${to} (${reducedBy} fewer)`)
    }
  }
  process.exit(0)
}

console.error("Test typecheck found new or worsened errors.")
if (newFiles.length > 0) {
  console.error("New files:")
  for (const [file, count] of newFiles.slice(0, 20)) {
    console.error(`  ${file}: ${count}`)
  }
}
if (regressions.length > 0) {
  console.error("Regressions:")
  for (const [file, count, expected] of regressions.slice(0, 20)) {
    console.error(`  ${file}: ${expected} -> ${count}`)
  }
}
if (process.env.TEST_TYPES_VERBOSE === "1") {
  console.error(output)
} else {
  console.error("Set TEST_TYPES_VERBOSE=1 to print the raw tsc output.")
}
process.exit(1)
