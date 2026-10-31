// Consumer-level tree-shaking gate for the published ESM chunks.
//
// Published chunks merge many modules, so a single module-scope side effect
// (a displayName assignment, top-level plugin registration, an un-annotated
// React factory) retains every chart that shares the chunk. Entry-graph
// budgets cannot see that: they measure whole facades. This test bundles one
// named import from dist the way an application would (esbuild, code
// splitting, tree shaking) and asserts that unrelated charts' component names
// — carried by their `withDisplayName(..., "Name")` initializers and
// `componentName` literals — are absent from the initial-load graph.
//
// Run after `npm run dist:prod`.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { gzipSync } from "node:zlib"
import { build } from "esbuild"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const EXTERNAL = [
  "react",
  "react-dom",
  "react-dom/*",
  "react/*",
  "matter-js",
  "@dimforge/rapier2d-compat",
  "world-atlas",
  "world-atlas/*",
  "roughjs",
  "@chenglou/pretext",
  "topojson-client"
]

test("multi-import size is independent of temporary consumer paths", () => {
  const measure = () => {
    const output = execFileSync(
      process.execPath,
      [join(root, "scripts/check-multi-import-size.mjs"), "--print", "--analyze"],
      { cwd: root, encoding: "utf8" }
    )
    const bytes = output.match(/gzip:.*\((\d+) bytes\)/)?.[1]
    assert.ok(bytes, "the consumer should report a gzip byte count")
    const files = output.match(/ {2}initial output files:\n([\s\S]*?) {2}largest retained inputs:/)?.[1]
    assert.ok(files, "the consumer should report its initial chunk filenames and sizes")
    return { gzipBytes: Number(bytes), files }
  }
  assert.deepEqual(measure(), measure())
})

async function eagerBundle(exportKey, symbol) {
  const filename = resolve(root, pkg.exports[exportKey].import)
  assert.ok(existsSync(filename), `${filename} is missing; run npm run dist:prod`)
  const result = await build({
    stdin: { contents: `export { ${symbol} } from ${JSON.stringify(filename)}`, resolveDir: root },
    absWorkingDir: root,
    bundle: true,
    splitting: true,
    format: "esm",
    outdir: join(root, "node_modules/.cache/semiotic-treeshake-isolation"),
    write: false,
    metafile: true,
    minify: true,
    platform: "browser",
    target: "es2022",
    external: EXTERNAL,
    logLevel: "silent"
  })
  const outputs = result.metafile.outputs
  const textByPath = new Map(result.outputFiles.map((file) => [file.path, file.text]))
  // Dynamically imported chunks are entry points too; select the consumer's.
  const entry = Object.keys(outputs).find((path) => outputs[path].entryPoint === "<stdin>")
  const eager = new Set()
  const pending = [entry]
  while (pending.length > 0) {
    const path = pending.pop()
    if (eager.has(path)) continue
    eager.add(path)
    for (const edge of outputs[path].imports) {
      if (!edge.external && edge.kind === "import-statement") pending.push(edge.path)
    }
  }
  const files = [...eager].map((path) => textByPath.get(resolve(root, path)) ?? "")
  return {
    code: files.join("\n"),
    deferredCode: Object.keys(outputs)
      .filter((path) => !eager.has(path))
      .map((path) => textByPath.get(resolve(root, path)) ?? "")
      .join("\n"),
    gzipBytes: files.reduce((sum, text) => sum + gzipSync(text, { level: 9 }).length, 0)
  }
}

test("word-cloud rasterization stays out of ordinary chart consumers", async () => {
  const engineMarker = "getSprite() expects a nonnegative padding"
  for (const [entry, symbol] of [[".", "LineChart"], ["./xy", "Scatterplot"], ["./ordinal", "BarChart"], ["./network", "SankeyDiagram"]]) {
    const bundled = await eagerBundle(entry, symbol)
    assert.ok(!bundled.code.includes(engineMarker), `${entry} eagerly retained d3-cloud`)
    assert.ok(!bundled.deferredCode.includes(engineMarker), `${entry} retained an unused raster chunk`)
  }
  const cloud = await eagerBundle("./wordcloud", "prepareWordCloudLayout")
  assert.ok((cloud.code + cloud.deferredCode).includes(engineMarker), "the dedicated entry must contain its raster engine")
})

test("the CommonJS word-cloud boundary bundles its ESM-only engine", async () => {
  const require = createRequire(import.meta.url)
  const cloud = require(resolve(root, pkg.exports["./wordcloud"].require))
  assert.equal(typeof cloud.WordCloud, "function")
  const empty = await cloud.prepareWordCloudLayout({ data: [] })
  assert.deepEqual(empty.words, [])
  assert.ok(Object.isFrozen(empty))
  await assert.rejects(cloud.prepareWordCloudLayout({ data: [{ text: "care", value: 1 }] }), { code: "CANVAS_REQUIRED" })
})

