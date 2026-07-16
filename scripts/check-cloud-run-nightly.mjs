#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { validateNightlyCloudRunDeployment } from "./lib/cloud-run-nightly-manifest.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8")
}

const retiredHealthPath = "/health" + "z"
const historicalHealthAliasFiles = new Set([
  "CHANGELOG.md"
])

function activeHealthAliasReferences(directory = root, references = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".parcel-cache") continue
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      activeHealthAliasReferences(absolutePath, references)
      continue
    }
    if (!entry.isFile()) continue
    const relativePath = absolutePath.slice(root.length + 1)
    if (historicalHealthAliasFiles.has(relativePath)) continue
    const contents = readFileSync(absolutePath)
    const matchIndex = findCaseInsensitive(contents, retiredHealthPath)
    if (matchIndex !== -1) {
      const line = contents.subarray(0, matchIndex).toString("utf8").split("\n").length
      references.push(`${relativePath}:${line}`)
    }
  }
  return references
}

function findCaseInsensitive(contents, value) {
  const needle = Buffer.from(value)
  for (let index = 0; index <= contents.length - needle.length; index += 1) {
    if (contents[index] !== needle[0]) continue
    let matches = true
    for (let offset = 0; offset < needle.length; offset += 1) {
      if ((contents[index + offset] | 32) !== (needle[offset] | 32)) {
        matches = false
        break
      }
    }
    if (matches) return index
  }
  return -1
}

try {
  const report = validateNightlyCloudRunDeployment({
    dockerfile: read("deploy/cloud-run-nightly/Dockerfile"),
    cloudbuild: read("deploy/cloud-run-nightly/cloudbuild.yaml"),
    verifier: read("deploy/cloud-run-nightly/verify-runtime.mjs"),
    historicalStableBuildpacks: read(
      "deploy/cloud-run-nightly/historical-stable-buildpacks-cloudbuild.yaml"
    ),
    activeHealthAliasReferences: activeHealthAliasReferences()
  })

  if (report.errors.length > 0) {
    for (const error of report.errors) console.error(`✗ ${error}`)
    process.exitCode = 1
  } else {
    console.log("✓ Nightly Cloud Run deployment configuration passed")
    console.log(
      `  service: ${report.manifest.service} (${report.manifest.region})`
    )
    console.log(`  image: ${report.manifest.image}`)
  }
} catch (error) {
  console.error(`✗ Nightly Cloud Run deployment check failed: ${error.message}`)
  process.exitCode = 1
}
