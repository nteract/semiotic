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

  it("checks definition-time work in classes and object methods without running instance bodies", () => {
    for (const code of [
      "class C { [register()]() {} }",
      "class C { get [register()]() { return 1 } }",
      "class C { [register()] = 1 }",
      "class C { [key] = 1 }",
      "const Symbol = custom; class C { [Symbol.iterator]() {} }",
      "const C = class { [register()]() {} }",
      "const C = class { static { register() } }",
      "const C = class extends mixin(Base) {}",
      "export default class { [register()]() {} }",
      "const obj = { [register()]() {} }",
      "@register class C {}",
      "class C { @register method() {} }"
    ]) assert.ok(chunkLoadEffect(code), code)
    for (const code of [
      "class C { field = register(); method() { register() } }",
      'const C = class { ["literal"] = register() }',
      "const obj = { method() { register() }, get value() { return register() } }",
      "class C { *[Symbol.iterator]() { register() } }"
    ]) assert.equal(chunkLoadEffect(code), null, code)
    assert.ok(chunkLoadEffect("const x = /* @__PURE__ */ wrap(class { [register()]() {} })"))
    assert.ok(chunkLoadEffect("const x = /* @__PURE__ */ factory()()"))
    assert.equal(chunkLoadEffect("const x = /* @__PURE__ */ (/* @__PURE__ */ factory())()"), null)
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
      writeFileSync(join(dir, "c-CLASS.min.js"), "class C { [register()]() {} } export { C };")
      writeFileSync(join(dir, "c-A.min.js"), 'import"./c-B.min.js";import"./c-EFFECT.min.js";')
      writeFileSync(join(dir, "c-B.min.js"), 'import"./c-A.min.js";')
      writeFileSync(join(dir, "entry.module.min.js"), [
        'import"./c-PURE.min.js";',
        'import"./c-EFFECT.min.js";',
        'import"./c-VIA.min.js";',
        'import"./c-CLASS.min.js";',
        'import"./c-A.min.js";',
        'import"./c-B.min.js";',
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
      for (const chunk of ["CLASS", "A", "B"]) {
        assert.ok(entry.includes(`import"./c-${chunk}.min.js"`))
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
