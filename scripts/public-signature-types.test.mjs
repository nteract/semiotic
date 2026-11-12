import assert from "node:assert/strict"
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { after, before, describe, it } from "node:test"
import {
  inventorySignatureTypes,
  reviewSignatureTypes
} from "./lib/public-signature-types.ts"

describe("public signature type inventory", () => {
  let root, inventory
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  before(() => {
    root = mkdtempSync(join(tmpdir(), "semiotic-signatures-"))
    write(
      "package.json",
      JSON.stringify({
        name: "fixture",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
          "./layouts": {
            types: "./dist/layouts.d.ts",
            import: "./dist/layouts.js"
          }
        }
      })
    )
    write(
      "node_modules/external/package.json",
      JSON.stringify({ name: "external", types: "index.d.ts" })
    )
    write(
      "node_modules/external/index.d.ts",
      `
      interface ExternalDetail { secret: number }
      export interface Box<T> { value: T; detail: ExternalDetail }
    `
    )
    symlinkSync(
      resolve("node_modules/@types"),
      join(root, "node_modules/@types"),
      "dir"
    )
    write(
      "dist/types.d.ts",
      `
      export interface PrivateInput { value: number }
      export interface OtherInput { text: string }
      export interface Result { next?: Result; input: PrivateInput }
      export interface Constraint { id: string }
      export interface Tree<T extends Constraint = Constraint> { value: T; children: Tree<T>[] }
      export interface RenamedInput { x: number }
      export interface AliasedInput { y: number }
      export interface Generic<T extends Constraint = Constraint> { value: T }
      export interface Specialized<T> { value: T }
      export interface Cache { size: number }
      export interface PrivateMemberOnly { internal: boolean }
      export type Mode = "one" | "two"
    `
    )
    write(
      "dist/layouts.d.ts",
      `
      export { RenamedInput as LayoutInput } from "./types"
      export type { Tree } from "./types"
    `
    )
    write(
      "dist/index.d.ts",
      `
      import type { Box } from "external"
      import type { PrivateInput as Imported, OtherInput, Result, Tree, Constraint, AliasedInput, Generic, Specialized, Cache, PrivateMemberOnly, Mode } from "./types"
      export declare function overloaded(input: Imported, mode: Mode): Result
      export declare function overloaded(input: OtherInput): Box<Tree<Constraint>>
      export declare const callback: (fn: (data: Imported) => Result) => void
      export declare function imported(): import("./types").OtherInput
      export type PublicAlias = AliasedInput
      export type ChainedAlias = PublicAlias
      export type GenericAlias<T extends Constraint = Constraint> = Generic<T>
      export type StringOnly = Specialized<string>
      export * as layouts from "./layouts"
      export declare class Store<T extends Constraint> {
        constructor(input: T)
        cache: Cache
        private internal: PrivateMemberOnly
      }
    `
    )
    inventory = inventorySignatureTypes(root)
  })
  after(() => rmSync(root, { recursive: true, force: true }))
  const get = (name) => {
    const type = inventory.find((t) => t.name === name)
    assert.ok(type, `Missing type ${name}`)
    return type
  }

  it("follows overloads, callbacks, import types, primitive aliases and recursive generics", () => {
    for (const name of [
      "PrivateInput",
      "OtherInput",
      "Result",
      "Constraint",
      "Tree",
      "Mode"
    ])
      assert.equal(get(name).ownership, "package")
    assert.ok(
      get("PrivateInput").references.some((r) => r.from.endsWith("#overloaded"))
    )
    assert.ok(
      get("OtherInput").references.some((r) => r.from.endsWith("#imported"))
    )
    assert.ok(
      get("PrivateInput").references.some((r) => r.from.endsWith("#callback"))
    )
    assert.ok(get("Tree").references.some((r) => r.from.endsWith("#Tree")))
    assert.ok(
      get("Constraint").references.some((r) => r.from.endsWith("#Tree"))
    )
    assert.equal(inventory.filter((t) => t.name === "Result").length, 1)
    assert.deepEqual(get("PrivateInput").imports, [])
    assert.equal(
      inventory.some((t) => t.name === "PrivateMemberOnly"),
      false
    )
  })

  it("resolves renamed re-exports, transparent aliases and namespace imports", () => {
    assert.deepEqual(get("RenamedInput").imports, [
      { specifier: "fixture", name: "layouts.LayoutInput" },
      { specifier: "fixture/layouts", name: "LayoutInput" }
    ])
    assert.deepEqual(get("AliasedInput").imports, [
      { specifier: "fixture", name: "ChainedAlias" },
      { specifier: "fixture", name: "PublicAlias" }
    ])
    assert.deepEqual(get("Generic").imports, [
      { specifier: "fixture", name: "GenericAlias" }
    ])
    assert.deepEqual(get("Specialized").imports, [])
    assert.ok(
      get("Tree").imports.some(
        (p) => p.specifier === "fixture/layouts" && p.name === "Tree"
      )
    )
  })

  it("reports external types without traversing their implementation", () => {
    assert.equal(get("Box").ownership, "external")
    assert.equal(
      inventory.some((t) => t.name === "ExternalDetail"),
      false
    )
  })

  it("keeps unreviewed inputs informational and gives internal helpers explicit reasons", () => {
    const report = reviewSignatureTypes(inventory, [
      {
        id: get("Cache").id,
        classification: "internal",
        reason:
          "Store result details can be inferred; consumers do not implement this cache."
      }
    ])
    assert.deepEqual(report.failures, [])
    assert.equal(
      report.types.find((t) => t.name === "PrivateInput").classification,
      "unreviewed"
    )
    assert.equal(
      report.types.find((t) => t.name === "Cache").classification,
      "internal"
    )
    assert.equal(
      report.types.find((t) => t.name === "Box").classification,
      "external"
    )
  })

  it("blocks a lost reviewed public import even if another import path survives", () => {
    const review = {
      id: get("RenamedInput").id,
      classification: "author-facing",
      reason:
        "Layout authors import this input to write reusable layout callbacks.",
      requiredImports: [{ specifier: "fixture/layouts", name: "LayoutInput" }]
    }
    assert.deepEqual(reviewSignatureTypes(inventory, [review]).failures, [])
    const path = join(root, "dist/layouts.d.ts")
    const original = readFileSync(path, "utf8")
    try {
      writeFileSync(path, 'export type { Tree } from "./types"')
      write("dist/keep.d.ts", 'export type { RenamedInput } from "./types"')
      const index = readFileSync(join(root, "dist/index.d.ts"), "utf8")
      write("dist/index.d.ts", `${index}\nexport * from "./keep"`)
      try {
        const changed = inventorySignatureTypes(root)
        assert.equal(reviewSignatureTypes(changed, [review]).failures.length, 1)
      } finally {
        write("dist/index.d.ts", index)
      }
    } finally {
      writeFileSync(path, original)
    }
  })

  it("rejects duplicate, stale, external and unreasoned reviews", () => {
    const review = {
      id: get("Cache").id,
      classification: "internal",
      reason: "Implementation helper inferred through the Store result."
    }
    assert.throws(
      () => reviewSignatureTypes(inventory, [review, review]),
      /Duplicate review/
    )
    assert.throws(
      () => reviewSignatureTypes(inventory, [{ ...review, id: "gone" }]),
      /Stale/
    )
    assert.throws(
      () => reviewSignatureTypes(inventory, [{ ...review, id: get("Box").id }]),
      /external/
    )
    assert.throws(
      () => reviewSignatureTypes(inventory, [{ ...review, reason: "" }]),
      /reason/
    )
    assert.throws(
      () =>
        reviewSignatureTypes(inventory, [
          { ...review, classification: "author-facing" }
        ]),
      /requiredImports/
    )
  })

  it("fails explicitly for missing declarations and unresolved type references", () => {
    const path = join(root, "dist/layouts.d.ts")
    const original = readFileSync(path, "utf8")
    try {
      writeFileSync(
        path,
        "export declare function broken(input: Missing): void"
      )
      assert.throws(() => inventorySignatureTypes(root), /Unresolved type/)
      writeFileSync(path, 'export * from "./missing"')
      assert.throws(() => inventorySignatureTypes(root), /Unresolved module/)
      writeFileSync(path, "export interface Broken {")
      assert.throws(() => inventorySignatureTypes(root), /expected/)
      rmSync(path)
      assert.throws(() => inventorySignatureTypes(root), /Missing declarations/)
    } finally {
      writeFileSync(path, original)
    }
  })
})
