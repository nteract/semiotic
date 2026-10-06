import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

// Source-only checks: these must work before declarations, bundles, coverage,
// or browsers are prepared. Keep artifact-dependent checks in release:check.
export const RELEASE_PREFLIGHT_CHECKS = [
  "check:ai-tasks",
  "check:adoption-evals",
  "check:release-version-alignment",
  "check:router-alignment",
  "check:playwright-alignment",
  "check:chart-specs",
  "check:artifact-contract",
  "check:ai-schema",
  "check:capabilities",
  "check:capability-coverage",
  "check:docs-coverage",
  "check:docs-example-integrity",
  "check:docs-prop-tables",
  "check:docs-playground-controls",
  "check:llms",
  "check:blog-entries",
  "check:ai-reference-coverage",
  "check:context7",
  "check:mcp-registry",
  "check:surface",
  "check:ai-surface",
  "check:agent-skill",
  "check:ai-contracts",
  "check:ai-instructions",
  "check:ssr",
  "check:jsdoc-coverage",
  "check:ai-examples-coverage",
  "check:protected-doc-boundaries",
  "lint",
  "check:custom-lints",
  "check:file-size",
  "check:test-quality"
]

type Execute = (
  command: string,
  args: string[],
  options: { cwd: string; stdio: "inherit"; timeout: number }
) => { status: number | null; error?: Error }

export function runReleasePreflight({
  root = process.cwd(),
  execute = spawnSync as Execute,
  log = console.log,
  error = console.error
} = {}) {
  const commands = [
    [
      "audit",
      "--registry=https://registry.npmjs.org",
      "--audit-level=moderate"
    ],
    ...RELEASE_PREFLIGHT_CHECKS.map((name) => ["run", name])
  ]
  const failures: string[] = []
  for (const args of commands) {
    const label = `npm ${args.join(" ")}`
    log(`\n> ${label}`)
    const result = execute("npm", args, {
      cwd: root,
      stdio: "inherit",
      timeout: 120_000
    })
    if (result.status !== 0 || result.error) {
      failures.push(label)
      if (result.error) error(result.error.message)
    }
  }
  // Report every cheap blocker together, before any expensive work can start.
  if (failures.length) {
    error(
      `\nRelease preflight failed (${failures.length} checks):\n${failures.join("\n")}`
    )
    return 1
  }
  log(`\nRelease preflight passed (${commands.length} checks).`)
  return 0
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = runReleasePreflight()
}
