import assert from "node:assert/strict"
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import { test } from "node:test"
import { build } from "esbuild"
import {
  shortenChunkExports,
  shortenChunkExportsPlugin,
  shortenBuiltEntryExports
} from "./shorten-chunk-exports.mjs"

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "semiotic-chunk-exports-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, "package.json"), '{"type":"module"}')
  return realpath(dir)
}

test("separately built private entries preserve public names, live bindings and singleton identity", async (t) => {
  const dir = await fixture(t)
  await writeFile(join(dir, "stores.js"), `
    let currentSelection = 0
    const contextIdentity = {}
    const updateSelection = () => ++currentSelection
    export { currentSelection, contextIdentity, updateSelection }
  `)
  await writeFile(join(dir, "chart.js"), `
    import { currentSelection, contextIdentity } from "./stores.js"
    const read = () => currentSelection
    export { read, contextIdentity }
  `)
  await writeFile(join(dir, "provider.js"), `
    export { updateSelection as select, contextIdentity } from "./stores.js"
  `)
  shortenBuiltEntryExports(dir, ["stores.js"])
  const chart = await import(pathToFileURL(join(dir, "chart.js")))
  const provider = await import(pathToFileURL(join(dir, "provider.js")))
  const stores = await import(pathToFileURL(join(dir, "stores.js")))
  assert.ok(Object.keys(stores).every((key) => key.length === 1))
  assert.deepEqual(Object.keys(chart), ["contextIdentity", "read"])
  assert.equal(chart.contextIdentity, provider.contextIdentity)
  assert.equal(chart.read(), 0)
  provider.select()
  assert.equal(chart.read(), 1)
})

test("private entries observed through namespaces retain their interface", async (t) => {
  const dir = await fixture(t)
  await writeFile(join(dir, "stores.js"), "const contextIdentity = {}; export { contextIdentity }")
  await writeFile(join(dir, "public.js"), 'export * as state from "./stores.js"')
  shortenBuiltEntryExports(dir, ["stores.js"])
  const api = await import(pathToFileURL(join(dir, "public.js")))
  assert.deepEqual(Object.keys(api.state), ["contextIdentity"])
  assert.throws(() => shortenBuiltEntryExports(dir, ["missing.js"]), /Missing private ESM entry/)
})

