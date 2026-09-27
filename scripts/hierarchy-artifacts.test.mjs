import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { it } from "node:test"

function verify(server, charts, React, renderToStaticMarkup) {
  const data = {
    key: "root",
    color: "#555555",
    children: [
      {
        key: "A",
        color: "#666666",
        children: [
          { key: "Other", amount: 4, color: "#111111" },
          { key: "zero", amount: 0, color: "#222222" }
        ]
      },
      {
        key: "B",
        color: "#777777",
        children: [
          { key: "Other", amount: 2, color: "#333333" },
          { key: "Other__1", amount: 3, color: "#444444" }
        ]
      }
    ]
  }
  const geometry = (svg) =>
    (svg.match(/<(?:rect|circle)\b[^>]*>/g) ?? [])
      .filter((tag) => /fill="#[1-7]{6}"/.test(tag))
      .map((tag) => {
        const number = (name) =>
          Number(tag.match(new RegExp(` ${name}="([^"]+)"`))?.[1] ?? 0)
        return {
          color: tag.match(/fill="([^"]+)"/)[1],
          x: number("x") || number("cx"),
          y: number("y") || number("cy"),
          width: number("width"),
          height: number("height"),
          r: number("r")
        }
      })
      .sort((a, b) => a.color.localeCompare(b.color))
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
  for (const [component, layouts] of [
    ["Treemap", ["treemap"]],
    ["CirclePack", ["circlepack"]],
    ["TreeDiagram", ["tree", "cluster", "treemap", "circlepack", "partition"]]
  ]) {
    for (const layout of layouts) {
      for (const [colorScheme, expected] of [
        [["#555555", "#135790", "#246801"], ["#135790", "#246801"]],
        ["category10", ["#ff7f0e", "#2ca02c"]]
      ]) {
        const props = {
          layout,
          data: {
            name: "root", group: "root", children: [
              { name: "a", group: "a", value: 4 },
              { name: "b", group: "b", value: 2 }
            ]
          },
          colorBy: "group",
          colorScheme,
          showLabels: false,
          showLegend: false
        }
        const rendered = server.renderChartWithEvidence(component, props)
        assert.ok(rendered.evidence.markCount >= 2)
        for (const svg of [rendered.svg, renderToStaticMarkup(React.createElement(charts[component], props))]) {
          for (const color of expected) assert.equal(svg.match(new RegExp(`fill="${color}"`, "g"))?.length, 1)
        }
      }
      for (const callback of [false, true]) {
        const props = {
          data,
          layout,
          width: 420,
          height: 320,
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
          showLabels: false,
          showLegend: false,
          colorByDepth: false,
          nodeIdAccessor: callback ? (d) => d.key : "key",
          valueAccessor: callback ? (d) => d.amount : "amount",
          padding: 0,
          paddingTop: 0,
          frameProps: { padding: 0, nodeStyle: (d) => ({ fill: d.data.color }) }
        }
        const { svg, evidence } = server.renderChartWithEvidence(
          component,
          props
        )
        const hoc = renderToStaticMarkup(
          React.createElement(charts[component], props)
        )
        assert.doesNotMatch(svg + hoc, /NaN|Infinity/)
        const actual = geometry(svg)
        assert.deepEqual(geometry(hoc), actual)
        const isTree = layout === "tree" || layout === "cluster"
        assert.equal(actual.length, isTree ? 7 : 6)
        assert.equal(
          evidence.markCountByType[
            isTree || layout === "circlepack" ? "node:circle" : "node:rect"
          ],
          actual.length
        )
        if (!isTree) {
          assert.equal(
            actual.find((mark) => mark.color === "#222222"),
            undefined
          )
          const area = (color) => {
            const mark = actual.find((m) => m.color === color)
            return mark.r ? Math.PI * mark.r ** 2 : mark.width * mark.height
          }
          close(area("#111111") / area("#333333"), 2)
          close(area("#444444") / area("#333333"), 1.5)
          if (layout === "treemap")
            close(area("#111111") + area("#333333") + area("#444444"), 120000)
        }
        if (!isTree) {
          const empty = {
            ...props,
            data: { key: "zero", color: "#222222", amount: 0 }
          }
          const emptySVG = server.renderChartWithEvidence(component, empty)
          assert.equal(emptySVG.evidence.markCount, 0)
          assert.doesNotMatch(emptySVG.svg, /NaN|Infinity/)
          assert.equal(
            geometry(
              renderToStaticMarkup(
                React.createElement(charts[component], empty)
              )
            ).length,
            0
          )
        }
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
  it(`${entry} and network HOCs preserve hierarchy identity and area measures`, () => {
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
      verify(${load(entry)}, ${load(esm ? "network.module.min.js" : "network.min.js")}, React, renderToStaticMarkup)
      // React's browser server entry keeps its MessageChannel alive in Node.
      process.exit(0)
    `
      ],
      { encoding: "utf8", timeout: 20000 }
    )
    assert.equal(result.status, 0, result.stderr || String(result.error))
  })
}
