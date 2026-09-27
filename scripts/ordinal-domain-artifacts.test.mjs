import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { it } from "node:test"

function verify(server, charts, React, renderToStaticMarkup) {
  const close = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`)
  const props = {
    width: 500,
    height: 260,
    margin: { top: 40, right: 20, bottom: 20, left: 40 },
    showLegend: false,
    showAxes: true,
    sort: false,
    categoryAccessor: "category",
    valueAccessor: "value",
    title: "Ordinal domains",
    description: "Aggregated values fit the plot.",
    frameProps: { extentPadding: 0, oSort: false, barPadding: 0 }
  }
  const attr = (tag, name) =>
    Number(tag.match(new RegExp(` ${name}="([^"]+)"`))?.[1])
  const marks = (svg) =>
    (svg.match(/<rect\b[^>]*>/g) ?? []).filter(
      (tag) => /fill="#139f6b"/.test(tag) && / x="/.test(tag)
    )
  const contained = (rects, width = 440, height = 200) => {
    assert.ok(rects.length > 0)
    for (const rect of rects) {
      const [x, y, w, h] = ["x", "y", "width", "height"].map((key) =>
        attr(rect, key)
      )
      assert.ok([x, y, w, h].every(Number.isFinite))
      assert.ok(x >= -1e-8 && y >= -1e-8 && w >= 0 && h >= 0)
      assert.ok(x + w <= width + 1e-8 && y + h <= height + 1e-8, rect)
    }
  }
  for (const orientation of ["horizontal", "vertical"]) {
    const chartProps = {
      ...props,
      orientation,
      stackBy: "series",
      normalize: true,
      colorScheme: { Positive: "#139f6b", Negative: "#139f6b" },
      data: [
        { category: "A", series: "Positive", value: 10 },
        { category: "A", series: "Positive", value: -4 },
        { category: "A", series: "Negative", value: -4 }
      ]
    }
    const { svg, evidence } = server.renderChartWithEvidence(
      "StackedBarChart",
      chartProps
    )
    assert.deepEqual(evidence.yDomain, [-0.4, 0.6])
    assert.equal(evidence.markCountByType.rect, 2)
    const hoc = renderToStaticMarkup(
      React.createElement(charts.StackedBarChart, chartProps)
    )
    for (const output of [svg, hoc]) {
      assert.doesNotMatch(output, /NaN|Infinity/)
      const rects = marks(output)
      assert.equal(rects.length, 2)
      contained(rects)
      const dimension = orientation === "vertical" ? "height" : "width"
      close(attr(rects[0], dimension) / attr(rects[1], dimension), 6 / 4)
    }
    const groupedProps = { ...chartProps, normalize: false, groupBy: "series" }
    const grouped = server.renderChartWithEvidence(
      "GroupedBarChart",
      groupedProps
    )
    assert.deepEqual(grouped.evidence.yDomain, [-4, 10])
    assert.equal(grouped.evidence.markCountByType.rect, 3)
    for (const output of [
      grouped.svg,
      renderToStaticMarkup(
        React.createElement(charts.GroupedBarChart, groupedProps)
      )
    ]) {
      const rects = marks(output)
      assert.equal(rects.length, 3)
      contained(rects)
      const dimension = orientation === "vertical" ? "height" : "width"
      close(attr(rects[0], dimension) / attr(rects[1], dimension), 10 / 4)
    }
    const columns = {
      ...props,
      orientation,
      color: "#139f6b",
      data: [10, 0, 30].map((weight, i) => ({
        category: String.fromCharCode(65 + i),
        weight,
        value: 10
      })),
      frameProps: { ...props.frameProps, dynamicColumnWidth: "weight" }
    }
    for (const output of [
      server.renderChartWithEvidence("BarChart", columns).svg,
      renderToStaticMarkup(React.createElement(charts.BarChart, columns))
    ]) {
      const rects = marks(output)
      assert.equal(rects.length, 3)
      contained(rects)
      const dimension = orientation === "vertical" ? "width" : "height"
      close(attr(rects[1], dimension), 0)
      close(attr(rects[2], dimension) / attr(rects[0], dimension), 3)
      const center = orientation === "vertical" ? 55 : 25
      assert.match(
        output,
        new RegExp(
          orientation === "vertical"
            ? `translate\\(${center},200\\)`
            : `translate\\(0,${center}\\)`
        )
      )
    }
  }
  const funnelProps = {
    ...props,
    categoryAccessor: undefined,
    stepAccessor: "category",
    orientation: "vertical",
    color: "#139f6b",
    data: [
      { category: "Visit", value: 60 },
      { category: "Visit", value: 60 },
      { category: "Signup", value: 20 }
    ]
  }
  const funnel = server.renderChartWithEvidence("FunnelChart", funnelProps)
  assert.deepEqual(funnel.evidence.yDomain, [0, 120])
  assert.equal(funnel.evidence.markCountByType.rect, 3)
  for (const output of [
    funnel.svg,
    renderToStaticMarkup(React.createElement(charts.FunnelChart, funnelProps))
  ]) {
    contained(marks(output))
    close(attr(marks(output)[0], "height"), 200)
  }
  const timeline = server.renderOrdinalToStaticSVG({
    chartType: "timeline",
    size: [500, 260],
    margin: props.margin,
    projection: "horizontal",
    data: [
      { category: "B", value: [20, 30] },
      { category: "C", value: [50, 40] }
    ],
    oAccessor: "category",
    rAccessor: "value",
    extentPadding: 0,
    pieceStyle: { fill: "#139f6b" },
    showAxes: true
  })
  contained(marks(timeline))
  assert.equal(marks(timeline).length, 2)
  for (const rect of marks(timeline)) close(attr(rect, "width"), 440 / 3)
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
  it(`${entry} and ordinal HOCs retain signed domains, funnel totals, interval endpoints, and zero widths`, () => {
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
      verify(${load(entry)}, ${load(esm ? "ordinal.module.min.js" : "ordinal.min.js")}, React, renderToStaticMarkup)
      process.exit(0)
    `
      ],
      { encoding: "utf8", timeout: 20000 }
    )
    assert.equal(result.status, 0, result.stderr || String(result.error))
  })
}
