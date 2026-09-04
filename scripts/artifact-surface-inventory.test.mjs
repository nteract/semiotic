import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import {
  ARTIFACT_RELATIONS,
  buildArtifactSurfaceInventory,
  checkArtifactSurfaceInventory,
  discoverRegisteredRecipes,
  renderArtifactSurfaceInventory,
  validateArtifactSurfaceInventory
} from "./generate-artifact-surface-inventory.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const GENERATED_PATH = join(ROOT, "ai/artifact-surface-inventory.json")

function registryCapabilityIdentifiers() {
  const source = readFileSync(
    join(ROOT, "src/components/ai/chartCapabilities.ts"),
    "utf8"
  )
  const start = source.indexOf("const BUILT_IN_CAPABILITIES")
  const end = source.indexOf("const userCapabilities", start)
  assert.notEqual(start, -1, "capability registry declaration should exist")
  assert.notEqual(end, -1, "capability registry terminator should exist")
  const block = source.slice(start, end).replace(/\/\/.*$/gm, "")
  return [...block.matchAll(/^\s+([A-Z][A-Za-z0-9]+Capability),?\s*$/gm)].map(
    (match) => match[1]
  )
}

describe("artifact surface inventory", () => {
  it("is deterministic and matches the committed generated file", () => {
    const first = buildArtifactSurfaceInventory({ root: ROOT })
    const second = buildArtifactSurfaceInventory({ root: ROOT })

    assert.deepEqual(second, first)
    assert.equal(
      readFileSync(GENERATED_PATH, "utf8"),
      renderArtifactSurfaceInventory(first)
    )
    assert.deepEqual(validateArtifactSurfaceInventory(first), [])
  })

  it("covers every capability in the executable built-in registry", () => {
    const inventory = buildArtifactSurfaceInventory({ root: ROOT })
    const registered = registryCapabilityIdentifiers()
    const components = inventory.capabilities.map(({ component }) => component)

    assert.equal(inventory.capabilities.length, registered.length)
    assert.equal(new Set(components).size, components.length)
    assert.ok(
      inventory.capabilities.every(
        ({ registry }) => registry === "src/components/ai/chartCapabilities.ts"
      )
    )
  })

  it("covers every registered portable recipe and identifies local-only recipes", () => {
    const discovered = discoverRegisteredRecipes({ root: ROOT })
    const inventory = buildArtifactSurfaceInventory({ root: ROOT })

    assert.deepEqual(
      inventory.recipes.portable.map(({ id }) => id),
      discovered.portable.map(({ id }) => id)
    )
    assert.ok(inventory.recipes.portable.length > 0)
    assert.ok(
      inventory.recipes.portable.every(
        ({ portability }) => portability === "portable"
      )
    )
    assert.ok(
      inventory.recipes.portable.every(
        ({ registration }) => registration !== "not-registered"
      )
    )
    assert.ok(
      inventory.recipes.local.every(
        ({ portability }) => portability !== "portable"
      )
    )
  })

  it("maps every capability and portable recipe across the complete relation set", () => {
    const inventory = buildArtifactSurfaceInventory({ root: ROOT })
    const relationIds = ARTIFACT_RELATIONS.map(({ id }) => id).sort()

    for (const item of [
      ...inventory.capabilities,
      ...inventory.recipes.portable
    ]) {
      assert.deepEqual(Object.keys(item.relations).sort(), relationIds)
      for (const result of Object.values(item.relations)) {
        assert.match(result.status, /^(represented|partial|not-represented)$/)
        assert.ok(Array.isArray(result.evidence))
      }
    }
  })

  it("assigns every reviewed utility group a source, exports, future home, and action", () => {
    const inventory = buildArtifactSurfaceInventory({ root: ROOT })
    const actions = new Set([
      "keep",
      "wrap",
      "merge",
      "deprecate",
      "investigate"
    ])
    const categories = new Set(
      inventory.utilities.map(({ category }) => category)
    )

    for (const utility of inventory.utilities) {
      assert.ok(utility.source)
      assert.ok(utility.exports.length > 0)
      assert.ok(utility.futureHome)
      assert.ok(actions.has(utility.action))
    }
    for (const category of [
      "access",
      "audit",
      "compatibility",
      "evaluation",
      "evidence",
      "grounding",
      "policy",
      "provenance",
      "selection",
      "serialization",
      "temporal"
    ]) {
      assert.ok(
        categories.has(category),
        `missing utility category ${category}`
      )
    }
  })

  it("records every inspected source in generated provenance", () => {
    const inventory = buildArtifactSurfaceInventory({ root: ROOT })
    const inspectedSources = [
      ...inventory.capabilities.map(({ source }) => source),
      ...inventory.recipes.portable.map(({ source }) => source),
      ...inventory.recipes.local.map(({ source }) => source),
      ...inventory.utilities.map(({ source }) => source),
      ...inventory.documentation.map(({ source }) => source)
    ]

    for (const source of inspectedSources) {
      assert.ok(
        inventory.__source.includes(source),
        `missing source provenance: ${source}`
      )
    }
    assert.deepEqual(inventory.__source, [...inventory.__source].sort())
  })

  it("detects generated-file drift in check mode", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "semiotic-artifact-inventory-")
    )
    const outputPath = join(directory, "inventory.json")
    const expected = renderArtifactSurfaceInventory(
      buildArtifactSurfaceInventory({ root: ROOT })
    )

    writeFileSync(outputPath, expected)
    assert.equal(
      checkArtifactSurfaceInventory({ root: ROOT, outputPath }).ok,
      true
    )

    writeFileSync(outputPath, "{}\n")
    assert.equal(
      checkArtifactSurfaceInventory({ root: ROOT, outputPath }).ok,
      false
    )
  })
})
