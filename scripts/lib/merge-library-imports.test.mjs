import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { test } from "node:test"
import { mergeLibraryImports } from "./merge-library-imports.mjs"
import { minifyLibraryChunk } from "./minify-library-chunk.mjs"
import { libraryTerserOptions as options } from "./library-minification-options.mjs"

test("merged imports preserve live bindings, namespaces, getters and module effects through minification", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "semiotic-imports-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await writeFile(
    join(dir, "runtime.mjs"),
    `
    export let value = 1
    export let reads = 0
    export const object = { get value() { reads++; return value } }
    export function increment() { value++ }
  `
  )
  await writeFile(
    join(dir, "effect.mjs"),
    `
    import { increment } from "./runtime.mjs"
    increment()
  `
  )
  const source = `
    "use client";
    import * as first from "./runtime.mjs"
    import { value as left, increment } from "./runtime.mjs"
    import "./effect.mjs"
    import * as second from "./runtime.mjs"
    import { value as right, reads } from "./runtime.mjs"
    export { increment, reads }
    export function namespaces() { return [first, second] }
    export function read() { return [left, right, first.object.value, second.object.value] }
    export const message = "process.env.NODE_ENV remains a runtime choice"
    export const production = () => process.env.NODE_ENV === "production"
  `
  const filename = join(dir, "merged.mjs")
  const merged = await mergeLibraryImports(source, filename)
  assert.match(merged, /^"use client";/)
  const result = await minifyLibraryChunk(merged, {
    format: "esm",
    filename,
    options,
    allowFunctionReduction: true
  })
  await writeFile(filename, result.code)
  const api = await import(pathToFileURL(filename))
  assert.equal(api.namespaces()[0], api.namespaces()[1])
  assert.deepEqual(api.read(), [2, 2, 2, 2])
  assert.equal(api.reads, 2)
  api.increment()
  assert.deepEqual(api.read(), [3, 3, 3, 3])
  assert.equal(api.reads, 4)
  assert.equal(api.production(), process.env.NODE_ENV === "production")
  assert.match(await readFile(filename, "utf8"), /process\.env\.NODE_ENV/)
})

test("import consolidation retains lazy-import bundler directives", async () => {
  const source = `
    import { value as first } from "external-runtime"
    import { value as second } from "external-runtime"
    export const read = () => first + second
    export const load = (path) => import(/* webpackIgnore: true */ /* @vite-ignore */ path)
  `
  const merged = await mergeLibraryImports(source, "/virtual/chunk.js")
  assert.match(merged, /webpackIgnore: true/)
  assert.match(merged, /@vite-ignore/)
  const result = await minifyLibraryChunk(merged, {
    format: "esm",
    filename: "/virtual/chunk.js",
    options
  })
  assert.match(result.code, /webpackIgnore: true/)
  assert.match(result.code, /@vite-ignore/)
})
