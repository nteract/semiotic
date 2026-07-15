#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { validateNightlyCloudRunDeployment } from "./lib/cloud-run-nightly-manifest.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8")
}

try {
  const report = validateNightlyCloudRunDeployment({
    dockerfile: read("deploy/cloud-run-nightly/Dockerfile"),
    cloudbuild: read("deploy/cloud-run-nightly/cloudbuild.yaml"),
    verifier: read("deploy/cloud-run-nightly/verify-runtime.mjs"),
    historicalStableBuildpacks: read(
      "deploy/cloud-run-nightly/historical-stable-buildpacks-cloudbuild.yaml"
    )
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
