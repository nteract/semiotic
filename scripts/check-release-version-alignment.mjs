#!/usr/bin/env node
/** Fail when release-facing metadata still identifies a previous version. */
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const readText = (path) => readFileSync(join(repoRoot, path), "utf8")
const readJson = (path) => JSON.parse(readText(path))
const errors = []

function expectEqual(label, actual, expected) {
  if (actual !== expected) {
    errors.push(`${label} must be ${JSON.stringify(expected)} (received ${JSON.stringify(actual)})`)
  }
}

const pkg = readJson("package.json")
const version = pkg.version
if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`package.json contains an invalid release version: ${JSON.stringify(version)}`)
}

const stableTypeDocRevision = 'typedoc --gitRevision "v$npm_package_version"'
for (const scriptName of ["docs:api", "docs:api:json"]) {
  if (!pkg.scripts?.[scriptName]?.startsWith(stableTypeDocRevision)) {
    errors.push(`${scriptName} must pin TypeDoc source links to the versioned release tag`)
  }
}

const lock = readJson("package-lock.json")
expectEqual("package-lock.json#version", lock.version, version)
expectEqual('package-lock.json#packages[""]#version', lock.packages?.[""]?.version, version)

const schema = readJson("ai/schema.json")
expectEqual("ai/schema.json#version", schema.version, version)

const server = readJson("server.json")
expectEqual("server.json#version", server.version, version)
const npmPackage = server.packages?.find(
  (entry) => entry.registryType === "npm" && entry.identifier === pkg.name,
)
expectEqual(`server.json npm ${pkg.name} package version`, npmPackage?.version, version)

const aiSurface = readJson("ai/surface-manifest.json")
expectEqual("ai/surface-manifest.json#version", aiSurface.version, version)

const packageSurface = readJson("package-surface.manifest.json")
expectEqual("package-surface.manifest.json#package.version", packageSurface.package?.version, version)

const coldConsumer = readJson("benchmarks/setup/cold-consumer-imports.json")
expectEqual("benchmarks/setup/cold-consumer-imports.json#package.version", coldConsumer.package?.version, version)

const readmeHeading = `## What's New in ${version}`
if (!readText("README.md").split(/\r?\n/).includes(readmeHeading)) {
  errors.push(`README.md must contain the exact heading ${JSON.stringify(readmeHeading)}`)
}

const changelogHeading = `## [${version}]`
const changelogLine = readText("CHANGELOG.md")
  .split(/\r?\n/)
  .find((line) => line.startsWith(changelogHeading))
if (
  changelogLine !== changelogHeading &&
  !new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`).test(changelogLine ?? "")
) {
  errors.push(
    `CHANGELOG.md must contain ${JSON.stringify(changelogHeading)} with an optional YYYY-MM-DD suffix`,
  )
}

if (errors.length > 0) {
  console.error(`✗ Release metadata is not aligned to ${version}:`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log(`✓ release metadata, README, and CHANGELOG identify ${version}`)
