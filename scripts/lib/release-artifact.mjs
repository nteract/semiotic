/* global process */
/**
 * Build and verify the immutable artifact used by a release.
 *
 * `npm publish <tarball>` can publish bytes that have already been inspected;
 * publishing from the checkout cannot make that guarantee because npm packs it
 * again. This module creates the tarball once, records its hash, emits a
 * lockfile-backed CycloneDX SBOM, and writes unsigned build evidence. npm's
 * registry-hosted provenance remains the authoritative attestation and is
 * requested by the release workflow at publication time.
 */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, isAbsolute, join, relative, resolve } from "node:path"

export const RELEASE_ARTIFACT_SCHEMA_VERSION = 2

function executable(name) {
  return process.platform === "win32" ? `${name}.cmd` : name
}

function command(cwd, name, args, env) {
  return execFileSync(executable(name), args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  }).trim()
}

function commandOrNull(cwd, name, args) {
  try {
    return command(cwd, name, args) || null
  } catch {
    return null
  }
}

export function artifactStem(packageName, version) {
  return `${packageName.replace(/^@/, "").replaceAll("/", "-")}-${version}`
}

export function artifactFileNames(packageJson) {
  const stem = artifactStem(packageJson.name, packageJson.version)
  return {
    tarball: `${stem}.tgz`,
    checksum: `${stem}.tgz.sha512`,
    sbom: `${stem}.sbom.cdx.json`,
    manifest: `${stem}.provenance.json`,
  }
}

export function parseNpmPackJson(output) {
  let entries
  try {
    entries = JSON.parse(output)
  } catch {
    throw new Error("npm pack did not return JSON output")
  }
  if (!Array.isArray(entries) || entries.length !== 1 || typeof entries[0]?.filename !== "string") {
    throw new Error("npm pack must return exactly one tarball filename")
  }
  return entries[0]
}

export function sha512File(path) {
  return createHash("sha512").update(readFileSync(path)).digest("hex")
}

export function sha512IntegrityFile(path) {
  return `sha512-${createHash("sha512").update(readFileSync(path)).digest("base64")}`
}

export function releaseArtifactPaths(outDir, packageJson) {
  const directory = resolve(outDir)
  const names = artifactFileNames(packageJson)
  return Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, resolve(directory, name)]),
  )
}

export function createReleaseArtifactManifest({
  packageJson,
  tarballPath,
  sha512,
  integrity = sha512IntegrityFile(tarballPath),
  sbomPath,
  source,
  npmVersion,
  generatedAt = new Date().toISOString(),
}) {
  return {
    schemaVersion: RELEASE_ARTIFACT_SCHEMA_VERSION,
    kind: "unsigned-build-evidence",
    signed: false,
    package: {
      name: packageJson.name,
      version: packageJson.version,
    },
    tarball: {
      file: basename(tarballPath),
      bytes: statSync(tarballPath).size,
      digest: {
        algorithm: "sha512",
        encoding: "hex",
        value: sha512,
      },
      integrity,
    },
    sbom: {
      format: "CycloneDX",
      file: basename(sbomPath),
      bytes: statSync(sbomPath).size,
      digest: {
        algorithm: "sha512",
        encoding: "hex",
        value: sha512File(sbomPath),
      },
      integrity: sha512IntegrityFile(sbomPath),
      source: "npm sbom --omit=dev --package-lock-only --sbom-format cyclonedx --sbom-type library",
    },
    provenance: {
      // This file is build evidence, not a signed provenance attestation.
      // GitHub OIDC + `npm publish --provenance` produces the registry-hosted,
      // verifiable attestation for this exact tarball.
      generatedAt,
      source,
      build: {
        node: process.version,
        npm: npmVersion,
      },
      registryAttestation: {
        status: "requested by release workflow; not verified by this unsigned evidence",
        command: "npm publish <tarball> --provenance",
      },
    },
  }
}

function assertOutputDirectory(outDir) {
  if (!outDir) throw new Error("Missing required --out-dir")
  const directory = resolve(outDir)
  if (directory === resolve("/")) throw new Error("Refusing to write release artifacts to the filesystem root")
  return directory
}

function assertArtifactPathInside(outDir, file) {
  const resolvedFile = resolve(outDir, file)
  const rel = relative(outDir, resolvedFile)
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`npm pack produced a tarball outside the artifact directory: ${file}`)
  }
  return resolvedFile
}

