#!/usr/bin/env node
/* global console, process */
/** Build or verify the immutable tarball/evidence set used by a release. */
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildReleaseArtifact, verifyReleaseArtifact } from "./lib/release-artifact.mjs"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const verify = args.includes("--verify")
const outDirIndex = args.indexOf("--out-dir")
const outDir = outDirIndex === -1 ? null : args[outDirIndex + 1]
const validArgs = new Set(["--out-dir", "--verify", outDir])

if (
  !outDir ||
  outDir.startsWith("--") ||
  outDirIndex !== args.lastIndexOf("--out-dir") ||
  args.filter((arg) => arg === "--verify").length > 1 ||
  args.some((arg) => !validArgs.has(arg))
) {
  throw new Error("Usage: node scripts/create-release-artifact.mjs --out-dir <directory> [--verify]")
}

if (verify) {
  const result = verifyReleaseArtifact({ repoRoot, outDir })
  console.log(`✓ verified ${result.manifest.tarball.file} (${result.manifest.tarball.digest.algorithm})`)
} else {
  const result = buildReleaseArtifact({ repoRoot, outDir })
  console.log(`✓ created ${result.manifest.tarball.file}`)
  console.log(`  SHA-512: ${result.manifest.tarball.digest.value}`)
  console.log(`  evidence: ${result.paths.checksum}`)
  console.log(`  SBOM: ${result.paths.sbom}`)
  console.log(`  provenance: ${result.paths.manifest}`)
}