test("built private entries reuse short locals without colliding on duplicate bindings", async (t) => {
  const dir = await fixture(t)
  await writeFile(join(dir, "stores.js"), "const a = {}, b = {}; export { a as first, a as alias, b as second }")
  await writeFile(join(dir, "public.js"), 'export { first, alias, second } from "./stores.js"')
  shortenBuiltEntryExports(dir, ["stores.js"])
  const api = await import(pathToFileURL(join(dir, "public.js")))
  assert.deepEqual(Object.keys(api), ["alias", "first", "second"])
  assert.equal(api.first, api.alias)
  assert.notEqual(api.first, api.second)
  assert.match(await readFile(join(dir, "stores.js"), "utf8"), /export \{ a,/)
})

test("shortened chunk imports preserve public exports, live bindings, identity and lazy APIs", async (t) => {
  const dir = await fixture(t)
  const sources = {
    "shared.js": `
      export let sharedCounter = 1
      export const sharedIdentity = {}
      export function incrementCounter() { return ++sharedCounter }
    `,
    "first.js": `
      export { sharedCounter as value, incrementCounter as increment, sharedIdentity } from "./shared.js"
      export function load() { return import("./lazy.js") }
    `,
    "second.js": `export { sharedCounter, sharedIdentity } from "./shared.js"`,
    "lazy.js": `
      import { sharedCounter } from "./shared.js"
      export const readCurrentValue = () => sharedCounter
      export default "lazy default"
    `
  }
  await Promise.all(
    Object.entries(sources).map(([file, source]) =>
      writeFile(join(dir, file), source)
    )
  )
  const result = await build({
    absWorkingDir: dir,
    entryPoints: ["first.js", "second.js"],
    outdir: "dist",
    format: "esm",
    bundle: true,
    splitting: true,
    minifySyntax: true,
    minifyIdentifiers: false,
    metafile: true,
    write: false,
    plugins: [shortenChunkExportsPlugin()]
  })
  for (const file of result.outputFiles) {
    await mkdir(dirname(file.path), { recursive: true })
    await writeFile(file.path, file.contents)
  }
  const shared = Object.entries(result.metafile.outputs).find(
    ([, info]) => !info.entryPoint
  )
  assert.ok(shared)
  assert.ok(shared[1].exports.every((name) => name.length === 1))
  // Local names are deliberately left for the downstream chunk minifier.
  assert.match(await readFile(join(dir, shared[0]), "utf8"), /sharedCounter/)
  const first = await import(pathToFileURL(join(dir, "dist/first.js")))
  const second = await import(pathToFileURL(join(dir, "dist/second.js")))
  assert.deepEqual(Object.keys(first), [
    "increment",
    "load",
    "sharedIdentity",
    "value"
  ])
  assert.equal(first.sharedIdentity, second.sharedIdentity)
  assert.equal(first.value, 1)
  assert.equal(first.increment(), 2)
  assert.equal(first.value, 2)
  assert.equal(second.sharedCounter, 2)
  const lazy = await first.load()
  assert.deepEqual(Object.keys(lazy), ["default", "readCurrentValue"])
  assert.equal(lazy.readCurrentValue(), 2)
  assert.equal(lazy.default, "lazy default")
})

test("large shared interfaces keep every export distinct", async (t) => {
  const dir = await fixture(t)
  await writeFile(
    join(dir, "shared.js"),
    Array.from(
      { length: 120 },
      (_, i) => `export const descriptiveValue${i} = ${i}`
    ).join("\n")
  )
  for (const entry of ["first", "second"])
    await writeFile(join(dir, `${entry}.js`), 'export * from "./shared.js"')
  const result = await build({
    absWorkingDir: dir,
    entryPoints: ["first.js", "second.js"],
    outdir: "dist",
    format: "esm",
    bundle: true,
    splitting: true,
    metafile: true,
    write: false,
    plugins: [shortenChunkExportsPlugin()]
  })
  for (const file of result.outputFiles) {
    await mkdir(dirname(file.path), { recursive: true })
    await writeFile(file.path, file.contents)
  }
  for (const entry of ["first", "second"]) {
    const api = await import(pathToFileURL(join(dir, `dist/${entry}.js`)))
    assert.equal(Object.keys(api).length, 120)
    for (let i = 0; i < 120; i++) assert.equal(api[`descriptiveValue${i}`], i)
  }
})

for (const consumer of [
  'import * as observed from "./chunk.js"; export { observed }',
  'export * as observed from "./chunk.js"',
  'export * from "./chunk.js"',
  'export const load = () => import("./chunk.js")'
]) {
  test(`observable private namespace is preserved: ${consumer}`, async (t) => {
    const dir = await fixture(t)
    const sourceByFile = {
      "chunk.js": "const descriptiveValue = 7; export { descriptiveValue }",
      "entry.js": consumer,
      "named.js": 'export { descriptiveValue as publicValue } from "./chunk.js"'
    }
    const result = {
      outputFiles: Object.entries(sourceByFile).map(([file, text]) => ({
        path: join(dir, file),
        contents: new TextEncoder().encode(text),
        get text() {
          return new TextDecoder().decode(this.contents)
        }
      })),
      metafile: {
        outputs: Object.fromEntries(
          Object.keys(sourceByFile).map((file) => [
            file,
            {
              exports: ["descriptiveValue"],
              ...(file !== "chunk.js" && { entryPoint: file })
            }
          ])
        )
      }
    }
    shortenChunkExports(result, dir)
    for (const file of result.outputFiles)
      await writeFile(file.path, file.contents)
    assert.equal(result.outputFiles[0].text, sourceByFile["chunk.js"])
    const entry = await import(pathToFileURL(join(dir, "entry.js")))
    const observed = entry.load ? await entry.load() : (entry.observed ?? entry)
    assert.deepEqual(Object.keys(observed), ["descriptiveValue"])
    assert.equal(observed.descriptiveValue, 7)
    const named = await import(pathToFileURL(join(dir, "named.js")))
    assert.equal(named.publicValue, 7)
  })
}
