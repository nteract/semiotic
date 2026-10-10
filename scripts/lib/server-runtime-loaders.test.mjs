import assert from "node:assert/strict"
import { test } from "node:test"
import { resolve } from "node:path"
import { transform } from "esbuild"
import { serverRuntimeLoadersPlugin } from "./server-runtime-loaders.mjs"

async function loadRegistry(name) {
  let load
  serverRuntimeLoadersPlugin().setup({
    onLoad(_filter, callback) {
      load = callback
    }
  })
  const result = await load({ path: resolve(`src/components/stream/${name}.ts`) })
  assert.doesNotMatch(result.contents, /\bimport\("\.\//)
  const { code } = await transform(result.contents, {
    loader: "ts",
    format: "esm"
  })
  return import(`data:text/javascript,${encodeURIComponent(code)}`)
}

test("server perspective engines require registration and retain registered identities", async () => {
  const registry = await loadRegistry("networkPerspectiveLoader")
  await assert.rejects(
    registry.loadNetworkPerspectiveEngine(),
    /synchronous engine registration/
  )
  await assert.rejects(
    registry.preloadNetworkPerspectiveExtras(),
    /synchronous engine registration/
  )
  const engine = { project: () => "projected" }
  const extras = { grid: () => "grid" }
  registry.provideNetworkPerspectiveEngine(engine)
  registry.provideNetworkPerspectiveExtras(extras)
  await registry.loadNetworkPerspectiveEngine()
  await registry.preloadNetworkPerspectiveExtras()
  assert.equal(registry.getNetworkPerspectiveEngine(), engine)
  assert.equal(registry.getNetworkPerspectiveExtras(), extras)
})

test("server XY transitions resolve the installed engine without an asynchronous import", async () => {
  const registry = await loadRegistry("pipelineTransitionEngine")
  await assert.rejects(
    registry.loadXYTransitionEngine(),
    /synchronous engine registration/
  )
  const engine = { advanceTransition: () => true }
  registry.provideXYTransitionEngine(engine)
  assert.equal(await registry.loadXYTransitionEngine(), engine)
  assert.equal(registry.getXYTransitionEngine(), engine)
})
