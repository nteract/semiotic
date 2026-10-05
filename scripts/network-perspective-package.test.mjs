import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { test } from "node:test"
import * as React from "react"
import { build as installedVite } from "vite"
import { semioticVite } from "../dist/semiotic-vite.module.min.js"

const build = process.env.SEMIOTIC_TEST_VITE
  ? (await import(pathToFileURL(process.env.SEMIOTIC_TEST_VITE).href)).build
  : installedVite

async function consumer(source, plugins = []) {
  const entry = resolve("network-perspective-consumer.js")
  const warnings = []
  const result = await build({
    configFile: false,
    logLevel: "silent",
    plugins: [
      {
        name: "consumer-fixture",
        resolveId: (id) => (id === entry ? id : null),
        load: (id) => (id === entry ? source : null)
      },
      ...plugins
    ],
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ["es"] },
      rollupOptions: {
        external: [
          /^react(?:-dom)?(?:\/|$)/,
          /^node:/,
          "sharp",
          "jsdom",
          "gifenc"
        ],
        onwarn: (warning) => warnings.push(warning)
      }
    }
  })
  assert.deepEqual(
    warnings.filter((w) => w.code === "INVALID_ANNOTATION"),
    [],
    "consumer retains valid purity hints"
  )
  return [result].flat().flatMap((output) => output.output)
}

test("perspective-only consumer uses no workers", async () => {
  const output = await consumer(
    'export { NetworkPerspectiveGround, resolveNetworkPerspective } from "semiotic/network/perspective/core"'
  )
  assert.ok(
    output.some(
      (o) => o.type === "chunk" && o.code.includes("NetworkPerspectiveGround")
    )
  )
  assert.deepEqual(
    output.filter((o) => /Worker/.test(o.fileName)),
    []
  )
})

test("Vite plugin removes worker assets from chart-family and SSR-only consumers", async () => {
  for (const source of [
    'export { NetworkPerspectiveGround, resolveNetworkPerspective } from "semiotic/network"',
    'export { renderChart } from "semiotic/server"; export { lineageDagLayout, transitDiagramLayout } from "semiotic/recipes"'
  ]) {
    const output = await consumer(source, [semioticVite()])
    assert.deepEqual(
      output.filter((o) => /Worker/.test(o.fileName)),
      []
    )
  }
})

test("Vite plugin preserves worker URLs when the consumer uses workers", async () => {
  const source =
    'export { ProcessSankey, ForceDirectedGraph } from "semiotic/network"'
  const original = await consumer(source)
  const cleaned = await consumer(source, [semioticVite()])
  const names = (outputs) =>
    outputs
      .filter((o) =>
        /(?:forceLayout|processSankeyLayout)Worker/.test(o.fileName)
      )
      .map((o) => o.fileName)
      .sort()
  assert.ok(names(original).length >= 2)
  assert.deepEqual(names(cleaned), names(original))
})

test("ESM and CommonJS recipes use the public placement component identities", async () => {
  const require = createRequire(import.meta.url)
  for (const [network, recipes, kit] of [
    [
      await import("../dist/network.module.min.js"),
      await import("../dist/semiotic-recipes.module.min.js"),
      await import("../dist/semiotic-network-perspective-core.module.min.js")
    ],
    [
      require("../dist/network.min.js"),
      require("../dist/semiotic-recipes.min.js"),
      require("../dist/semiotic-network-perspective-core.min.js")
    ]
  ]) {
    assert.equal(network.NetworkPerspectiveGround, kit.NetworkPerspectiveGround)
    assert.equal(
      network.NetworkPerspectiveBillboard,
      kit.NetworkPerspectiveBillboard
    )
    const result = recipes.lineageDagLayout({
      nodes: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 1, y: 0 }
      ],
      edges: [{ source: "a", target: "b" }],
      config: { lod: "full" },
      dimensions: {
        width: 900,
        height: 500,
        plot: { x: 0, y: 0, width: 900, height: 500 }
      },
      theme: { semantic: {}, categorical: ["#468"] },
      resolveColor: () => "#468"
    })
    const types = new Set()
    const visit = (content) =>
      React.Children.forEach(content, (node) => {
        if (!React.isValidElement(node)) return
        types.add(node.type)
        visit(node.props.children)
      })
    visit(result.overlays)
    assert.ok(types.has(network.NetworkPerspectiveGround))
    assert.ok(types.has(network.NetworkPerspectiveBillboard))
  }
})
