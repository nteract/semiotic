#!/usr/bin/env node
/**
 * Phase 1 chart-specs gate.
 *
 * Runs the round-trip test that asserts each spec in `chartSpecs.ts`
 * generates the same shape as the canonical schema.json /
 * validationMap.ts / componentMetadata.cjs entries. If they drift, the
 * test fails and CI blocks the merge.
 *
 * Phase 2+ will swap this for direct file emission and a `git diff`
 * gate; for now the test-driven check is sufficient since the registry
 * is still a parallel source of truth (only one chart in CHART_SPECS).
 */
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

const result = spawnSync(
  "npx",
  ["vitest", "run", "src/__tests__/scenarios/chart-specs-round-trip.test.ts"],
  { cwd: repoRoot, stdio: "inherit" },
)

if (result.status !== 0) {
  console.error("\n✗ chart-specs round-trip drift detected.")
  console.error("Either edit chartSpecs.ts to match the canonical files, or")
  console.error("update the canonical files and re-run this gate.")
  process.exit(result.status ?? 1)
}

console.log("✅ chart-specs round-trip clean")