function sourceProvenance(repoRoot, env) {
  return {
    commit: env.GITHUB_SHA || commandOrNull(repoRoot, "git", ["rev-parse", "HEAD"]),
    ref: env.GITHUB_REF_NAME || commandOrNull(repoRoot, "git", ["symbolic-ref", "--short", "-q", "HEAD"]),
    workflowRun: env.GITHUB_RUN_ID || null,
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

export function buildReleaseArtifact({ repoRoot, outDir, env = process.env }) {
  const root = resolve(repoRoot)
  const directory = assertOutputDirectory(outDir)
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
  const paths = releaseArtifactPaths(directory, packageJson)

  for (const [kind, path] of Object.entries(paths)) {
    if (existsSync(path)) {
      throw new Error(`Refusing to overwrite existing ${kind} artifact: ${path}`)
    }
  }
  mkdirSync(directory, { recursive: true })

  const npmCache = mkdtempSync(join(tmpdir(), "semiotic-release-artifact-cache-"))
  const npmEnvironment = { ...process.env, npm_config_cache: npmCache }
  let packed
  let sbomText
  let npmVersion
  try {
    packed = parseNpmPackJson(command(root, "npm", [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      directory,
    ], npmEnvironment))
    sbomText = command(root, "npm", [
      "sbom",
      "--omit=dev",
      "--package-lock-only",
      "--sbom-format",
      "cyclonedx",
      "--sbom-type",
      "library",
    ], npmEnvironment)
    npmVersion = command(root, "npm", ["--version"], npmEnvironment)
  } finally {
    rmSync(npmCache, { recursive: true, force: true })
  }
  if (packed.name !== packageJson.name || packed.version !== packageJson.version) {
    throw new Error("npm pack returned a package identity that does not match package.json")
  }
  const tarballPath = assertArtifactPathInside(directory, packed.filename)
  if (!existsSync(tarballPath)) throw new Error(`npm pack did not create ${tarballPath}`)
  if (basename(tarballPath) !== basename(paths.tarball)) {
    throw new Error(`npm pack returned unexpected tarball name ${basename(tarballPath)}`)
  }

  const sha512 = sha512File(tarballPath)
  const integrity = sha512IntegrityFile(tarballPath)
  writeFileSync(paths.checksum, `${sha512}  ${basename(tarballPath)}\n`)

  const sbom = JSON.parse(sbomText)
  if (
    sbom?.bomFormat !== "CycloneDX" ||
    sbom?.metadata?.component?.name !== packageJson.name ||
    sbom?.metadata?.component?.version !== packageJson.version
  ) {
    throw new Error("npm sbom produced an unexpected package document")
  }
  writeJson(paths.sbom, sbom)

  const manifest = createReleaseArtifactManifest({
    packageJson,
    tarballPath,
    sha512,
    integrity,
    sbomPath: paths.sbom,
    source: sourceProvenance(root, env),
    npmVersion,
  })
  writeJson(paths.manifest, manifest)

  return {
    directory,
    packageJson,
    manifest,
    paths: { ...paths, tarball: tarballPath },
  }
}

export function verifyReleaseArtifact({ repoRoot, outDir }) {
  const root = resolve(repoRoot)
  const directory = assertOutputDirectory(outDir)
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
  const paths = releaseArtifactPaths(directory, packageJson)
  for (const [kind, path] of Object.entries(paths)) {
    if (!existsSync(path)) throw new Error(`Missing ${kind} release artifact: ${path}`)
  }

  const manifest = JSON.parse(readFileSync(paths.manifest, "utf8"))
  if (manifest?.schemaVersion !== RELEASE_ARTIFACT_SCHEMA_VERSION) {
    throw new Error(`Unsupported release artifact schema version: ${manifest?.schemaVersion}`)
  }
  if (manifest?.kind !== "unsigned-build-evidence" || manifest?.signed !== false) {
    throw new Error("Release artifact manifest must identify itself as unsigned build evidence")
  }
  if (manifest?.package?.name !== packageJson.name || manifest?.package?.version !== packageJson.version) {
    throw new Error("Release artifact package identity does not match package.json")
  }
  if (manifest?.tarball?.file !== basename(paths.tarball)) {
    throw new Error("Release artifact manifest names a different tarball")
  }
  if (manifest?.tarball?.bytes !== statSync(paths.tarball).size) {
    throw new Error("Release artifact manifest byte count does not match the tarball")
  }
  const digest = sha512File(paths.tarball)
  if (manifest?.tarball?.digest?.algorithm !== "sha512" || manifest?.tarball?.digest?.value !== digest) {
    throw new Error("Release artifact manifest SHA-512 does not match the tarball")
  }
  if (manifest?.tarball?.integrity !== sha512IntegrityFile(paths.tarball)) {
    throw new Error("Release artifact manifest SRI integrity does not match the tarball")
  }
  const checksum = readFileSync(paths.checksum, "utf8").trim()
  if (checksum !== `${digest}  ${basename(paths.tarball)}`) {
    throw new Error("Release artifact checksum file does not match the tarball")
  }
  const sbom = JSON.parse(readFileSync(paths.sbom, "utf8"))
  if (
    sbom?.bomFormat !== "CycloneDX" ||
    sbom?.metadata?.component?.name !== packageJson.name ||
    sbom?.metadata?.component?.version !== packageJson.version
  ) {
    throw new Error("Release artifact SBOM is not a CycloneDX document for this package")
  }
  if (manifest?.sbom?.file !== basename(paths.sbom)) {
    throw new Error("Release artifact manifest names a different SBOM")
  }
  if (manifest?.sbom?.bytes !== statSync(paths.sbom).size) {
    throw new Error("Release artifact manifest byte count does not match the SBOM")
  }
  const sbomDigest = sha512File(paths.sbom)
  if (manifest?.sbom?.digest?.algorithm !== "sha512" || manifest?.sbom?.digest?.value !== sbomDigest) {
    throw new Error("Release artifact manifest SHA-512 does not match the SBOM")
  }
  if (manifest?.sbom?.integrity !== sha512IntegrityFile(paths.sbom)) {
    throw new Error("Release artifact manifest SRI integrity does not match the SBOM")
  }

  return { packageJson, manifest, paths }
}
