import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"
import { EXTERNAL_RUNTIME_PACKAGES } from "./lib/cold-consumer-measurement.mjs"

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
    test(`${entry} ${target.conditions} retains geo chrome and evidence for empty and populated scenes`, () => {
      exercise(
        target,
        `
        const { createElement } = await import("react")
        for (const points of [[], [{ lon: 5, lat: 5 }]]) {
          const { svg, evidence } = api.renderChartWithEvidence("GeoCustomChart", {
            points, width: 400, height: 300,
            title: "Geo title", description: "Geo description",
            annotations: [{ type: "label", x: 20, y: 30, label: "Pinned" }],
            layout: (ctx) => ({
              nodes: ctx.points.map(datum => ({
                type: "geoarea", pathData: "M0,0h10v10h-10Z",
                centroid: [5, 5], bounds: [[0, 0], [10, 10]], screenArea: 100,
                datum, style: { fill: "#125678" }
              })),
              overlays: createElement("text", { "data-layer": "overlay" }, "Layout overlay")
            }),
            frameProps: {
              projectionExtent: [[0, 0], [10, 10]],
              backgroundGraphics: createElement("text", { "data-layer": "background" }, "Behind"),
              foregroundGraphics: createElement("text", { "data-layer": "foreground" }, "Above"),
              legend: createElement("text", null, "Map legend")
            }
          })
          assert.equal(evidence.markCount, points.length)
          assert.equal(evidence.empty, points.length === 0)
          assert.equal(evidence.annotationCount, 1)
          assert.equal(evidence.legendItems, 1)
          assert.equal(evidence.ariaLabel, "Geo description")
          assert.equal((svg.match(/fill="#125678"/g) || []).length, points.length)
          assert.match(svg, new RegExp("<title[^>]*>Geo title</title>"))
          assert.match(svg, new RegExp("<desc[^>]*>Geo description</desc>"))
          assert.match(svg, /Map legend/)
          const layers = ['data-layer="background"', ...(points.length ? ['fill="#125678"'] : []),
            "Pinned", 'data-layer="foreground"', 'data-layer="overlay"']
          let previous = -1
          for (const layer of layers) {
            const position = svg.indexOf(layer)
            assert.ok(position > previous, layer + " must be painted in scene order")
            previous = position
          }
          assert.doesNotMatch(svg, /NaN|Infinity/)
        }
      `
      )
    })
  }
}

for (const entry of ["./ai", "./ai/core"]) {
  test(`${entry} suggestCharts consumer preserves temporal suggestions without network renderer initialization`, async () => {
    const filename = resolve(root, pkg.exports[entry].import)
    assert.ok(existsSync(filename), `${filename} is missing; run npm run dist:prod`)
    const result = await build({
      stdin: {
        contents: `export { suggestCharts } from ${JSON.stringify(filename)}`,
        resolveDir: root
      },
      bundle: true,
      write: false,
      minify: true,
      format: "cjs",
      platform: "browser",
      target: "es2022",
      external: EXTERNAL_RUNTIME_PACKAGES,
      logLevel: "silent"
    })
    const code = result.outputFiles[0].text
    // Network capability metadata must not keep the frame's React initializer
    // alive merely because both occupy the same published shared chunk.
    assert.doesNotMatch(code, /\.displayName\s*=\s*["']StreamNetworkFrame["']/)
    const program = `${code}
      const assert = require("node:assert/strict")
      for (const [startTime, endTime, domain] of [
        ["12", "14", [12, 14]],
        ["2026-01-01T12:00", "2026-01-01T18:00", ["2026-01-01T12:00:00.000Z", "2026-01-01T18:00:00.000Z"]]
      ]) {
        const suggestions = module.exports.suggestCharts([], {
          allow: ["ProcessSankey"], includeVariants: false,
          rawInput: {
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [{ source: "a", target: "b", value: 2, startTime, endTime }]
          }
        })
        assert.equal(suggestions.length, 1)
        assert.equal(suggestions[0].component, "ProcessSankey")
        assert.deepEqual(suggestions[0].props.domain, domain)
      }
      process.exit(0)
    `
    const execution = spawnSync(process.execPath, ["--input-type=commonjs"], {
      cwd: root,
      input: program,
      encoding: "utf8",
      timeout: 15000
    })
    assert.equal(execution.status, 0, execution.stderr || execution.error || execution.stdout)
  })
}
