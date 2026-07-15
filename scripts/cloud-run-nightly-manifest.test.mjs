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
    historicalStableBuildpacks: read(
      "deploy/cloud-run-nightly/historical-stable-buildpacks-cloudbuild.yaml"
    ),
    ...overrides
  }
}

describe("nightly Cloud Run deployment configuration", () => {
  it("keeps a repository-built Node 22 nightly image and image-only service update", () => {
    const report = validateNightlyCloudRunDeployment(deployment())
    assert.deepEqual(report.errors, [])
    assert.equal(report.manifest.service, "semiotic-mcp-nightly")
    assert.equal(report.manifest.region, "us-central1")
    assert.equal(
      report.manifest.image,
      "us-central1-docker.pkg.dev/semiotic-mcp/cloud-run-source-deploy/semiotic/semiotic-mcp-nightly:$COMMIT_SHA"
    )
  })

  it("rejects a Dockerfile that skips the repository runtime or MCP build", () => {
    const dockerfile = deployment().dockerfile.replace(
      "  && npm run build:mcp",
      ""
    )
    const report = validateNightlyCloudRunDeployment(deployment({ dockerfile }))
    assert.equal(
      report.errors.some((error) => error.includes("build the MCP executable")),
      true
    )
  })

  it("rejects a deployment that would overwrite Cloud Run environment settings", () => {
    const cloudbuild = deployment().cloudbuild.replace(
      '--update-labels="$$labels"',
      '--update-env-vars="MCP_ALLOWED_HOSTS=wrong.example" --update-labels="$$labels"'
    )
    const report = validateNightlyCloudRunDeployment(deployment({ cloudbuild }))
    assert.equal(
      report.errors.some((error) => error.includes("--update-env-vars")),
      true
    )
  })

  it("rejects a deployment that changes the existing request timeout", () => {
    const cloudbuild = deployment().cloudbuild.replace(
      '--update-labels="$$labels"',
      '--timeout=900 --update-labels="$$labels"'
    )
    const report = validateNightlyCloudRunDeployment(deployment({ cloudbuild }))
    assert.equal(
      report.errors.some((error) => error.includes("--timeout=")),
      true
    )
  })

  it("rejects replacing all service labels instead of updating provenance labels", () => {
    const cloudbuild = deployment().cloudbuild.replace(
      '--update-labels="$$labels"',
      '--labels="$$labels"'
    )
    const report = validateNightlyCloudRunDeployment(deployment({ cloudbuild }))
    assert.equal(
      report.errors.some((error) => error.includes("--labels=")),
      true
    )
  })

  it("rejects a deployment that points the nightly config at the stable service", () => {
    const cloudbuild = deployment().cloudbuild.replace(
      "service=semiotic-mcp-nightly",
      "service=semiotic-mcp-server"
    )
    const report = validateNightlyCloudRunDeployment(deployment({ cloudbuild }))
    assert.equal(
      report.errors.some((error) => error.includes("stable service")),
      true
    )
  })

  it("rejects a deployment that points the nightly config at the legacy service", () => {
    const cloudbuild = deployment().cloudbuild.replace(
      "service=semiotic-mcp-nightly",
      "service=semiotic-mcp\n"
    )
    const report = validateNightlyCloudRunDeployment(deployment({ cloudbuild }))
    assert.equal(
      report.errors.some((error) => error.includes("legacy service")),
      true
    )
  })

  it("rejects an artifact verifier that would permit the published package implementation", () => {
    const verifier = deployment().verifier.replace(
      '"unexpected-published-semiotic-package"',
      '"published-package-allowed"'
    )
    const report = validateNightlyCloudRunDeployment(deployment({ verifier }))
    assert.equal(
      report.errors.some((error) =>
        error.includes("unexpected-published-semiotic-package")
      ),
      true
    )
  })
})
