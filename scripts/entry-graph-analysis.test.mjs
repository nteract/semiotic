import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { constants, gzipSync } from "node:zlib"
import { test } from "node:test"
import { build } from "esbuild"
import {
  entryGraphInputsPlugin,
  measureEntryGraphs,
  compareEntryGraphs,
  formatEntryGraphDetails
} from "./lib/entry-graph-analysis.mjs"

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "semiotic-entry-graph-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

test("measures static imports/re-exports and cycles once, excluding dynamic imports and source text", (t) => {
  const root = fixture(t)
  const files = {
    "first.js": `import './effect.js'; export { value } from './shared.js'; export const lazy = () => import('./lazy.js'); // import './missing.js'`,
    "second.js": `export * from './shared.js'; const docs = "from './missing.js'";`,
    "shared.js": `import './effect.js'; export const value = 42;`,
    "effect.js": `import './shared.js'; globalThis.loaded = true;`,
    "lazy.js": `export default 'not loaded eagerly'`
  }
  for (const [file, source] of Object.entries(files))
    writeFileSync(join(root, file), source)
  const report = measureEntryGraphs(root, [
    { entry: "first.js", label: "first", limitKb: 2 },
    { entry: "second.js", label: "second", limitKb: 2 }
  ])
  assert.equal(report.chunks.length, 4)
  assert.deepEqual(report.entries[0].chunks, [
    "effect.js",
    "first.js",
    "shared.js"
  ])
  assert.deepEqual(
    report.chunks.find((chunk) => chunk.file === "shared.js").entries,
    ["first", "second"]
  )
  for (const entry of report.entries) {
    assert.equal(
      entry.gzipBytes,
      entry.chunks.reduce(
        (sum, file) =>
          sum +
          gzipSync(files[file], { level: constants.Z_BEST_COMPRESSION }).length,
        0
      )
    )
    assert.equal(
      entry.rawBytes,
      entry.chunks.reduce(
        (sum, file) => sum + Buffer.byteLength(files[file]),
        0
      )
    )
  }
})

test("missing reachable chunks fail rather than silently undercounting a graph", (t) => {
  const root = fixture(t)
  writeFileSync(join(root, "entry.js"), 'export * from "./missing.js"')
  assert.throws(
    () =>
      measureEntryGraphs(root, [
        { entry: "entry.js", label: "entry", limitKb: 1 }
      ]),
    /ENOENT.*missing\.js/
  )
})

test("captures all ESM groups and attributes a changed hashed shared chunk to its consumers", async (t) => {
  const root = fixture(t)
  const outdir = join(root, "dist")
  const entries = ["first", "second", "isolated"].map((name) => ({
    entry: `${name}.js`,
    label: name,
    limitKb: 2
  }))
  writeFileSync(
    join(root, "first.js"),
    'export { value } from "./shared.js"; export const first = 1'
  )
  writeFileSync(
    join(root, "second.js"),
    'export { value } from "./shared.js"; export const second = 2'
  )
  writeFileSync(
    join(root, "isolated.js"),
    'export const other = "separate group"'
  )
  async function capture(value) {
    writeFileSync(
      join(root, "shared.js"),
      `export const value = ${JSON.stringify(value)}`
    )
    const attribution = {}
    for (const [group, entryPoints] of [
      ["primary", ["first.js", "second.js"]],
      ["isolated", ["isolated.js"]]
    ]) {
      await build({
        absWorkingDir: root,
        entryPoints,
        outdir,
        bundle: true,
        splitting: true,
        format: "esm",
        chunkNames: "c-[hash]",
        plugins: [entryGraphInputsPlugin(attribution, group)],
        logLevel: "silent"
      })
    }
    return measureEntryGraphs(outdir, entries, attribution)
  }
  const before = await capture("before")
  const after = await capture(
    "a larger shared value that should affect both public entries"
  )
  assert.equal(
    after.chunks.find((chunk) => chunk.file === "isolated.js").group,
    "isolated"
  )
  const comparison = compareEntryGraphs(before, after)
  const shared = comparison.chunks.find((chunk) =>
    chunk.current.startsWith("c-")
  )
  assert.ok(shared.previous.startsWith("c-"))
  assert.notEqual(shared.previous, shared.current)
  assert.deepEqual(shared.entries, ["first", "second"])
  assert.ok(
    shared.sources.find(
      ({ source, delta }) => source === "shared.js" && delta > 0
    )
  )
  assert.ok(!comparison.chunks.some((chunk) => chunk.current === "isolated.js"))
  for (const row of comparison.entries) {
    assert.equal(
      row.gzipDelta,
      after.entries.find((entry) => entry.label === row.label).gzipBytes -
        before.entries.find((entry) => entry.label === row.label).gzipBytes
    )
  }
  const detail = formatEntryGraphDetails(after, comparison, ["first"])
  assert.match(detail, /entries: first, second/)
  assert.match(detail, /shared\.js/)
  assert.match(detail, /before post-processing, not per-module gzip/)
  assert.deepEqual(compareEntryGraphs(after, after), {
    entries: [],
    chunks: []
  })
})

