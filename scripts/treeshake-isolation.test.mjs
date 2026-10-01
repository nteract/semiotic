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
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
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
    gzipBytes: files.reduce((sum, text) => sum + gzipSync(text, { level: 9 }).length, 0)
  }
}

const cases = [
  {
    exportKey: "./network",
    symbol: "SankeyDiagram",
    absent: ["ForceDirectedGraph", "ChordDiagram", "TreeDiagram", "OrbitDiagram", "ProcessSankey", "StreamXYFrame"]
  },
  {
    exportKey: "./physics",
    symbol: "GaltonBoardChart",
    absent: ["StreamXYFrame", "PacketFlowChart", "CrucibleChart", "GauntletChart"]
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

for (const { exportKey, symbol, absent, maxGzipKiB, selfNamed = true } of cases) {
  test(`${exportKey === "." ? "semiotic" : `semiotic${exportKey.slice(1)}`} ${symbol} retains no unrelated charts`, async () => {
    const { code, gzipBytes } = await eagerBundle(exportKey, symbol)
    // Boolean asserts keep a failure message readable instead of dumping the bundle.
    if (selfNamed) assert.ok(new RegExp(`["']${symbol}["']`).test(code), `${symbol} itself should be named in its bundle`)
    const retained = absent.filter((name) => new RegExp(`["']${name}["']`).test(code))
    assert.deepEqual(retained, [], `${symbol} retained unrelated charts: ${retained.join(", ")}`)
    if (maxGzipKiB != null) {
      assert.ok(gzipBytes <= maxGzipKiB * 1024, `${symbol} initial load is ${(gzipBytes / 1024).toFixed(1)} KiB gzip`)
    }
  })
}
