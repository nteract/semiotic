#!/usr/bin/env node
/**
 * Surface drift gate — runs in CI.
 *
 * Regenerates `etc/api-surface/*.api.md` and fails if any file changed.
 * A clean diff means the public API surface is unchanged. To intentionally
 * change the surface, run `npm run docs:api-surface` locally and commit
 * the resulting `.api.md` files alongside the code change.
 */
import { execSync, spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

console.log("▶ regenerating api-surface snapshots…")
const gen = spawnSync(process.execPath, ["scripts/generate-api-surface.mjs"], {
  cwd: repoRoot,
  stdio: "inherit",
})
if (gen.status !== 0) {
  console.error("✗ generator failed")
  process.exit(gen.status || 1)
}

console.log("▶ checking for surface drift…")
const diff = execSync("git status --porcelain etc/api-surface", {
  cwd: repoRoot,
  encoding: "utf8",
}).trim()

if (diff) {
  console.error("\n✗ public API surface drift detected:")
  console.error(diff)
  console.error("\nIf this change is intentional, run:")
  console.error("  npm run docs:api-surface")
  console.error("…and commit the updated etc/api-surface/*.api.md files.\n")
  console.error("Diff preview (first 200 lines):")
  const preview = execSync("git diff -- etc/api-surface", { cwd: repoRoot, encoding: "utf8" })
  process.stderr.write(preview.split("\n").slice(0, 200).join("\n") + "\n")
  process.exit(1)
}

console.log("✅ public API surface unchanged")
