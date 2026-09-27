import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { it } from "node:test"

function verify(server, charts, React, renderToStaticMarkup) {
  for (const width of [500, 380]) {
    for (const xScaleType of ["linear", "log", "time"]) {
      const props = {
        width,
        height: 260,
        margin: { top: 40, bottom: 20, left: 40, right: 20 },
        data: [
          { id: "Alpha", x: 10, y: 6 },
          { id: "Beta", x: 40, y: 8 }
        ],
        xAccessor: "x",
        yAccessor: "y",
        xExtent: [1, 100],
        yExtent: [0, 10],
        xScaleType,
        color: "#139f6b",
        pointRadius: 7,
        showLegend: false,
        title: "Resized chart",
        description: "Marks agree with scales.",
        frameProps: { scalePadding: 0 }
      }
      const rendered = server.renderChartWithEvidence("Scatterplot", props)
      assert.equal(rendered.evidence.markCountByType.point, 2)
      assert.deepEqual(rendered.evidence.yDomain, [0, 10])
      for (const output of [
        rendered.svg,
        renderToStaticMarkup(React.createElement(charts.Scatterplot, props))
      ]) {
        assert.doesNotMatch(output, /NaN|Infinity/)
        const marks = (output.match(/<circle\b[^>]*>/g) ?? []).filter((tag) =>
          tag.includes('fill="#139f6b"')
        )
        assert.equal(marks.length, 2)
        const expectedX = (width - 60) * (xScaleType === "log" ? 0.5 : 9 / 99)
        const attr = (name) =>
          Number(marks[0].match(new RegExp(` ${name}="([^"]+)"`))?.[1])
        assert.ok(Math.abs(attr("cx") - expectedX) < 1e-6)
        assert.ok(Math.abs(attr("cy") - 80) < 1e-6)
        assert.equal(attr("r"), 7)
      }
    }
  }
}

for (const entry of [
  "server.module.min.js",
  "server.min.js",
  "semiotic-server-node.module.min.js",
  "semiotic-server-node.min.js",
  "semiotic-server-edge.module.min.js",
  "semiotic-server-edge-node.module.min.js",
  "semiotic-server-edge.min.js"
]) {
  it(`${entry} and XY HOCs match resized browser geometry`, () => {
    const esm = entry.includes(".module.")
    const load = (name) => {
      const url = new URL(`../dist/${name}`, import.meta.url)
      return esm
        ? `await import(${JSON.stringify(url.href)})`
        : `createRequire(import.meta.url)(${JSON.stringify(url.pathname)})`
    }
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from "node:assert/strict"
      import { createRequire } from "node:module"
      import React from "react"
      import { renderToStaticMarkup } from "react-dom/server"
      const verify = ${verify.toString()}
      verify(${load(entry)}, ${load(esm ? "xy.module.min.js" : "xy.min.js")}, React, renderToStaticMarkup)
      process.exit(0)
    `
      ],
      { encoding: "utf8", timeout: 20000 }
    )
    assert.equal(result.status, 0, result.stderr || String(result.error))
  })
}
