#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { validateCloudRunManifest } from "./lib/cloud-run-manifest.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const deployRoot = join(repoRoot, "deploy/cloud-run")
const args = new Set(process.argv.slice(2))

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function main() {
  const lockfilePath = join(deployRoot, "package-lock.json")
  const report = validateCloudRunManifest({
    wrapperManifest: readJson(join(deployRoot, "package.json")),
    rootManifest: readJson(join(repoRoot, "package.json")),
    gcloudignore: readFileSync(join(deployRoot, ".gcloudignore"), "utf8"),
    lockfile: existsSync(lockfilePath) ? readJson(lockfilePath) : null,
    requireLockfile: args.has("--require-lockfile"),
  })

  if (args.has("--json")) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log("Cloud Run deployment manifest")
    console.log(`  semiotic: ${report.manifest.semiotic}`)
    console.log(`  Node: ${report.manifest.node}`)
    console.log(`  start: ${report.manifest.start}`)
    console.log(`  lockfile: ${report.lockfile.state}`)
    for (const warning of report.warnings) console.warn(`! ${warning}`)
  }

  if (report.errors.length > 0) {
    for (const error of report.errors) console.error(`✗ ${error}`)
    process.exitCode = 1
    return
  }

  if (!args.has("--json")) {
    const suffix = report.lockfile.state === "valid"
      ? "and lockfile constraints passed"
      : "constraints passed; lockfile remains unresolved"
    console.log(`✓ Cloud Run manifest ${suffix}`)
  }
}

try {
  main()
} catch (error) {
  console.error(`✗ Cloud Run manifest check failed: ${error.message}`)
  process.exitCode = 1
}
