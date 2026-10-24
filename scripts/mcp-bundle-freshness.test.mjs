import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  utimesSync
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import freshness from "./lib/mcp-bundle-freshness.cjs"

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "semiotic-mcp-freshness-"))
  try {
    for (const dir of ["dist", "ai/dist", "src", "scripts/lib"])
      mkdirSync(path.join(root, dir), { recursive: true })
    writeFileSync(path.join(root, "src/source.ts"), "export const version = 1")
    writeFileSync(
      path.join(root, "ai/mcp-server.ts"),
      "export const version = 1"
    )
    for (const files of Object.values(freshness.artifacts))
      for (const file of files) writeFileSync(path.join(root, file), "built")
    for (const kind of ["library", "mcp"])
      freshness.writeBuildFingerprint(root, kind)
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test("accepts artifacts built from the current source", () =>
  fixture((root) => {
    assert.doesNotThrow(() => freshness.assertFreshMcpBundles(root))
    writeFileSync(path.join(root, "src/ignored.test.ts"), "test-only edit")
    assert.doesNotThrow(() => freshness.assertFreshMcpBundles(root))
  }))

test("rejects stale library and MCP source even with unchanged timestamps", () => {
  for (const [source, kind] of [
    ["src/source.ts", "library"],
    ["ai/mcp-server.ts", "mcp"]
  ])
    fixture((root) => {
      writeFileSync(path.join(root, source), "export const version = 2")
      utimesSync(path.join(root, source), new Date(0), new Date(0))
      assert.throws(
        () => freshness.assertFreshMcpBundles(root),
        new RegExp(`stale ${kind} bundles`)
      )
    })
})

test("rejects missing artifacts and missing provenance in local runs", () => {
  for (const [kind, directory] of [["library", "dist"], ["mcp", "ai/dist"]])
    fixture((root) => {
      rmSync(path.join(root, directory, ".source-fingerprint.json"))
      assert.throws(
        () => freshness.assertFreshMcpBundles(root),
        new RegExp(`missing or invalid ${kind} source fingerprint`)
      )
      rmSync(path.join(root, "ai/dist/mcp-server.js"))
      assert.throws(
        () => freshness.assertFreshMcpBundles(root),
        /missing ai\/dist\/mcp-server.js/
      )
    })
})

test("rejects changed artifacts even when source is unchanged", () =>
  fixture((root) => {
    writeFileSync(path.join(root, "dist/semiotic-ai.min.js"), "old artifact")
    assert.throws(
      () => freshness.assertFreshMcpBundles(root),
      /stale library bundles/
    )
  }))

test("tracks JavaScript sources and rejects edits during a build", () =>
  fixture((root) => {
    const source = path.join(root, "ai/runtime.js")
    writeFileSync(source, "export const version = 1")
    freshness.writeBuildFingerprint(root, "mcp")
    const before = freshness.sourceFingerprint(root, "mcp")
    writeFileSync(source, "export const version = 2")
    assert.throws(
      () => freshness.writeBuildFingerprint(root, "mcp", before),
      /Source changed during/
    )
    assert.throws(
      () => freshness.assertFreshMcpBundles(root),
      /stale mcp bundles/
    )
  }))

test("tracks transitive built chunks", () =>
  fixture((root) => {
    const chunk = path.join(root, "dist/shared.js")
    writeFileSync(chunk, "export const version = 1")
    freshness.writeBuildFingerprint(root, "library")
    writeFileSync(chunk, "export const version = 2")
    assert.throws(
      () => freshness.assertFreshMcpBundles(root),
      /stale library bundles/
    )
  }))
