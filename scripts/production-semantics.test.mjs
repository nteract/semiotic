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

for (const entry of ["./recipes", "./recipes/core"]) {
  for (const target of publicTargets(entry)) {
    test(`${entry} ${target.conditions} bounds interval sampling and discloses omitted recipe data (#1505)`, () => {
      exercise(target, `
        import { renderToStaticMarkup } from "react-dom/server"
        for (const step of [0, -1, NaN, Infinity]) {
          assert.deepEqual(api.activeCountOverDomain([], { domain: [0, 1], step }), [])
        }
        assert.deepEqual(api.activeCountOverDomain([{ start: 0, end: 0.3 }], {
          domain: [0, 0.3], step: 0.1
        }), [0, 0.1, 0.2, 0.3].map(value => ({ value, count: 1 })))
        const ctx = {
          dimensions: { plot: { x: 0, y: 0, width: 400, height: 100 } },
          theme: { semantic: {}, categorical: [] }, resolveColor: () => "blue"
        }
        const lanes = api.intervalLanesLayout({ ...ctx,
          data: Array.from({ length: 10 }, (_, i) => ({ lane: String(i), start: 0, end: 1 })),
          config: { laneAccessor: "lane", startAccessor: "start", endAccessor: "end", domain: [0, 1] }
        })
        assert.equal(lanes.nodes.length, 10)
        for (const node of lanes.nodes) {
          assert.ok(node.h > 0)
          assert.ok(node.y >= Number(node.group) * 10)
          assert.ok(node.y + node.h <= (Number(node.group) + 1) * 10)
        }
        const bullet = api.bulletLayout({ ...ctx,
          data: Array.from({ length: 4 }, (_, i) => ({ metric: String(i), actual: 60, target: 80, ranges: [100] })),
          config: { categoryAccessor: "metric", valueAccessor: "actual", targetAccessor: "target", rangesAccessor: "ranges" }
        })
        assert.equal(bullet.nodes.filter(n => n.group === "actual").length, 1)
        assert.match(renderToStaticMarkup(bullet.overlays), /1 of 4 rows shown/)
        const waffle = api.waffleLayout({ ...ctx,
          data: [{ cat: "A", value: 100 }, { cat: "B", value: 0.001 }],
          config: { rows: 2, columns: 2, categoryAccessor: "cat", valueAccessor: "value" }
        })
        assert.equal(waffle.nodes.length, 4)
        assert.match(renderToStaticMarkup(waffle.overlays), /1 of 2 categories shown/)
      `)
    })
    test(`${entry} ${target.conditions} retains geographic cells and lazy region attributes`, () => {
      exercise(
        target,
        `
      const points = [
        { id: "city", name: "Corner City", kind: "city", lon: 0.5, lat: 0.5 },
        { id: "monument", name: "Middle Monument", kind: "monument", lon: 0, lat: 0 }
      ]
      const config = { center: { lon: 0, lat: 0 }, gridSize: 3 }
      const tiles = api.selectIsometricLandmarks(points, config)
      assert.equal(tiles[2].landmark.id, "city")
      assert.equal(tiles[4].landmark.id, "monument")
      assert.deepEqual(api.selectIsometricLandmarks([...points].reverse(), config), tiles)
      let calls = 0
      const attributes = context => {
        calls++
        return { bodyId: context.body.id, primitive: "spoofed" }
      }
      for (const [factory, primitive] of [
        ["membraneRegion", "membrane"], ["chargeGateRegion", "chargeGate"],
        ["routeSurfaceRegion", "routeSurface"], ["pressureFieldRegion", "pressureField"],
        ["capacitatedRegion", "capacitatedSensor"], ["portalRegion", "portal"],
        ["absorbRegion", "absorb"], ["forceFieldRegion", "forceField"]
      ]) {
        const options = { id: "gate", x: 50, y: 50, width: 80, height: 80, cost: 1, capacity: 2 }
        const before = calls
        const region = api[factory]({ ...options, attributes })
        assert.equal(calls, before)
        assert.equal(typeof region.attributes, "function")
        const resolved = region.attributes({ body: { id: "parcel" }, region, regionState: {} })
        assert.equal(resolved.primitive, primitive)
        assert.equal(resolved.bodyId, "parcel")
        assert.equal(calls, before + 1)
        assert.equal(api[factory]({ ...options, attributes: { primitive: "spoofed" } }).attributes.primitive, primitive)
      }
    `
      )
    })
  }
}

