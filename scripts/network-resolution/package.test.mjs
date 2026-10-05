import assert from "node:assert/strict"
import { createRequire } from "node:module"
import test from "node:test"
import { build } from "esbuild"

test("published resolution analysis stays browser-independent and outside existing atlas entries", async () => {
  const result = await build({
    stdin: { contents: 'import * as resolution from "semiotic/experimental/network-resolution"; globalThis.resolution = resolution', resolveDir: process.cwd() },
    bundle: true, write: false, metafile: true, platform: "browser", format: "esm"
  })
  const retained = Object.keys(result.metafile.inputs)
  assert.equal(retained.some((path) => /node_modules\/(react|react-dom)\//.test(path)), false)
  assert.equal(result.outputFiles[0].text.includes("StreamNetworkFrame"), false)
  const ordinary = await build({
    stdin: { contents: 'import * as atlas from "semiotic/atlas/core"; globalThis.atlas = atlas', resolveDir: process.cwd() },
    bundle: true, write: false, metafile: true, platform: "browser", format: "esm"
  })
  assert.equal(ordinary.outputFiles[0].text.includes("prepareNetworkResolution"), false)
})

test("ESM and CJS opt-in entry points expose the same analysis and visual APIs", async () => {
  const require = createRequire(import.meta.url)
  for (const subpath of ["semiotic/experimental/network-resolution", "semiotic/experimental/network-resolution/react"]) {
    const esm = await import(subpath), cjs = require(subpath)
    assert.deepEqual(Object.keys(esm).filter((key) => key !== "default").sort(), Object.keys(cjs).filter((key) => key !== "default").sort())
  }
})
