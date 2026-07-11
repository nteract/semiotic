// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import {
  artifactFileNames,
  artifactStem,
  createReleaseArtifactManifest,
  parseNpmPackJson,
  releaseArtifactPaths,
  sha512File,
  sha512IntegrityFile,
  verifyReleaseArtifact,
} from "./release-artifact.mjs"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))
const tempDirectories = []

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe("release artifact evidence", () => {
  it("uses stable package-derived artifact names", () => {
    expect(artifactStem("@scope/chart-kit", "1.2.3")).toBe("scope-chart-kit-1.2.3")
    expect(artifactFileNames(packageJson)).toEqual({
      tarball: `semiotic-${packageJson.version}.tgz`,
      checksum: `semiotic-${packageJson.version}.tgz.sha512`,
      sbom: `semiotic-${packageJson.version}.sbom.cdx.json`,
      manifest: `semiotic-${packageJson.version}.provenance.json`,
    })
  })

  it("requires one npm-pack JSON result with a filename", () => {
    expect(parseNpmPackJson(`[{"filename":"semiotic-${packageJson.version}.tgz"}]`)).toMatchObject({
      filename: `semiotic-${packageJson.version}.tgz`,
    })
    expect(() => parseNpmPackJson("not json")).toThrow("JSON")
    expect(() => parseNpmPackJson("[]")).toThrow("exactly one")
  })

  it("verifies the manifest, checksum, and SBOM against the exact tarball", () => {
    const directory = mkdtempSync(join(tmpdir(), "semiotic-release-artifact-test-"))
    tempDirectories.push(directory)
    const paths = releaseArtifactPaths(directory, packageJson)
    writeFileSync(paths.tarball, "immutable package bytes")
    const digest = sha512File(paths.tarball)
    writeFileSync(paths.checksum, `${digest}  ${artifactFileNames(packageJson).tarball}\n`)
    writeFileSync(paths.sbom, JSON.stringify({
      bomFormat: "CycloneDX",
      metadata: { component: { name: packageJson.name, version: packageJson.version } },
    }))
    const manifest = createReleaseArtifactManifest({
      packageJson,
      tarballPath: paths.tarball,
      sha512: digest,
      sbomPath: paths.sbom,
      source: { commit: "test", ref: "test", workflowRun: null },
      npmVersion: "10.0.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
    })
    writeFileSync(paths.manifest, `${JSON.stringify(manifest)}\n`)

    expect(verifyReleaseArtifact({ repoRoot, outDir: directory }).manifest).toMatchObject({
      tarball: {
        file: `semiotic-${packageJson.version}.tgz`,
        digest: { value: digest },
        integrity: sha512IntegrityFile(paths.tarball),
      },
    })

    writeFileSync(paths.checksum, "incorrect\n")
    expect(() => verifyReleaseArtifact({ repoRoot, outDir: directory })).toThrow("checksum")

    writeFileSync(paths.checksum, `${digest}  ${artifactFileNames(packageJson).tarball}\n`)
    writeFileSync(paths.sbom, JSON.stringify({
      bomFormat: "CycloneDX",
      metadata: { component: { name: packageJson.name, version: packageJson.version } },
      components: [{ name: "substituted-but-valid" }],
    }))
    expect(() => verifyReleaseArtifact({ repoRoot, outDir: directory })).toThrow("SBOM")
  })

  it("rejects byte-level tarball mutations even when the sidecar is left unchanged", () => {
    const directory = mkdtempSync(join(tmpdir(), "semiotic-release-artifact-test-"))
    tempDirectories.push(directory)
    const paths = releaseArtifactPaths(directory, packageJson)
    writeFileSync(paths.tarball, "immutable package bytes")
    const digest = sha512File(paths.tarball)
    writeFileSync(paths.checksum, `${digest}  ${artifactFileNames(packageJson).tarball}\n`)
    writeFileSync(paths.sbom, JSON.stringify({
      bomFormat: "CycloneDX",
      metadata: { component: { name: packageJson.name, version: packageJson.version } },
    }))
    writeFileSync(paths.manifest, `${JSON.stringify(createReleaseArtifactManifest({
      packageJson,
      tarballPath: paths.tarball,
      sha512: digest,
      sbomPath: paths.sbom,
      source: { commit: "test", ref: "test", workflowRun: null },
      npmVersion: "10.0.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
    }))}\n`)

    writeFileSync(paths.tarball, "mutated package bytes")
    expect(() => verifyReleaseArtifact({ repoRoot, outDir: directory })).toThrow(/byte count|SHA-512/)
  })
})
