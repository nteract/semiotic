import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { it } from "node:test"

function verify(data, experimental, server) {
  const rows = [
    { c: "A", g: "first", n: 2 },
    { c: "A", g: "first", n: null },
    { c: "A", g: "second", n: 4 }
  ]
  const encoding = {
    x: { field: "c", type: "nominal" },
    y: { field: "n", type: "quantitative", aggregate: "mean" },
    color: { field: "g", type: "nominal" }
  }
  const configs = [
    data.fromVegaLite({ mark: "bar", data: { values: rows }, encoding }),
    experimental.unstable_fromFlintChart({
      data: { values: rows },
      chart_spec: { chartType: "stackedBar", encodings: encoding }
    })
  ]
  assert.deepEqual(
    data.rollup(rows, { groupBy: ["c", "g"], value: "n", agg: "mean" }),
    [
      { c: "A", g: "first", value: 2 },
      { c: "A", g: "second", value: 4 }
    ]
  )
  assert.deepEqual(
    data.rollup(
      [
        { value: 2, n: 4 },
        { value: "2", n: null }
      ],
      {
        groupBy: "value",
        value: "n",
        outputField: "total"
      }
    ),
    [
      { value: 2, total: 4 },
      { value: "2", total: null }
    ]
  )
  const shared = {
    width: 400,
    height: 240,
    margin: { left: 20, right: 20, top: 40, bottom: 20 },
    valueExtent: [0, 10],
    showLegend: false,
    title: "Observed aggregates",
    description: "Missing observations are excluded and series remain separate."
  }
  const attr = (rect, key) =>
    Number(rect.match(new RegExp(` ${key}="([^"]+)"`))[1])
  for (const config of configs) {
    assert.deepEqual(config.props.data, [
      { c: "A", g: "first", value: 2 },
      { c: "A", g: "second", value: 4 }
    ])
    const { evidence, svg } = server.renderChartWithEvidence(config.component, {
      ...config.props,
      ...shared,
      colorScheme: { first: "#12ab34", second: "#bc3456" }
    })
    assert.equal(evidence.empty, false)
    assert.equal(evidence.markCountByType.rect, 2)
    assert.deepEqual(evidence.yDomain, [0, 10])
    assert.doesNotMatch(svg, /NaN|Infinity/)
    const rects = svg.match(/<rect[^>]+>/g)
    assert.equal(rects.length, 2)
    for (const [index, value] of [2, 4].entries()) {
      assert.equal(
        attr(rects[index], "height"),
        (evidence.plot.height * value) / 10
      )
    }
    assert.match(rects[0], /fill="#12ab34"/)
    assert.match(rects[1], /fill="#bc3456"/)
  }
  const observations = [1, 1, 1, 1, 2, 9].map((n) => ({ n }))
  const spec = experimental.unstable_toVegaLite({
    component: "Histogram",
    version: "1",
    props: {
      data: observations,
      valueAccessor: "n",
      bins: 2
    }
  })
  const imported = experimental.unstable_fromVegaLiteResult(spec)
  assert.equal(imported.status, "success")
  assert.deepEqual(imported.config.props.data, observations)
  const { evidence, svg } = server.renderChartWithEvidence("Histogram", {
    ...imported.config.props,
    ...shared
  })
  assert.equal(evidence.markCountByType.rect, 2)
  const rects = svg.match(/<rect[^>]+>/g)
  assert.equal(rects.length, 2)
  assert.ok(
    Math.abs(attr(rects[0], "height") / attr(rects[1], "height") - 5) < 1e-10
  )
}

const servers = ["server", "semiotic-server-node", "semiotic-server-edge"]
for (const format of ["esm", "cjs"]) {
  it(`${format} root and AI exports retain typed series aggregates`, () => {
    for (const entry of ["semiotic", "semiotic-ai"]) {
      const url = new URL(`../dist/${entry}${format === "esm" ? ".module" : ""}.min.js`, import.meta.url)
      const load = format === "esm" ? `await import(${JSON.stringify(url.href)})` : `createRequire(import.meta.url)(${JSON.stringify(url.pathname)})`
      const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
        import assert from "node:assert/strict"
        import { createRequire } from "node:module"
        const { fromVegaLite } = ${load}
        const config = fromVegaLite({ mark: "line", data: { values: [
          { x: 2, g: "A", n: null }, { x: 2, g: "A", n: 4 }, { x: 2, g: "B", n: 8 }
        ] }, encoding: { x: { field: "x" }, y: { field: "n", aggregate: "mean" }, color: { field: "g" } } })
        assert.deepEqual(config.props.data, [{ x: 2, g: "A", value: 4 }, { x: 2, g: "B", value: 8 }])
        process.exit(0)
      `], { encoding: "utf8", timeout: 20000 })
      assert.equal(result.status, 0, result.stderr || String(result.error))
    }
  })
  for (const entry of servers) {
    it(`${format} data and experimental adapters retain rendered aggregate and histogram semantics through ${entry}`, () => {
      const load = (name) => {
        const url = new URL(
          `../dist/${name}${format === "esm" ? ".module" : ""}.min.js`,
          import.meta.url
        )
        return format === "esm"
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
        const data = ${load("semiotic-data")}
        const experimental = ${load("semiotic-experimental")}
        const server = ${load(entry)}
        const verify = ${verify.toString()}
        verify(data, experimental, server)
        process.exit(0)
      `
        ],
        { encoding: "utf8", timeout: 20000 }
      )
      assert.equal(result.status, 0, result.stderr || String(result.error))
    })
  }
}
