import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { it } from "node:test"

const entries = [
  "server.module.min.js",
  "server.min.js",
  "semiotic-server-node.module.min.js",
  "semiotic-server-node.min.js",
  "semiotic-server-edge.module.min.js",
  "semiotic-server-edge-node.module.min.js",
  "semiotic-server-edge.min.js"
]
function verify({ renderChartWithEvidence }) {
  const epoch = Date.UTC(2026, 0, 1),
    day = 86400000
  const close = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`)

  const props = {
    data: Array.from({ length: 5 }, (_, i) => ({
      x: new Date(epoch + i * day),
      y: 2 * i * i + 3 * i + 4
    })),
    xAccessor: "x",
    yAccessor: "y",
    xScaleType: "time",
    width: 400,
    height: 240,
    xExtent: [epoch, epoch + 6 * day],
    yExtent: [0, 100],
    title: "Quadratic forecast",
    description: "Forecast continues the fitted quadratic."
  }
  const { svg, evidence } = renderChartWithEvidence("LineChart", {
    ...props,
    annotations: [
      { type: "trend", method: "polynomial" },
      { type: "forecast", method: "polynomial", steps: 2 }
    ]
  })
  assert.equal(evidence.empty, false)
  assert.ok(evidence.markCount > 0)
  assert.equal(evidence.annotationCount, 2)
  assert.equal(evidence.unrenderedAnnotationCount, 0)
  assert.doesNotMatch(svg, /NaN|Infinity/)
  const lines = [...svg.matchAll(/<polyline[^>]*points="([^"]+)"/g)].map(
    (match) => match[1].split(" ").map((point) => point.split(",").map(Number))
  )
  assert.equal(lines.length, 2)
  assert.equal(lines[0].length, 5)
  assert.equal(lines[1].length, 3)
  for (const [i, [x, y]] of lines[1].entries()) {
    close(x, (evidence.plot.width * (i + 4)) / 6)
    close(y, evidence.plot.height * (1 - [48, 69, 94][i] / 100))
  }
  const grouped = renderChartWithEvidence("LineChart", {
    ...props,
    data: Array.from({ length: 5 }, (_, x) => [
      { x, y: 10 + 2 * x, series: "up" },
      { x, y: 100 - 3 * x, series: "down" }
    ]).flat(),
    xScaleType: "linear",
    xExtent: [0, 6],
    lineBy: "series",
    forecast: { trainEnd: 3, steps: 2, label: "Independent envelope" }
  })
  assert.equal(grouped.evidence.annotationCount, 3)
  assert.equal(grouped.evidence.unrenderedAnnotationCount, 0)
  assert.equal(grouped.svg.match(/Independent envelope/g)?.length, 2)
  assert.doesNotMatch(grouped.svg, /NaN|Infinity/)
  for (const orientation of ["vertical", "horizontal"]) {
    for (const callback of [false, true]) {
      for (const method of ["linear", "polynomial", "loess"]) {
        const result = renderChartWithEvidence("BarChart", {
          data: [
            { region: "A", amount: 20 },
            { region: "B", amount: 10 },
            { region: "C", amount: 30 }
          ],
          categoryAccessor: callback ? (d) => d.region : "region",
          valueAccessor: callback ? (d) => d.amount : "amount",
          orientation,
          sort: "desc",
          valueExtent: [0, 40],
          regression: { method, bandwidth: 1 },
          width: 400,
          height: 240,
          margin: { left: 0, right: 0, top: 0, bottom: 0 },
          showAxes: false,
          showLegend: false,
          barPadding: 0
        })
        assert.equal(result.evidence.markCount, 3)
        assert.equal(result.evidence.unrenderedAnnotationCount, 0)
        assert.doesNotMatch(result.svg, /NaN|Infinity/)
        const points = result.svg.match(/<polyline[^>]*points="([^"]+)"/)[1]
          .split(" ").map((point) => point.split(",").map(Number))
        assert.equal(points.length, 3)
        for (const [i, [x, y]] of points.entries()) {
          const amount = 30 - 10 * i
          close(x, orientation === "horizontal" ? 400 * amount / 40 : 400 * (i + 0.5) / 3)
          close(y, orientation === "horizontal" ? 240 * (i + 0.5) / 3 : 240 * (1 - amount / 40))
        }
      }
    }
  }
}

for (const entry of entries) {
  it(`${entry} renders full-precision trends, polynomial forecasts, and separate group envelopes`, () => {
    const url = new URL(`../dist/${entry}`, import.meta.url)
    const load = entry.includes(".module.")
      ? `await import(${JSON.stringify(url.href)})`
      : `createRequire(import.meta.url)(${JSON.stringify(url.pathname)})`
    // Browser React renderers keep MessagePorts alive in Node. Isolate each
    // artifact so those handles do not retain the test runner after assertions.
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from "node:assert/strict"
      import { createRequire } from "node:module"
      const runtime = ${load}
      const verify = ${verify.toString()}
      verify(runtime)
      process.exit(0)
    `
      ],
      { encoding: "utf8", timeout: 20000 }
    )
    assert.equal(result.status, 0, result.stderr || String(result.error))
  })
}
