#!/usr/bin/env node
/**
 * Chart-specs round-trip gate.
 *
 * Runs the round-trip test that asserts every spec in `chartSpecs.ts`
 * generates the same shape as the canonical `ai/schema.json`,
 * `validationMap.ts`, and `ai/componentMetadata.cjs` entries. If they
 * drift, the test fails and CI blocks the merge. The registry is the
 * source of truth for the full 43-chart surface (XY + ordinal + network
 * + geo + realtime); fix drift by editing `chartSpecs.ts` and running
 * `npm run docs:chart-specs:schema` to refresh `ai/schema.json`.
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
