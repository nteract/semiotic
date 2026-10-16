import assert from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { readRegistryKeys } from "./lib/registry-source.cjs"

test("registry checks follow only wired imports and ignore nested properties", () => {
  const root = mkdtempSync(join(tmpdir(), "semiotic-registry-"))
  try {
    const entry = join(root, "index.ts")
    writeFileSync(
      join(root, "family.ts"),
      'export const FAMILY = { AreaChart: area, "Heatmap": heatmap } satisfies Record<string, Config>'
    )
    writeFileSync(
      entry,
      'import { FAMILY as XY } from "./family"\nexport const REGISTRY = { Direct: { Nested: fake }, ...XY }'
    )
    assert.deepEqual(
      [...readRegistryKeys(entry, "REGISTRY")],
      ["Direct", "AreaChart", "Heatmap"]
    )
    writeFileSync(
      entry,
      'import { FAMILY as XY } from "./family"\nexport const REGISTRY = { Direct: direct }'
    )
    assert.deepEqual([...readRegistryKeys(entry, "REGISTRY")], ["Direct"])
    writeFileSync(entry, "export const REGISTRY = { ...missing }")
    assert.throws(
      () => readRegistryKeys(entry, "REGISTRY"),
      /Unsupported registry spread/
    )
    writeFileSync(
      entry,
      'import { FAMILY } from "./family"\nexport const REGISTRY = { ...FAMILY }'
    )
    writeFileSync(
      join(root, "family.ts"),
      'import { REGISTRY } from "./index"\nexport const FAMILY = { ...REGISTRY }'
    )
    assert.throws(
      () => readRegistryKeys(entry, "REGISTRY"),
      /Circular registry/
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("registry checks read nested Object.assign catalogs without evaluating modules", () => {
  const root = mkdtempSync(join(tmpdir(), "semiotic-registry-"))
  try {
    const entry = join(root, "index.ts")
    writeFileSync(
      join(root, "family.ts"),
      'throw new Error("must not execute")\nexport const FAMILY = { AreaChart: area, Heatmap: heatmap }'
    )
    writeFileSync(
      entry,
      `import { FAMILY as XY } from "./family"
       export const REGISTRY = /* @__PURE__ */ Object.assign(
         Object.create(null),
         { Direct: { Nested: fake } },
         Object.assign(Object.create(null), (XY as Record<string, Config>), { Direct: override }),
         { ...Object.assign({}, { Last: last }) }
       ) satisfies Record<string, Config>`
    )
    assert.deepEqual(
      [...readRegistryKeys(entry, "REGISTRY")],
      ["Direct", "AreaChart", "Heatmap", "Last"]
    )
    for (const expression of [
      "Object.assign({}, makeRegistry())",
      "Other.assign({}, { Hidden: hidden })",
      "Object.assign({}, ...catalogs)",
      "Object.assign()",
      "Object.create()",
      "Object.create({ Inherited: inherited })",
      "Object.create(null, { Hidden: { value: hidden } })",
      "Object.create(makePrototype())",
      "Other.create(null)"
    ]) {
      writeFileSync(entry, `export const REGISTRY = ${expression}`)
      assert.throws(() => readRegistryKeys(entry, "REGISTRY"), /Expected object registry/)
    }
    writeFileSync(entry, "export const REGISTRY = Object.create(null)")
    assert.deepEqual([...readRegistryKeys(entry, "REGISTRY")], [])
    writeFileSync(
      entry,
      'import { FAMILY } from "./family"\nexport const REGISTRY = Object.assign({}, FAMILY)'
    )
    writeFileSync(
      join(root, "family.ts"),
      'import { REGISTRY } from "./index"\nexport const FAMILY = Object.assign({}, REGISTRY)'
    )
    assert.throws(() => readRegistryKeys(entry, "REGISTRY"), /Circular registry/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("registry checks read the production MCP catalog without loading renderers", () => {
  const keys = readRegistryKeys(
    fileURLToPath(new URL("../ai/componentRegistry.ts", import.meta.url)),
    "COMPONENT_REGISTRY"
  )
  for (const name of ["LineChart", "BarChart", "BigNumber", "CalendarHeatmapRecipe"])
    assert.ok(keys.has(name), `${name} is discoverable`)
})
