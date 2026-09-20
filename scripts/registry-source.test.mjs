import assert from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
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
