#!/usr/bin/env node

/** Guard the measured decision to ship d3 as external runtime dependencies. */

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageJson = readJson(join(REPO_ROOT, "package.json"))
const report = readJson(join(REPO_ROOT, "benchmarks/setup/d3-packaging.json"))
const errors = []

const declaredD3 = Object.keys(packageJson.dependencies ?? {})
  .filter((name) => name.startsWith("d3-"))
  .sort()
const peerD3 = Object.keys(packageJson.peerDependencies ?? {}).filter((name) =>
  name.startsWith("d3-")
)
const optionalD3 = Object.keys(packageJson.optionalDependencies ?? {}).filter(
  (name) => name.startsWith("d3-")
)
const sourceD3 = collectBareD3Imports(join(REPO_ROOT, "src"), [".ts", ".tsx"])
const artifactD3 = collectBareD3Imports(join(REPO_ROOT, "dist"), [".js"])

if (peerD3.length > 0) {
  errors.push(
    `d3 packages must not be consumer-managed peers: ${peerD3.join(", ")}`
  )
}
if (optionalD3.length > 0) {
  errors.push(
    `directly imported d3 packages must not be optional: ${optionalD3.join(", ")}`
  )
}
compareSets(
  "production source imports and package runtime dependencies",
  sourceD3,
  declaredD3,
  errors
)
compareSets(
  "production artifact bare imports and package runtime dependencies",
  artifactD3,
  declaredD3,
  errors
)

if (report.schemaVersion !== 1)
  errors.push("measurement schemaVersion must be 1")
if (report.package !== packageJson.version) {
  errors.push(
    `measurement package version ${report.package} does not match ${packageJson.version}`
  )
}
if (report.decision?.model !== "externalized-runtime-dependencies") {
  errors.push("measurement decision must be externalized-runtime-dependencies")
}
if (report.method?.nextBundler !== "webpack") {
  errors.push("measurement must retain explicit Next/webpack evidence")
}
if (!Array.isArray(report.webpack) || report.webpack.length < 4) {
  errors.push(
    "measurement must cover at least four representative webpack cases"
  )
} else {
  const externalizedWins = report.webpack.filter(
    (entry) => entry?.delta?.gzipBytes > 0
  ).length
  if (externalizedWins < 3) {
    errors.push(
      `externalized model must win at least 3 webpack cases; report has ${externalizedWins}`
    )
  }
}
if (!(report.next?.delta?.gzipBytes > 0)) {
  errors.push("externalized model must remain smaller in the Next/webpack case")
}
if (report.d3InstallClosure?.directPackages !== declaredD3.length) {
  errors.push("measurement d3 direct-package count does not match package.json")
}

if (errors.length > 0) {
  console.error("✗ d3 packaging contract failed:")
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log(
  `✓ d3 packaging contract: ${declaredD3.length} external runtime dependencies, ` +
    `${report.webpack.length} webpack cases, and Next/webpack evidence`
)

function readJson(path) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`)
  return JSON.parse(readFileSync(path, "utf8"))
}

function collectBareD3Imports(root, extensions) {
  if (!existsSync(root)) {
    errors.push(`missing ${root}`)
    return []
  }
  const packages = new Set()
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const entryPath = join(path, entry.name)
      if (entry.isDirectory()) {
        visit(entryPath)
      } else if (
        extensions.some((extension) => entry.name.endsWith(extension))
      ) {
        const source = readFileSync(entryPath, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*$/gm, "")
        for (const match of source.matchAll(
          /(?:from\s*|import\s*\(|require\s*\()\s*["'](d3-[a-z0-9-]+)["']/g
        )) {
          packages.add(match[1])
        }
      }
    }
  }
  visit(root)
  return [...packages].sort()
}

function compareSets(label, actual, expected, findings) {
  const missing = expected.filter((name) => !actual.includes(name))
  const unexpected = actual.filter((name) => !expected.includes(name))
  if (missing.length > 0)
    findings.push(`${label} missing: ${missing.join(", ")}`)
  if (unexpected.length > 0) {
    findings.push(`${label} unexpectedly include: ${unexpected.join(", ")}`)
  }
}
