#!/usr/bin/env node
/**
 * Generate a typed package-surface manifest for the `semiotic` publication.
 *
 * The manifest separates:
 * - JavaScript module exports
 * - Metadata payloads (for explicit metadata sub-paths)
 * - JSON/schema resource exports
 * - Worker asset outputs
 * - Blocked wildcard deep-path exports (for consumers that rely on named-import assertions)
 *
 * Usage:
 *   node scripts/generate-package-surface-manifest.mjs
 *   node scripts/generate-package-surface-manifest.mjs --check
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const CHECK_ONLY = process.argv.includes("--check")
const OUTPUT = resolve(ROOT, "package-surface.manifest.json")
const DIST_DIR = resolve(ROOT, "dist")

function loadPackageJson() {
  return JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"))
}

function hasSourceMap(relativePath) {
  const absolute = resolve(ROOT, relativePath)
  return existsSync(`${absolute}.map`)
}

function normalizeExportTarget(value) {
  return value.startsWith("./") ? value.slice(2) : value
}

function isPrunedDeclarationPath(value) {
  return value.includes("dist/components/test-utils/") || value.includes("dist/components/internal/")
}

/**
 * @typedef {"javascript-module"|"metadata"|"json-schema-resource"|"worker-asset"|"blocked-deep-path"} SurfaceKind
 */

/**
 * @typedef {{
 *   kind: SurfaceKind
 *   subpath: string
 *   path: string
 *   reason: string
 *   exports: string[]
 *   artifacts?: Array<{ kind: string; path: string; sourceMap: boolean }>
 *   esm: boolean
 *   cjs: boolean
 *   types?: string
 *   blockedForNamedImport?: boolean
 *   declarations?: string[]
 * }} SurfaceEntry
 *
 * @typedef {{
 *   path: string
 *   exportedBy: string[]
 *   reason: string
 * }} DeclarationEntry
 */

