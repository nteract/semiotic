import assert from "node:assert/strict"
import { test } from "node:test"
import { gzipSync } from "node:zlib"
import { minify } from "terser"
import { build } from "esbuild"
import { minifyLibraryChunk } from "./minify-library-chunk.mjs"
import { libraryTerserOptions as options } from "./library-minification-options.mjs"

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

test("both production candidates preserve NaN comparisons, getters, and coercion order", async () => {
  const source = `
    export function guards(value, bound) {
      return [!(value > bound), !(value >= bound), !(value < bound), !(value <= bound)]
    }
    export function readGetter(object) { object.value; return 1 }
    export function orderedCoercion(a, b) { return !(a > b) }
  `
  const load = (code) =>
    import(`data:text/javascript,${encodeURIComponent(code)}`)
  const original = await load(source)
  const candidates = await Promise.all(
    [true, false].map((hoist_funs) =>
      minify(source, {
        module: true,
        ...options,
        compress: { ...options.compress, hoist_funs }
      })
    )
  )
  candidates.push(
    await minifyLibraryChunk(source, {
      format: "esm",
      filename: "semantics.js",
      options
    })
  )
  for (const candidate of candidates) {
    const compact = await load(candidate.code)
    for (const [value, bound] of [
      [1, NaN],
      [NaN, 1],
      [1, "abc"],
      [1, Infinity],
      [-Infinity, 1],
      [-0, 0]
    ]) {
      assert.deepEqual(
        compact.guards(value, bound),
        original.guards(value, bound)
      )
    }
    let calls = 0
    compact.readGetter({
      get value() {
        calls++
        return 42
      }
    })
    assert.equal(calls, 1, "a public datum getter is observable")
    const order = []
    const first = {
      valueOf() {
        order.push("first")
        return NaN
      }
    }
    const second = {
      valueOf() {
        order.push("second")
        return 1
      }
    }
    assert.equal(compact.orderedCoercion(first, second), true)
    assert.deepEqual(order, ["first", "second"])
  }
})

test("both production candidates preserve matchesThreshold source semantics", async () => {
  const result = await build({
    entryPoints: ["src/components/charts/shared/styleRules.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node"
  })
  const source = result.outputFiles[0].text
  const load = (code) =>
    import(`data:text/javascript,${encodeURIComponent(code)}`)
  const original = await load(source)
  const candidates = await Promise.all(
    [true, false].map((hoist_funs) =>
      minify(source, {
        module: true,
        ...options,
        compress: { ...options.compress, hoist_funs }
      })
    )
  )
  candidates.push(
    await minifyLibraryChunk(source, {
      format: "esm",
      filename: "thresholds.js",
      options
    })
  )
  const thresholds = [
    { gt: NaN },
    { gt: "abc" },
    { gte: NaN },
    { lt: NaN },
    { lte: NaN },
    { within: [0, NaN] },
    { outside: [NaN, NaN] },
    { gt: 0 },
    { within: [0, 2] }
  ]
  for (const candidate of candidates) {
    const compact = await load(candidate.code)
    for (const threshold of thresholds) {
      const rule = { field: "v", ...threshold }
      assert.equal(
        compact.matchesThreshold(rule, { v: 1 }, {}),
        original.matchesThreshold(rule, { v: 1 }, {})
      )
    }
  }
})