test("does not guess chunk identity after a split or merge changes its contributing modules", (t) => {
  const root = fixture(t)
  const entry = [{ entry: "entry.js", label: "entry", limitKb: 1 }]
  writeFileSync(join(root, "entry.js"), 'export * from "./old.js"')
  writeFileSync(join(root, "old.js"), "export const value = 1")
  const before = measureEntryGraphs(root, entry, {
    "old.js": { group: "primary", inputs: { "a.ts": 20 } }
  })
  writeFileSync(join(root, "entry.js"), 'export * from "./new.js"')
  writeFileSync(join(root, "new.js"), "export const value = 2")
  const after = measureEntryGraphs(root, entry, {
    "new.js": { group: "primary", inputs: { "a.ts": 10, "b.ts": 10 } }
  })
  const chunks = compareEntryGraphs(before, after).chunks
  assert.ok(
    chunks.some(
      (chunk) => chunk.previous === "old.js" && chunk.current === null
    )
  )
  assert.ok(
    chunks.some(
      (chunk) => chunk.previous === null && chunk.current === "new.js"
    )
  )
})

test("CLI writes nested failure evidence and keeps missing entries as a blocking failure", (t) => {
  const root = fixture(t)
  const destination = join(root, "reports", "failure.json")
  const result = spawnSync(
    process.execPath,
    [
      resolve("scripts/check-entry-graph-size.mjs"),
      "--dist",
      root,
      "--report",
      destination
    ],
    { encoding: "utf8" }
  )
  assert.equal(result.status, 1, result.stderr)
  const report = JSON.parse(readFileSync(destination, "utf8"))
  assert.ok(report.missing.some(({ label }) => label === "network"))
  assert.match(result.stderr, /missing network\.module\.min\.js/)
})

test("CLI preserves limits and failure evidence without inventing source deltas for older builds", (t) => {
  const root = fixture(t)
  const baseline = join(root, "baseline.json")
  const destination = join(root, "failure.json")
  const command = [
    resolve("scripts/check-entry-graph-size.mjs"),
    "--dist",
    root
  ]
  const run = (...args) =>
    spawnSync(process.execPath, [...command, ...args], { encoding: "utf8" })
  // Discover the gate's real entry catalog, then build a complete small graph.
  assert.equal(run("--report", baseline).status, 1)
  for (const { entry } of JSON.parse(readFileSync(baseline, "utf8")).missing) {
    writeFileSync(join(root, entry), "export const value = 1")
  }
  const small = run("--report", baseline)
  assert.equal(small.status, 0, small.stderr)
  writeFileSync(
    join(root, "network.module.min.js"),
    `export const value = ${JSON.stringify(Array.from({ length: 150000 }, (_, i) => i).join(" "))}`
  )
  const result = run("--compare", baseline, "--report", destination)
  assert.equal(result.status, 1, result.stderr)
  const report = JSON.parse(readFileSync(destination, "utf8"))
  const network = report.entries.find(({ label }) => label === "network")
  assert.ok(network.gzipBytes > network.limit)
  assert.deepEqual(report.missing, [])
  assert.match(result.stdout, /✗ network/)
  assert.match(result.stdout, /entries: network/)
  const change = report.comparison.chunks.find(
    ({ current }) => current === network.entry
  )
  assert.equal(change.inputsComparable, false)
  assert.deepEqual(change.sources, [])
  assert.match(result.stdout, /source delta unavailable/)
})