function classifySubpath(subpath, value) {
  const target = typeof value === "string" ? value : JSON.stringify(value)

  if (subpath === "./package.json") {
    return {
      kind: "metadata",
      subpath,
      path: "package.json",
      reason: "Explicit package metadata export",
      artifacts: [{ kind: "types", path: "package.json", sourceMap: false }],
      esm: false,
      cjs: false,
    }
  }

  if (subpath === "./spec/*") {
    return {
      kind: "json-schema-resource",
      subpath,
      path: "spec/*",
      reason: "JSON schema resource pattern export",
      artifacts: [{ kind: "schema", path: "spec/*", sourceMap: false }],
      esm: false,
      cjs: false,
      blockedForNamedImport: true,
    }
  }

  if (subpath.includes("*")) {
    return {
      kind: "blocked-deep-path",
      subpath,
      path: target.replace(/["'\\]/g, ""),
      reason: "Wildcard export not represented in typed named-import manifests",
      artifacts: [{ kind: "export", path: target.replace(/["']/g, ""), sourceMap: false }],
      esm: false,
      cjs: false,
    }
  }

  if (typeof value === "string") {
    const normalized = normalizeExportTarget(value)
    if (normalized.endsWith(".json")) {
      return {
        kind: "json-schema-resource",
        subpath,
        path: normalized,
        reason: "JSON export from package surface",
        artifacts: [{ kind: "schema", path: normalized, sourceMap: false }],
        esm: false,
        cjs: false,
      }
    }
    return {
      kind: "javascript-module",
      subpath,
      path: normalized,
      reason: "Single-entry export shape",
      artifacts: [{ kind: "module", path: normalized, sourceMap: hasSourceMap(normalized) }],
      esm: true,
      cjs: true,
    }
  }

  const artifacts = []
  let esm = false
  let cjs = false

  for (const key of ["import", "default", "require", "types"]) {
    if (typeof value[key] !== "string") continue
    const normalized = normalizeExportTarget(value[key])
    if (key === "require") cjs = true
    if (key === "import" || key === "default") esm = true
    artifacts.push({
      kind: key,
      path: normalized,
      sourceMap: hasSourceMap(normalized),
    })
  }

  const jsLike = artifacts.some(({ path }) => path.endsWith(".js") || path.endsWith(".mjs"))
  const hasTypes = artifacts.some(({ kind }) => kind === "types")
  return {
    kind: jsLike ? "javascript-module" : "metadata",
    subpath,
    path: normalizeExportTarget(value.import || value.default || value.require || value.types || ""),
    reason: jsLike
      ? "Object export with ESM/CJS/module entries"
      : "Object-shaped metadata export",
    artifacts,
    esm,
    cjs,
    types: hasTypes ? normalizeExportTarget(value.types) : undefined,
  }
}

function collectWorkerAssets() {
  if (!existsSync(DIST_DIR)) return []
  const files = readdirSync(DIST_DIR)
  return files
    .filter(file => file.endsWith("Worker.js") || file.endsWith("-worker.js"))
    .sort()
    .map(file => ({
      kind: /** @type {SurfaceKind} */ ("worker-asset"),
      subpath: `dist/${file}`,
      path: `dist/${file}`,
      reason: "Bundled worker asset generated by scripts/build.mjs",
      artifacts: [{ kind: "worker", path: `dist/${file}`, sourceMap: hasSourceMap(`dist/${file}`) }],
      esm: false,
      cjs: false,
    }))
}

function collectPublicDeclarations(exports) {
  const declarationsByPath = new Map()
  const prunedDeclarations = new Set()

  for (const [subpath, value] of Object.entries(exports)) {
    if (subpath === "./package.json" || subpath === "./spec/*") continue
    if (typeof value !== "object" || value === null) continue
    if (typeof value.types !== "string") continue

    const typesPath = normalizeExportTarget(value.types)
    if (isPrunedDeclarationPath(typesPath)) {
      prunedDeclarations.add(typesPath)
      continue
    }

    if (!declarationsByPath.has(typesPath)) {
      declarationsByPath.set(typesPath, new Set())
    }
    declarationsByPath.get(typesPath).add(subpath)
  }

  const entries = [...declarationsByPath.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, subpaths]) => ({
      path,
      exports: [...subpaths].sort(),
      reason: "Public type entry from `exports` map",
    }))

  return {
    entries,
    pruned: [...prunedDeclarations].sort(),
  }
}

function generateManifest() {
  const packageJson = loadPackageJson()
  const exports = packageJson.exports ?? {}
  const declarations = collectPublicDeclarations(exports)

  /** @type {SurfaceEntry[]} */
  const entries = []
  const blockedDeepPaths = []

  for (const [subpath, value] of Object.entries(exports)) {
    if (subpath === "./package.json" || subpath === "./spec/*") {
      // `./package.json` is metadata; `./spec/*` is intentionally resource-only.
    }
    if (subpath.includes("*") && subpath !== "./spec/*") {
      blockedDeepPaths.push(subpath)
      continue
    }
    const entry = classifySubpath(subpath, value)
    if (entry.kind === "blocked-deep-path") {
      blockedDeepPaths.push(subpath)
    } else {
      entries.push(entry)
    }
  }

  for (const worker of collectWorkerAssets()) {
    entries.push(worker)
  }

  entries.sort((a, b) => a.subpath.localeCompare(b.subpath))
  blockedDeepPaths.sort()

  return {
    schemaVersion: 1,
    declarationRollupSchemaVersion: 1,
    __generated: true,
    generatedBy: "scripts/generate-package-surface-manifest.mjs",
    package: {
      name: packageJson.name,
      version: packageJson.version,
      types: packageJson.types,
      module: packageJson.module,
      main: packageJson.main,
    },
    blockedDeepPaths,
    entries,
    declarationRollup: {
      pathToExports: declarations.entries,
      prunedDeclarationPaths: declarations.pruned,
      excludedInternalTrees: ["dist/components/test-utils", "dist/components/internal"],
    },
  }
}

function writeOrCheck(manifest) {
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`
  if (CHECK_ONLY) {
    const previous = readFileSync(OUTPUT, "utf8")
    if (previous !== rendered) {
      console.error("Package surface manifest is stale. Run: node scripts/generate-package-surface-manifest.mjs")
      process.exit(1)
    }
    console.log("✅ package surface manifest is current")
    return
  }
  writeFileSync(OUTPUT, rendered)
  console.log(`✅ wrote ${OUTPUT}`)
}

writeOrCheck(generateManifest())
