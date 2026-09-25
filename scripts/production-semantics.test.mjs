import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))

function targets(value, conditions = []) {
  if (typeof value === "string") {
    return /\.js$/.test(value)
      ? [{ file: value, conditions: conditions.join("/") }]
      : []
  }
  return Object.entries(value).flatMap(([condition, nested]) =>
    targets(nested, [...conditions, condition])
  )
}

function publicTargets(entry) {
  const unique = new Map()
  for (const target of targets(pkg.exports[entry])) {
    if (!unique.has(target.file)) unique.set(target.file, target)
  }
  return [...unique.values()]
}

// Run each actual entry in isolation, including the browser/edge ESM build.
// Browser ReactDOMServer can retain a MessagePort in Node; explicit child exit
// keeps this semantic check independent of that host-specific idle lifecycle.
function exercise(target, program) {
  const filename = resolve(root, target.file)
  assert.ok(
    existsSync(filename),
    `${target.file} is missing; run npm run dist:prod`
  )
  const source = `
    import { createRequire } from "node:module"
    import { pathToFileURL } from "node:url"
    import assert from "node:assert/strict"
    const filename = process.argv[1]
    const api = filename.endsWith(".module.min.js")
      ? await import(pathToFileURL(filename).href)
      : createRequire(import.meta.url)(filename)
    ${program}
    process.exit(0)
  `
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", source, filename],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 15000
    }
  )
  assert.equal(
    result.status,
    0,
    `${target.file}: ${result.stderr || result.error || result.stdout}`
  )
}

for (const entry of [
  "./utils/core",
  "./network",
  "./geo",
  "./ordinal",
  "./physics"
]) {
  for (const target of publicTargets(entry)) {
    test(`${entry} ${target.conditions} rejects malformed numeric thresholds in the shipped artifact`, () => {
      exercise(
        target,
        `
        for (const threshold of [
          { gt: NaN }, { gt: "abc" }, { gte: NaN }, { lt: NaN }, { lte: NaN },
          { within: [0, NaN] }, { outside: [NaN, NaN] }
        ]) {
          assert.equal(api.matchesThreshold({ field: "v", ...threshold }, { v: 1 }, {}), false)
        }
        assert.equal(api.matchesThreshold({ field: "v", gt: 0 }, { v: 1 }, {}), true)
        assert.equal(api.matchesThreshold({ field: "v", within: [0, 2] }, { v: 1 }, {}), true)
      `
      )
    })
  }
}

for (const entry of ["./server", "./server/node", "./server/edge"]) {
  for (const target of publicTargets(entry)) {
    test(`${entry} ${target.conditions} paints valid source semantics through the shipped renderer`, () => {
      exercise(
        target,
        `
        const props = {
          data: [{ category: "A", value: 1 }, { category: "B", value: 2 }], width: 300, height: 220,
          styleRules: [{ style: { fill: "#008a71" } }, { when: { field: "value", gt: NaN }, style: { fill: "#fa1234" } }]
        }
        const { svg, evidence } = api.renderChartWithEvidence("BarChart", props)
        assert.equal(evidence.markCount, 2)
        assert.equal(evidence.empty, false)
        assert.equal((svg.match(/fill="#008a71"/g) || []).length, 2)
        assert.equal(svg.includes("#fa1234"), false)
        assert.doesNotMatch(svg, /NaN|Infinity/)
      `
      )
    })
  }
}
