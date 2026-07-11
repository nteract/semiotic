#!/usr/bin/env node
/**
 * Surface drift gate — runs in CI.
 *
 * Generates `etc/api-surface/*.api.md` equivalents into a temporary directory
 * and compares them with the checked-in snapshots without writing tracked
 * files. To intentionally change the surface, run `npm run docs:api-surface`
 * locally and commit the resulting `.api.md` files alongside the code change.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const snapshotDir = join(repoRoot, "etc/api-surface")
const tempDir = mkdtempSync(join(tmpdir(), "semiotic-api-surface-"))

try {
  console.log("▶ generating temporary api-surface snapshots…")
  const gen = spawnSync(
    process.execPath,
    ["scripts/generate-api-surface.mjs", "--out-dir", tempDir],
    { cwd: repoRoot, stdio: "inherit" },
  )
  if (gen.status !== 0) {
    console.error("✗ generator failed")
    process.exitCode = gen.status || 1
  } else {
    console.log("▶ checking for surface drift…")
    const names = new Set([
      ...readdirSync(snapshotDir).filter((name) => name.endsWith(".api.md")),
      ...readdirSync(tempDir).filter((name) => name.endsWith(".api.md")),
    ])
    const changes = [...names].sort().filter((name) => {
      const expectedPath = join(snapshotDir, name)
      const actualPath = join(tempDir, name)
      const expected = existsSync(expectedPath) ? readFileSync(expectedPath, "utf8") : undefined
      const actual = existsSync(actualPath) ? readFileSync(actualPath, "utf8") : undefined
      return expected !== actual
    })

    if (changes.length > 0) {
      console.error("\n✗ public API surface drift detected:")
      for (const name of changes) console.error(`- etc/api-surface/${name}`)
      console.error("\nIf this change is intentional, run:")
      console.error("  npm run docs:api-surface")
      console.error("…and commit the updated etc/api-surface/*.api.md files.")
      process.exitCode = 1
    } else {
      console.log("✅ public API surface unchanged")
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
