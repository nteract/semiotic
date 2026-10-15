import assert from "node:assert/strict"
import { test } from "node:test"
import { build } from "esbuild"
import { restoreModuleInitializers } from "./restore-module-initializers.mjs"
import { chunkLoadEffect } from "./strip-pure-bare-imports.mjs"

const load = (code) =>
  import(`data:text/javascript,${encodeURIComponent(code)}`)

test("preserves var hoisting, getter order, closures and exported live bindings", async () => {
  const code = `
    var first, second, unused
    export const before = first
    export const calls = []
    const datum = { get value() { calls.push("getter"); return 7 } }
    first = datum.value, second = first + datum.value
    export function update() { first = 42 }
    export { first, second, unused }
  `
  const restored = restoreModuleInitializers(code)
  for (const api of await Promise.all([load(code), load(restored)])) {
    assert.equal(api.before, undefined)
    assert.equal(api.unused, undefined)
    assert.equal(api.first, 7)
    assert.equal(api.second, 14)
    assert.deepEqual(api.calls, ["getter", "getter"])
    api.update()
    assert.equal(api.first, 42)
  }
})

test("restores consumer tree shaking of annotated module factories", async () => {
  const code = `
    import { makeOptional } from "optional-host"
    var optional, required
    optional = /* @__PURE__ */ makeOptional(), required = 42
    export { optional, required }
  `
  const restored = restoreModuleInitializers(code)
  assert.equal(chunkLoadEffect(restored), null)
  const result = await build({
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
                ? restored
                : 'export function makeOptional() { throw new Error("unused factory ran") }'
          }))
        }
      }
    ]
  })
  assert.doesNotMatch(result.outputFiles[0].text, /unused factory/)
  assert.equal((await load(result.outputFiles[0].text)).required, 42)
})

test("leaves lexical bindings, inline exports and mixed observable statements intact", () => {
  const code =
    "let live;live=1;export var published;published=2;var other;window.value=other=3;other=4,console.log(other);"
  assert.equal(restoreModuleInitializers(code), code)
})

test("retains initialized declarations and nested assignments", async () => {
  const code =
    "var first=7,second;second=first;export function update(){first=second=0}export{first,second};"
  const restored = restoreModuleInitializers(code)
  for (const api of await Promise.all([load(code), load(restored)])) {
    assert.equal(api.first, 7)
    assert.equal(api.second, 7)
    api.update()
    assert.equal(api.first, 0)
    assert.equal(api.second, 0)
  }
})
