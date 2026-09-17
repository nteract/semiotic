/** Same-machine baseline/candidate SSR evidence, including the P1 reproduction. */
import { createRequire } from "node:module"
import { cpus, platform, arch } from "node:os"
import { resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

process.env.NODE_ENV ??= "production"
const require = createRequire(import.meta.url)
const { renderToStaticMarkup } = require("react-dom/server")
const React = require("react")
const baselineRoot = process.argv[2]
if (!baselineRoot)
  throw new Error(
    "Usage: node scripts/measure-direct-labels.mjs BASELINE_WORKTREE"
  )
const implementations = {
  baseline: require(resolve(baselineRoot, "dist/server.min.js")),
  candidate: require(resolve("dist/server.min.js"))
}
const config = (magnitude = 1, directLabel = true) => ({
  data: Array.from({ length: 6 }, (_, i) => [
    { x: 0, y: 0.2 * magnitude, series: `Series ${i}` },
    { x: 1, y: (0.93 + i * 0.01) * magnitude, series: `Series ${i}` }
  ]).flat(),
  width: 500,
  height: 280,
  xAccessor: "x",
  yAccessor: "y",
  lineBy: "series",
  colorBy: "series",
  directLabel,
  xExtent: [0, 1],
  yExtent: [0, magnitude],
  margin: { top: 20, bottom: 40, left: 50, right: 90 },
  showAxes: false
})
const result = {
  bundleHashes: Object.fromEntries(
    [
      ["baseline", baselineRoot],
      ["candidate", process.cwd()]
    ].map(([name, root]) => [
      name,
      createHash("sha256")
        .update(readFileSync(resolve(root, "dist/server.min.js")))
        .digest("hex")
    ])
  ),
  environment: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0].model
  },
  baselineRevision: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: baselineRoot,
    encoding: "utf8"
  }).trim(),
  method:
    "20 warmups; 100 alternating baseline/candidate renders per case. Milliseconds; p50 and p95. Production CJS bundles. No new gate adopted.",
  reproduction: {},
  timings: {}
}
for (const [name, api] of Object.entries(implementations)) {
  const root = name === "baseline" ? baselineRoot : process.cwd()
  const { LineChart } = require(resolve(root, "dist/xy.min.js"))
  result.reproduction[name] = [1e-6, 1, 1e9].map((magnitude) => {
    const rendered = api.renderChartWithEvidence("LineChart", config(magnitude))
    const annotationSvg = rendered.svg.slice(
      rendered.svg.indexOf('id="annotations"')
    )
    const texts = [
      ...annotationSvg.matchAll(/<text\b([^>]*)>(Series \d+)<\/text>/g)
    ].map(([, attributes, label]) => ({
      label,
      x: Number(attributes.match(/\bx="([^"]+)"/)?.[1]),
      y: Number(attributes.match(/\by="([^"]+)"/)?.[1])
    }))
    const liveSvg = renderToStaticMarkup(
      React.createElement(LineChart, config(magnitude))
    )
    const liveTexts = [
      ...liveSvg.matchAll(/<text\b([^>]*)>(Series \d+)<\/text>/g)
    ].map(([, attributes, label]) => ({
      label,
      x: Number(attributes.match(/\bx="([^"]+)"/)?.[1]),
      y: Number(attributes.match(/\by="([^"]+)"/)?.[1])
    }))
    return {
      magnitude,
      texts,
      liveTexts,
      evidenceBytes: Buffer.byteLength(JSON.stringify(rendered.evidence)),
      svgBytes: Buffer.byteLength(rendered.svg),
      layout: rendered.evidence.layout
    }
  })
}
for (const directLabel of [false, true]) {
  const props = config(1, directLabel)
  const timings = { baseline: [], candidate: [] }
  for (let i = 0; i < 120; i++) {
    for (const name of i % 2
      ? ["candidate", "baseline"]
      : ["baseline", "candidate"]) {
      const start = performance.now()
      implementations[name].renderChartWithEvidence("LineChart", props)
      if (i >= 20) timings[name].push(performance.now() - start)
    }
  }
  result.timings[directLabel ? "directLabels" : "unlabeled"] =
    Object.fromEntries(
      Object.entries(timings).map(([name, times]) => {
        times.sort((a, b) => a - b)
        return [name, { p50: times[50], p95: times[95] }]
      })
    )
}
console.log(JSON.stringify(result, null, 2))