for (const entry of ["./server", "./server/node", "./server/edge"]) {
  for (const target of publicTargets(entry)) {
    test(`${entry} ${target.conditions} exports recipe omissions and small-lane geometry (#1505)`, () => {
      exercise(target, `
        const recipes = createRequire(import.meta.url)("./dist/semiotic-recipes.min.js")
        for (const [component, layout, data, layoutConfig, count, note] of [
          ["OrdinalCustomChart", recipes.bulletLayout,
            Array.from({ length: 4 }, (_, i) => ({ metric: String(i), actual: 60, target: 80, ranges: [100] })),
            { categoryAccessor: "metric", valueAccessor: "actual", targetAccessor: "target", rangesAccessor: "ranges" },
            9, "3 of 4 rows shown"],
          ["XYCustomChart", recipes.waffleLayout,
            [{ cat: "A", value: 100 }, { cat: "B", value: 0.001 }],
            { rows: 2, columns: 2, categoryAccessor: "cat", valueAccessor: "value" },
            4, "1 of 2 categories shown"],
          ["XYCustomChart", recipes.waffleLayout,
            [{ cat: "Empty", value: 0 }],
            { rows: 2, columns: 2, categoryAccessor: "cat", valueAccessor: "value" },
            0, "0 of 1 categories shown"],
          ["OrdinalCustomChart", recipes.bulletLayout,
            [{ metric: "Empty", actual: 0, target: 0, ranges: [] }],
            { categoryAccessor: "metric", valueAccessor: "actual", targetAccessor: "target", rangesAccessor: "ranges" },
            0, "0 of 1 rows shown"],
          ["OrdinalCustomChart", recipes.intervalLanesLayout,
            Array.from({ length: 20 }, (_, i) => ({ lane: String(i), start: 0, end: 1 })),
            { laneAccessor: "lane", startAccessor: "start", endAccessor: "end", domain: [0, 1] },
            20, "0.2"]
        ]) {
          let nodes
          const result = api.renderChartWithEvidence(component, {
            data, layoutConfig, width: 440, height: 220, margin: 20,
            categoryAccessor: layoutConfig.laneAccessor || "metric", valueAccessor: "actual",
            layout: ctx => { const result = layout(ctx); nodes = result.nodes; return result }
          })
          assert.equal(result.evidence.markCount, count)
          assert.equal(result.evidence.empty, count === 0)
          assert.ok(result.svg.includes(note))
          assert.doesNotMatch(result.svg, /NaN|Infinity/)
          for (const node of nodes) assert.ok(node.h > 0 && node.w > 0)
        }
      `)
    })
    test(`${entry} ${target.conditions} preserves recipe geometry and static callback boundaries`, () => {
      exercise(target, `
        const recipes = createRequire(import.meta.url)("./dist/semiotic-recipes.min.js")
        const points = [
          { id: "city", name: "Corner City", kind: "city", lon: 0.5, lat: 0.5 },
          { id: "monument", name: "Middle Monument", kind: "monument", lon: 0, lat: 0 }
        ]
        let nodes
        const { svg, evidence } = api.renderChartWithEvidence("GeoCustomChart", {
          points, width: 500, height: 280, margin: 20,
          layoutConfig: { center: { lon: 0, lat: 0 }, gridSize: 3 },
          layout: context => {
            const result = recipes.isometricLandmarkLayout(context)
            nodes = result.nodes
            return result
          }
        })
        const city = nodes.find(node => node.datum.id === "city")
        const monument = nodes.find(node => node.datum.id === "monument")
        assert.equal(city.datum.cellId, "tile-0-2")
        assert.equal(monument.datum.cellId, "tile-1-1")
        assert.equal(city.centroid[0] - monument.centroid[0], 80)
        assert.equal(city.centroid[1], monument.centroid[1])
        assert.equal(evidence.markCount, 9)
        assert.equal(evidence.empty, false)
        assert.ok(svg.includes(city.pathData))
        assert.ok(svg.includes(monument.pathData))
        assert.ok(svg.includes(">CORNER CITY</text>"))
        assert.doesNotMatch(svg, /NaN|Infinity/)

        // Static physics snapshots paint region/body geometry without running
        // live region-entry callbacks. Keep this boundary explicit.
        let calls = 0
        const region = recipes.chargeGateRegion({
          id: "gate", x: 100, y: 100, width: 80, height: 80,
          attributes: () => { calls++; return { parcel: "static" } }
        })
        const snapshot = api.renderChartWithEvidence("PhysicsCustomChart", {
          data: [{ id: "parcel" }], width: 300, height: 240,
          layout: () => ({
            bodies: [{ id: "parcel", x: 100, y: 100, shape: { type: "circle", radius: 5 } }],
            regionEffects: [region],
            config: { kernel: { gravity: { x: 0, y: 0 } }, settleStepLimit: 2 }
          })
        })
        assert.equal(snapshot.evidence.markCount, 1)
        assert.ok(snapshot.svg.includes('<circle'))
        assert.equal(calls, 0)
      `)
    })
    test(`${entry} ${target.conditions} keeps small plots finite and empty time snapshots deterministic`, () => {
      exercise(target, `
        for (const [component, props] of [
          ["LineChart", { data: [{ x: 0, y: 1 }, { x: 1, y: 2 }] }],
          ["BarChart", { data: [{ category: "A", value: 2 }] }],
          ["SankeyDiagram", { edges: [{ source: "a", target: "b", value: 2 }] }],
          ["ProportionalSymbolMap", { points: [{ lon: 0, lat: 0 }, { lon: 1, lat: 1 }] }]
        ]) {
          const { svg, evidence } = api.renderChartWithEvidence(component, {
            ...props, width: 30, height: 20, showLegend: false,
            margin: { top: 50, right: 50, bottom: 50, left: 50 }
          })
          assert.doesNotMatch(svg, /NaN|Infinity/)
          assert.doesNotMatch(svg, /(?:width|height|r|rx|ry)="-/)
          assert.equal(evidence.plot.width, 1)
          assert.equal(evidence.plot.height, 1)
          assert.ok(evidence.markCount > 0)
        }
        for (const component of ["LineChart", "RealtimeLineChart"]) {
          const props = { data: [], xScaleType: "time" }
          Date.now = () => Date.UTC(2025, 0, 1)
          const first = api.renderChartWithEvidence(component, props)
          Date.now = () => Date.UTC(2026, 8, 25)
          const second = api.renderChartWithEvidence(component, props)
          assert.equal(first.evidence.empty, true)
          assert.deepEqual(first.evidence.xDomain, [0, 86400000])
          assert.deepEqual(second, first)
        }
      `)
    })
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
