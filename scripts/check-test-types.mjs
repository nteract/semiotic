import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const baseline = JSON.parse(readFileSync("scripts/test-typecheck-baseline.json", "utf8"))
const known = baseline.files ?? {}
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

const counts = new Map()
for (const line of output.split(/\r?\n/)) {
  const match = line.match(/^(src\/[^(:]+\.(?:ts|tsx))\(/)
  if (!match) continue
  counts.set(match[1], (counts.get(match[1]) ?? 0) + 1)
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
