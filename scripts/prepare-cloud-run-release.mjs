#!/usr/bin/env node
/**
 * Create a deployable stable Cloud Run source directory for an exact public
 * Semiotic npm artifact. npm generates the lockfile; this script never edits
 * lock integrity fields directly.
 */
import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { createHash } from "node:crypto"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { validateCloudRunManifest } from "./lib/cloud-run-manifest.mjs"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = join(repoRoot, "deploy", "cloud-run")
const registry = "https://registry.npmjs.org"
const values = new Map()

for (let index = 2; index < process.argv.length; index += 1) {
  const option = process.argv[index]
  if (!["--version", "--expected-integrity", "--output-dir"].includes(option)) {
    throw new Error(`Unknown option ${option}`)
  }
  const value = process.argv[index + 1]
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`)
  values.set(option, value)
  index += 1
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))
const rootManifest = readJson(join(repoRoot, "package.json"))
const version = values.get("--version") ?? rootManifest.version
const expectedIntegrity = values.get("--expected-integrity")
const outputArgument = values.get("--output-dir")

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid release version ${JSON.stringify(version)}`)
}
if (rootManifest.version !== version) {
  throw new Error(`Requested ${version}, but package.json identifies ${rootManifest.version}`)
}
if (!outputArgument) {
  throw new Error("Usage: node scripts/prepare-cloud-run-release.mjs --output-dir PATH [--version X.Y.Z] [--expected-integrity sha512-…]")
}

const outputRoot = resolve(outputArgument)
const relativeOutput = relative(repoRoot, outputRoot)
if (outputRoot === repoRoot || relativeOutput === ".." || relativeOutput.startsWith(`..${sep}`)) {
  // Output outside the checkout is normal in CI. Only reject a parent of the
  // checkout, where an accidental cleanup could encompass repository data.
  if (repoRoot === outputRoot || repoRoot.startsWith(`${outputRoot}${sep}`)) {
    throw new Error(`Refusing unsafe output directory ${outputRoot}`)
  }
}
if (existsSync(outputRoot) && readdirSync(outputRoot).length > 0) {
  throw new Error(`Output directory must be empty: ${outputRoot}`)
}
mkdirSync(outputRoot, { recursive: true })

const wrapperManifest = readJson(join(sourceRoot, "package.json"))
wrapperManifest.dependencies.semiotic = version
writeFileSync(join(outputRoot, "package.json"), `${JSON.stringify(wrapperManifest, null, 2)}\n`)
copyFileSync(join(sourceRoot, ".gcloudignore"), join(outputRoot, ".gcloudignore"))

execFileSync(
  "npm",
  [
    "install",
    "--package-lock-only",
    "--ignore-scripts",
    "--save-exact",
    `--registry=${registry}`,
  ],
  { cwd: outputRoot, stdio: "inherit" },
)

function npmView(field) {
  const output = execFileSync(
    "npm",
    ["view", `semiotic@${version}`, field, "--json", `--registry=${registry}`],
    { encoding: "utf8" },
  )
  return JSON.parse(output)
}

const publishedVersion = npmView("version")
const publishedIntegrity = npmView("dist.integrity")
if (publishedVersion !== version) {
  throw new Error(`Public npm returned semiotic@${publishedVersion}, expected ${version}`)
}
if (typeof publishedIntegrity !== "string" || !/^sha512-/.test(publishedIntegrity)) {
  throw new Error(`Public npm returned an invalid integrity for semiotic@${version}`)
}
if (expectedIntegrity && publishedIntegrity !== expectedIntegrity) {
  throw new Error(
    `Published semiotic@${version} integrity does not match the immutable release artifact`,
  )
}

const lockfile = readJson(join(outputRoot, "package-lock.json"))
const lockedSemiotic = lockfile.packages?.["node_modules/semiotic"]
if (lockedSemiotic?.integrity !== publishedIntegrity) {
  throw new Error(
    `Generated Cloud Run lock integrity does not match public semiotic@${version}`,
  )
}

const report = validateCloudRunManifest({
  wrapperManifest,
  rootManifest,
  gcloudignore: readFileSync(join(outputRoot, ".gcloudignore"), "utf8"),
  lockfile,
  requireLockfile: true,
  requireRootVersion: true,
})
if (report.errors.length > 0) {
  throw new Error(`Prepared Cloud Run source is invalid:\n- ${report.errors.join("\n- ")}`)
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex")
const provenance = {
  schemaVersion: 1,
  package: `semiotic@${version}`,
  npmIntegrity: publishedIntegrity,
  releaseCommit: process.env.GITHUB_SHA || null,
  sourceFiles: {
    "package.json": sha256(join(outputRoot, "package.json")),
    "package-lock.json": sha256(join(outputRoot, "package-lock.json")),
    ".gcloudignore": sha256(join(outputRoot, ".gcloudignore")),
  },
}
writeFileSync(
  join(outputRoot, "semiotic-cloud-run-release.provenance.json"),
  `${JSON.stringify(provenance, null, 2)}\n`,
)

console.log(`✓ prepared exact Cloud Run source for semiotic@${version}`)
console.log(`  npm integrity: ${publishedIntegrity}`)
console.log(`  output: ${outputRoot}`)
