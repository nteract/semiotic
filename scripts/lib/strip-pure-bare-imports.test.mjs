import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { chunkLoadEffect, stripPureBareChunkImports } from "./strip-pure-bare-imports.mjs"

describe("chunkLoadEffect", () => {
  it("treats declarations, pure calls, and inert builtins as effect-free", () => {
    assert.equal(chunkLoadEffect([
      'import{a as b}from"./c-A.min.js";',
      "var x=1,y={k:[1,2]},z=/* @__PURE__ */b(x),w=Math.PI*2+Math.max(1,2),s=new Set([1]);",
      "function f(){g();h.v=1}",
      "class K extends b{m(){return 1}}",
      "export{x as a,f as b,K as c};"
    ].join("")), null)
  })

  it("reports statements, un-annotated calls, assignments, and static initializers", () => {
    assert.match(chunkLoadEffect("register(x);"), /statement/)
    assert.match(chunkLoadEffect("var t=table(8);"), /call/)
    assert.match(chunkLoadEffect("var n=(o.k=1);"), /assignment/)
    assert.match(chunkLoadEffect("class K{static z=make()}"), /static/)
    assert.match(chunkLoadEffect("class K extends mixin(B){}"), /extends/)
  })
})

describe("stripPureBareChunkImports", () => {
  it("drops bare imports only when the target's whole closure is inert", () => {
    const dir = mkdtempSync(join(tmpdir(), "semiotic-bare-"))
    try {
      writeFileSync(join(dir, "c-PURE.min.js"), 'import{a}from"./c-LEAF.min.js";var p=/* @__PURE__ */a();export{p as a};')
      writeFileSync(join(dir, "c-LEAF.min.js"), "function a(){return 1}export{a};")
      writeFileSync(join(dir, "c-EFFECT.min.js"), "register(1);export{};")
      writeFileSync(join(dir, "c-VIA.min.js"), 'import"./c-EFFECT.min.js";var v=1;export{v as a};')
      writeFileSync(join(dir, "entry.module.min.js"), [
        'import"./c-PURE.min.js";',
        'import"./c-EFFECT.min.js";',
        'import"./c-VIA.min.js";',
        'import{a as n}from"./c-LEAF.min.js";',
        "export{n as named};"
      ].join(""))
      const result = stripPureBareChunkImports(dir)
      const entry = readFileSync(join(dir, "entry.module.min.js"), "utf8")
      assert.equal(result.stripped, 1)
      assert.doesNotMatch(entry, /import"\.\/c-PURE\.min\.js"/)
      assert.match(entry, /import"\.\/c-EFFECT\.min\.js"/)
      assert.match(entry, /import"\.\/c-VIA\.min\.js"/)
      assert.match(entry, /from"\.\/c-LEAF\.min\.js"/)
      assert.ok(result.kept.has("c-VIA.min.js"))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
