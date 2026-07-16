/**
 * Run: node --test scripts/cloud-run-manifest.test.mjs
 */
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { validateCloudRunManifest } from "./lib/cloud-run-manifest.mjs"

const rootManifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const wrapperManifest = JSON.parse(readFileSync(new URL("../deploy/cloud-run/package.json", import.meta.url), "utf8"))
const gcloudignore = readFileSync(new URL("../deploy/cloud-run/.gcloudignore", import.meta.url), "utf8")

function validLockfile() {
  const dependencies = wrapperManifest.dependencies
  const packageEntry = (version) => ({
    version,
    resolved: `https://registry.npmjs.org/example/-/example-${version}.tgz`,
    integrity: "sha512-test",
  })
  return {
    lockfileVersion: 3,
    packages: {
      "": { dependencies: { ...dependencies } },
      "node_modules/react": packageEntry(dependencies.react),
      "node_modules/react-dom": packageEntry(dependencies["react-dom"]),
      "node_modules/semiotic": packageEntry(dependencies.semiotic),
    },
  }
}

function validate(overrides = {}) {
  return validateCloudRunManifest({
    wrapperManifest,
    rootManifest,
    gcloudignore,
    ...overrides,
  })
}

describe("Cloud Run deployment manifest", () => {
  it("keeps the current wrapper structurally valid while honestly reporting the missing lock", () => {
    const report = validate()

    assert.deepEqual(report.errors, [])
    assert.equal(report.lockfile.state, "missing")
    assert.equal(report.warnings.length, 1)
    assert.match(report.warnings[0], /not reproducibly locked/)
  })

  it("requires the public Cloud Run host, port fallback, and tool profile", () => {
    const invalidManifest = structuredClone(wrapperManifest)
    invalidManifest.scripts.start = "semiotic-mcp --http --port 8080"

    const report = validate({ wrapperManifest: invalidManifest })

    assert.equal(report.errors.some((error) => error.includes("start script must be exactly")), true)
  })

  it("rejects loose dependencies and a gcloudignore that drops the future lockfile", () => {
    const invalidManifest = structuredClone(wrapperManifest)
    invalidManifest.dependencies.semiotic = "^3.8.1"

    const report = validate({
      wrapperManifest: invalidManifest,
      gcloudignore: "node_modules\npackage-lock.json\n",
    })

    assert.equal(report.errors.some((error) => error.includes("exact published version")), true)
    assert.equal(report.errors.some((error) => error.includes("must not exclude package-lock.json")), true)
  })

  it("validates a fully resolved lock and can fail closed when one is missing", () => {
    const locked = validate({ lockfile: validLockfile(), requireLockfile: true })
    const missing = validate({ requireLockfile: true })

    assert.deepEqual(locked.errors, [])
    assert.equal(locked.lockfile.state, "valid")
    assert.equal(missing.lockfile.state, "missing")
    assert.equal(missing.errors.some((error) => error.includes("package-lock.json is present")), true)
  })

  it("only requires the stable wrapper to match root when preparing that release for deployment", () => {
    const mismatchedRoot = { ...rootManifest, version: "0.0.0" }
    const ordinary = validate({ rootManifest: mismatchedRoot, lockfile: validLockfile() })
    const deployment = validate({
      rootManifest: mismatchedRoot,
      lockfile: validLockfile(),
      requireRootVersion: true,
    })

    assert.deepEqual(ordinary.errors, [])
    assert.equal(
      deployment.errors.some((error) => error.includes("must equal the root package version")),
      true,
    )
  })
})