test("cold recipe facades do not load the physics simulation", () => {
  for (const key of ["./recipes", "./recipes/core"]) {
    const pending = [resolve(root, pkg.exports[key].import)]
    const seen = new Set()
    while (pending.length) {
      const file = pending.pop()
      if (seen.has(file)) continue
      seen.add(file)
      const code = readFileSync(file, "utf8")
      assert.ok(!/\bworkerSleepTimes\(/.test(code), `${key} retains the physics kernel through ${file}`)
      assert.ok(!/Physics worker motion frame requires/.test(code), `${key} retains the physics store through ${file}`)
      for (const pattern of [
        /from\s*["'](\.?\.?\/[^"']+\.js)["']/g,
        /import\s*["'](\.?\.?\/[^"']+\.js)["']/g
      ]) {
        for (const match of code.matchAll(pattern)) pending.push(resolve(dirname(file), match[1]))
      }
    }
  }
})

test("compositional recipe exports survive both package formats without retaining chart hosts", async () => {
  const require = createRequire(import.meta.url)
  for (const key of ["./recipes", "./recipes/core", "./recipes/react"]) {
    const esm = await import(resolve(root, pkg.exports[key].import))
    const cjs = require(resolve(root, pkg.exports[key].require))
    const symbols = key === "./recipes/react"
      ? ["CompositionalNavigator"]
      : ["prepareCompositionalGraph", "routeCompositionalGraph", "compositionalDagLayout"]
    for (const symbol of symbols) {
      assert.equal(typeof esm[symbol], "function", `${key} ESM: ${symbol}`)
      assert.equal(typeof cjs[symbol], "function", `${key} CJS: ${symbol}`)
    }
  }
  const solver = await eagerBundle("./recipes/core", "routeCompositionalGraph")
  assert.ok(!solver.code.includes("StreamNetworkFrame"))
  assert.ok(!solver.code.includes("CompositionalNavigator"))
  const navigator = await eagerBundle("./recipes/react", "CompositionalNavigator")
  assert.ok(!navigator.code.includes("CAPABILITY_COMPOUND_OPTIMIZE"))
  const waffle = await eagerBundle("./recipes/core", "waffleLayout")
  assert.ok(!waffle.code.includes("CAPABILITY_COMPOUND_OPTIMIZE"))
})

test("chart downloads stay outside the initial public entry graphs", async () => {
  for (const entry of [".", "./ai", "./utils", "./utils/core"]) {
    const { code, deferredCode } = await eagerBundle(entry, "exportChart")
    assert.match(code, /\bimport\(/, `${entry} must retain its deferred export implementation`)
    for (const message of ["No SVG element found in the container", "Failed to create PNG blob"]) {
      assert.ok(!code.includes(message), `${entry} must not eagerly load the chart download implementation`)
      assert.ok(deferredCode.includes(message), `${entry} must retain SVG and PNG downloads in a deferred chunk`)
    }
  }
})

const cases = [
  {
    exportKey: "./network",
    symbol: "SankeyDiagram",
    absent: ["ForceDirectedGraph", "ChordDiagram", "TreeDiagram", "OrbitDiagram", "ProcessSankey", "StreamXYFrame"]
  },
  {
    exportKey: "./physics",
    symbol: "GaltonBoardChart",
    absent: ["StreamXYFrame", "PacketFlowChart", "CrucibleChart", "GauntletChart"],
    // The shared pipeline store must not pull the EventDrop live runtime or the
    // emitter schedule into charts that never configure them.
    absentText: ["Changing live windows.size", "Missing emitter template", "Live EventDrop requires a finite event time"]
  },
  {
    exportKey: "./ordinal",
    symbol: "BarChart",
    absent: ["PieChart", "SwarmPlot", "ViolinPlot", "GaugeChart", "StreamXYFrame"]
  },
  {
    exportKey: "./xy",
    symbol: "Scatterplot",
    absent: ["LineChart", "Heatmap", "CandlestickChart", "WaterfallChart", "BubbleChart"]
  },
  {
    exportKey: ".",
    symbol: "LineChart",
    absent: ["BarChart", "SankeyDiagram", "StreamNetworkFrame", "StreamOrdinalFrame", "StreamGeoFrame"]
  },
  {
    exportKey: "./geo",
    symbol: "ChoroplethMap",
    absent: ["ProportionalSymbolMap", "FlowMap", "DistanceCartogram"]
  },
  {
    exportKey: "./ai",
    symbol: "suggestCharts",
    selfNamed: false,
    absent: ["StreamXYFrame", "StreamOrdinalFrame", "StreamNetworkFrame", "StreamGeoFrame"],
    // The chart-free recommender (about 40 KiB via semiotic/ai/core) must not
    // grow a chart runtime when imported from the HOC catalog entry.
    maxGzipKiB: 120
  }
]

for (const { exportKey, symbol, absent, absentText = [], maxGzipKiB, selfNamed = true } of cases) {
  test(`${exportKey === "." ? "semiotic" : `semiotic${exportKey.slice(1)}`} ${symbol} retains no unrelated charts`, async () => {
    const { code, gzipBytes } = await eagerBundle(exportKey, symbol)
    // Boolean asserts keep a failure message readable instead of dumping the bundle.
    if (selfNamed) assert.ok(new RegExp(`["']${symbol}["']`).test(code), `${symbol} itself should be named in its bundle`)
    const retained = absent.filter((name) => new RegExp(`["']${name}["']`).test(code))
    assert.deepEqual(retained, [], `${symbol} retained unrelated charts: ${retained.join(", ")}`)
    const retainedText = absentText.filter((text) => code.includes(text))
    assert.deepEqual(retainedText, [], `${symbol} retained unrelated runtime code: ${retainedText.join(", ")}`)
    if (maxGzipKiB != null) {
      assert.ok(gzipBytes <= maxGzipKiB * 1024, `${symbol} initial load is ${(gzipBytes / 1024).toFixed(1)} KiB gzip`)
    }
  })
}
