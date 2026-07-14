/**
 * Run: node --test scripts/cloud-run-nightly-manifest.test.mjs
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { validateNightlyCloudRunDeployment } from "./lib/cloud-run-nightly-manifest.mjs"

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8")
}

function deployment(overrides = {}) {
  return {
    dockerfile: read("deploy/cloud-run-nightly/Dockerfile"),
    cloudbuild: read("deploy/cloud-run-nightly/cloudbuild.yaml"),
    verifier: read("deploy/cloud-run-nightly/verify-runtime.mjs"),
    legacyBuildpacks: read("deploy/cloud-run-nightly/legacy-buildpacks-cloudbuild.yaml"),
    ...overrides,
  }
}

describe("nightly Cloud Run deployment configuration", () => {
  it("keeps a repository-built Node 22 nightly image and image-only service update", () => {
    const report = validateNightlyCloudRunDeployment(deployment())
    assert.deepEqual(report.errors, [])
    assert.equal(report.manifest.service, "semiotic-mcp-server")
    assert.equal(report.manifest.region, "us-west1")
    assert.match(report.manifest.image, /semiotic-mcp-server:\$COMMIT_SHA$/)
  })

  it("rejects a Dockerfile that skips the repository runtime or MCP build", () => {
    const dockerfile = deployment().dockerfile.replace("  && npm run build:mcp", "")
    const report = validateNightlyCloudRunDeployment(deployment({ dockerfile }))
    assert.equal(report.errors.some((error) => error.includes("build the MCP executable")), true)
  })

  it("rejects a deployment that would overwrite Cloud Run environment settings", () => {
    const cloudbuild = deployment().cloudbuild.replace(
      "- --quiet",
      "- --update-env-vars=MCP_ALLOWED_HOSTS=wrong.example\n      - --quiet",
    )
    const report = validateNightlyCloudRunDeployment(deployment({ cloudbuild }))
    assert.equal(report.errors.some((error) => error.includes("--update-env-vars")), true)
  })

  it("rejects replacing all service labels instead of updating provenance labels", () => {
    const cloudbuild = deployment().cloudbuild.replace("--update-labels=commit-sha", "--labels=commit-sha")
    const report = validateNightlyCloudRunDeployment(deployment({ cloudbuild }))
    assert.equal(report.errors.some((error) => error.includes("identity labels")), true)
  })

  it("rejects an artifact verifier that would permit the published package implementation", () => {
    const verifier = deployment().verifier.replace('"unexpected-published-semiotic-package"', '"published-package-allowed"')
    const report = validateNightlyCloudRunDeployment(deployment({ verifier }))
    assert.equal(report.errors.some((error) => error.includes("unexpected-published-semiotic-package")), true)
  })
})
