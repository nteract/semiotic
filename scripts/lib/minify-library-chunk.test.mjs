import assert from "node:assert/strict"
import { test } from "node:test"
import { gzipSync } from "node:zlib"
import { minify } from "terser"
import { build } from "esbuild"
import { minifyLibraryChunk } from "./minify-library-chunk.mjs"

const options = {
  compress: { hoist_funs: true, reduce_funcs: false, passes: 3 },
  format: { comments: /webpackIgnore|@vite-ignore/, preserve_annotations: true }
}

test("compressed ESM preserves exports, initialization, closures and live bindings", async () => {
  const source = `
    export let calls = 0
    export const initial = readValue(3)
    export function readValue(value) { calls++; return scale(value) }
    function scale(value) { return value * 7 }
    export function counter(start) { return () => ++start }
    export const sameFunction = readValue
    export class Item { constructor(value) { this.value = value } }
    export function makeItem(value) { return new Item(value) }
  `
  const result = await minifyLibraryChunk(source, {
    format: "esm",
    filename: "fixture.js",
    options
  })
  const reference = await minify(source, { module: true, ...options })
  assert.ok(
    gzipSync(result.code, { level: 9 }).length <=
      gzipSync(reference.code, { level: 9 }).length
  )
  const original = await import(
    `data:text/javascript,${encodeURIComponent(source)}`
  )
  const compact = await import(
    `data:text/javascript,${encodeURIComponent(result.code)}`
  )
  assert.deepEqual(Object.keys(compact), Object.keys(original))
  for (const module of [original, compact]) {
    assert.equal(module.initial, 21)
    assert.equal(module.calls, 1)
    assert.equal(module.readValue(4), 28)
    assert.equal(module.calls, 2)
    assert.equal(module.sameFunction, module.readValue)
    const counter = module.counter(5)
    assert.deepEqual([counter(), counter()], [6, 7])
    const item = module.makeItem(9)
    assert.ok(item instanceof module.Item)
    assert.equal(item.value, 9)
  }
})

test("preserves purity annotations for downstream named-import tree shaking", async () => {
  const source = `
    import { makeOptional } from "optional-host"
    export const optional = /* @__PURE__ */ makeOptional()
    export const required = 42
  `
  const compact = await minifyLibraryChunk(source, {
    format: "esm",
    filename: "library.js",
    options
  })
  const consumer = await build({
    stdin: { contents: 'export { required } from "library"' },
    bundle: true,
    write: false,
    format: "esm",
    minify: true,
    plugins: [
      {
        name: "fixture",
        setup(build) {
          build.onResolve(
            { filter: /^(library|optional-host)$/ },
            ({ path }) => ({ path, namespace: "fixture" })
          )
          build.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
            contents:
              path === "library"
                ? compact.code
                : 'export function makeOptional() { throw new Error("unused initializer ran") }'
          }))
        }
      }
    ]
  })
  const code = consumer.outputFiles[0].text
  assert.doesNotMatch(code, /makeOptional/)
  const exports = await import(
    `data:text/javascript,${encodeURIComponent(code)}`
  )
  assert.equal(exports.required, 42)
})
