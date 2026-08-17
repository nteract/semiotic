#!/usr/bin/env node
/**
 * Ensure all public-entry projections derive from one package-export inventory.
 *
 * `package.json#exports` is the only hand-authored publication list. Vite
 * aliases and API snapshots are derived from scripts/lib/public-entrypoints;
 * this check also reconciles that inventory with the generated package-surface
 * manifest so a new subpath cannot silently miss one of those contracts.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { semioticSourceAliases } from "../vite.shared.mjs"
import {
  REPO_ROOT,
  publicJavaScriptEntrypoints,
  stableApiEntrypoints
} from "./lib/public-entrypoints.mjs"

const repoRoot = REPO_ROOT
const errors = []
const entries = publicJavaScriptEntrypoints()
const aliases = semioticSourceAliases(repoRoot)

function sameSet(label, actual, expected) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  const missing = [...expectedSet].filter((value) => !actualSet.has(value))
  const extra = [...actualSet].filter((value) => !expectedSet.has(value))
  if (missing.length > 0) errors.push(`${label} missing: ${missing.join(", ")}`)
  if (extra.length > 0)
    errors.push(`${label} has unexpected entries: ${extra.join(", ")}`)
}

for (const entry of entries) {
  const source = resolve(repoRoot, entry.sourcePath)
  if (!existsSync(source)) {
    errors.push(
      `${entry.specifier} source entry is missing: ${entry.sourcePath}`
    )
  }
  const alias = aliases.find(({ find }) => find.test(entry.specifier))
  if (!alias) {
    errors.push(`${entry.specifier} has no Vite source alias`)
  } else if (alias.replacement !== source) {
    errors.push(
      `${entry.specifier} alias resolves ${alias.replacement}, expected ${source}`
    )
  }
}
if (aliases.length !== entries.length) {
  errors.push(
    `Vite alias count is ${aliases.length}, expected ${entries.length}`
  )
}

const packageSurfacePath = resolve(repoRoot, "package-surface.manifest.json")
if (!existsSync(packageSurfacePath)) {
  errors.push("package-surface.manifest.json is missing")
} else {
  const surface = JSON.parse(readFileSync(packageSurfacePath, "utf8"))
  const surfaceEntries = (surface.entries ?? []).filter(
    (entry) => entry.kind === "javascript-module"
  )
  sameSet(
    "package-surface JavaScript subpaths",
    surfaceEntries.map((entry) => entry.subpath),
    entries.map((entry) => entry.subpath)
  )
  const surfaceBySubpath = new Map(
    surfaceEntries.map((entry) => [entry.subpath, entry])
  )
  for (const entry of entries) {
    const surfaceEntry = surfaceBySubpath.get(entry.subpath)
    if (!surfaceEntry) continue
    const actualArtifacts = (surfaceEntry.artifacts ?? [])
      .filter((artifact) => /\.(?:[cm]?js)$/.test(artifact.path))
      .map((artifact) => `${artifact.kind}:${artifact.path}`)
    const expectedArtifacts = entry.artifactTargets.map(
      (artifact) => `${artifact.condition}:${artifact.path}`
    )
    sameSet(
      `${entry.specifier} package-surface artifacts`,
      actualArtifacts,
      expectedArtifacts
    )
  }
}

for (const entry of entries) {
  if (entry.stableApi && !entry.declarationPath) {
    errors.push(`${entry.specifier} is stable but has no exported types target`)
  }
}

const snapshotDir = resolve(repoRoot, "etc/api-surface")
const snapshots = existsSync(snapshotDir)
  ? readdirSync(snapshotDir)
      .filter((name) => name.endsWith(".api.md"))
      .map((name) => name.replace(/\.api\.md$/, ""))
  : []
sameSet(
  "API snapshots",
  snapshots,
  stableApiEntrypoints().map((entry) => entry.apiSnapshotName)
)

if (errors.length > 0) {
  console.error("✗ public entry-point parity failed:")
  for (const error of errors) console.error(`  - ${error}`)
  console.error(
    "\nUpdate package exports, source entry points, or regenerate the owning artifact."
  )
  process.exit(1)
}

console.log(
  `✓ public entry points aligned (${entries.length} importable, ${stableApiEntrypoints().length} API snapshots)`
)
