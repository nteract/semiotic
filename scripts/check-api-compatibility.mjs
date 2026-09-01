#!/usr/bin/env node
/**
 * Compare the generated public declaration surface with the latest release.
 *
 * `check:api-surface` proves that committed snapshots match HEAD, but an
 * intentional snapshot update can still hide a breaking change. This gate
 * downloads the previous release's actual npm artifact, generates both
 * snapshots with the same compiler/generator, and rejects removed or
 * incompatible declarations. Additions are compatible. TypeScript
 * assignability dismisses alias-only widenings; rare reviewed signature
 * changes live in an exact, reasoned allowlist so they cannot become a blanket
 * escape hatch.
 */
import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  compareDeclarationLines,
  snapshotLines
} from "./lib/api-compatibility.mjs"
import { createDeclarationAssignability } from "./lib/declaration-assignability.mjs"
import { npmPackArtifactArgs } from "./lib/npm-pack.mjs"

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))
const args = process.argv.slice(2)
const verbose = args.includes("--verbose")
const allowlistPath = join(
  repoRoot,
  "etc/api-surface/compatibility-allowlist.json"
)
const registry =
  process.env.SEMIOTIC_NPM_REGISTRY || "https://registry.npmjs.org"

function argumentValue(name) {
  const index = args.indexOf(name)
  if (index === -1) return null
  const value = args[index + 1]
  if (!value || value.startsWith("--"))
    throw new Error(`${name} requires a git ref`)
  return value
}

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim()
}

function latestReleaseTag() {
  const head = git(["rev-parse", "HEAD"])
  const tags = git([
    "tag",
    "--merged",
    "HEAD",
    "--list",
    "v*",
    "--sort=-v:refname"
  ])
    .split("\n")
    .filter(Boolean)
  for (const tag of tags) {
    if (git(["rev-list", "-n", "1", tag]) === head) continue
    const version = tag.slice(1)
    const published = spawnSync(
      "npm",
      ["view", `semiotic@${version}`, "version", "--registry", registry],
      { cwd: repoRoot, encoding: "utf8", timeout: 30_000 }
    )
    if (published.status === 0 && published.stdout.trim() === version)
      return tag
    if (verbose) {
      console.warn(`Skipping unpublished compatibility tag ${tag}`)
    }
  }
  throw new Error(
    "No merged, published v* release tag is available; fetch tags or pass --against <ref>"
  )
}

function loadAllowlist() {
  const parsed = JSON.parse(readFileSync(allowlistPath, "utf8"))
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.changes)) {
    throw new Error(
      "compatibility-allowlist.json must use schemaVersion 1 and a changes array"
    )
  }
  for (const change of parsed.changes) {
    if (typeof change.reason !== "string" || change.reason.trim().length < 12) {
      throw new Error(
        `Compatibility allowlist entry ${change.entry}.${change.symbol} needs a substantive reason`
      )
    }
  }
  return parsed.changes
}

function changeId(change) {
  return (
    `${change.against}\u0000${change.entry}\u0000${change.symbol}\u0000` +
    `${JSON.stringify(change.previous)}\u0000${JSON.stringify(change.current)}`
  )
}

const against = argumentValue("--against") ?? latestReleaseTag()
const tempDir = mkdtempSync(join(tmpdir(), "semiotic-api-compat-"))

try {
  git(["rev-parse", "--verify", `${against}^{commit}`])
  const versionMatch = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(against)
  if (!versionMatch) {
    throw new Error(
      `API compatibility requires a published semver tag, received ${against}`
    )
  }
  const previousVersion = versionMatch[1]
  const archiveDir = join(tempDir, "archive")
  const extractionDir = join(tempDir, "extracted")
  const previousSnapshots = join(tempDir, "previous-snapshots")
  const currentSnapshots = join(tempDir, "current-snapshots")
  mkdirSync(archiveDir, { recursive: true })
  mkdirSync(extractionDir, { recursive: true })

  const packed = spawnSync(
    "npm",
    npmPackArtifactArgs([
      `semiotic@${previousVersion}`,
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      archiveDir,
      "--registry",
      registry
    ]),
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024
    }
  )
  if (packed.status !== 0) {
    process.stderr.write(packed.stderr || packed.stdout)
    throw new Error(
      `Could not download authoritative semiotic@${previousVersion} package`
    )
  }
  let packResult
  try {
    packResult = JSON.parse(packed.stdout)
  } catch (error) {
    throw new Error(`Could not parse npm pack output: ${error.message}`)
  }
  const reportedFilename = packResult?.[0]?.filename
  const archiveNames = readdirSync(archiveDir)
    .filter((name) => name.endsWith(".tgz"))
    .sort()
  if (archiveNames.length !== 1) {
    throw new Error(
      `npm pack expected one .tgz archive in ${archiveDir}; found ${archiveNames.length}`
    )
  }
  if (reportedFilename && reportedFilename !== archiveNames[0]) {
    throw new Error(
      `npm pack reported ${reportedFilename}, but wrote ${archiveNames[0]}`
    )
  }
  execFileSync("tar", [
    "-xzf",
    join(archiveDir, archiveNames[0]),
    "-C",
    extractionDir
  ])
  const previousPackageRoot = join(extractionDir, "package")
  const previousManifest = JSON.parse(
    readFileSync(join(previousPackageRoot, "package.json"), "utf8")
  )
  if (
    previousManifest.name !== "semiotic" ||
    previousManifest.version !== previousVersion
  ) {
    throw new Error(
      `Packed comparison target was ${previousManifest.name}@${previousManifest.version}; ` +
        `expected semiotic@${previousVersion}`
    )
  }
  if (!existsSync(join(previousPackageRoot, "dist"))) {
    throw new Error(
      `Published semiotic@${previousVersion} has no dist directory`
    )
  }
  // TypeScript resolves peer declaration packages by walking from the unpacked
  // .d.ts files. Link the lockfile-installed dependency tree into this private
  // temp package rather than changing compiler resolution (a wildcard `paths`
  // mapping can silently reduce generic React signatures to `any`).
  symlinkSync(
    join(repoRoot, "node_modules"),
    join(previousPackageRoot, "node_modules"),
    "dir"
  )

  const previousGenerated = spawnSync(
    process.execPath,
    [
      "scripts/generate-api-surface.mjs",
      "--dist-dir",
      join(previousPackageRoot, "dist"),
      "--package-json",
      join(previousPackageRoot, "package.json"),
      "--out-dir",
      previousSnapshots
    ],
    { cwd: repoRoot, encoding: "utf8" }
  )
  if (previousGenerated.status !== 0) {
    process.stderr.write(previousGenerated.stderr || previousGenerated.stdout)
    process.exit(previousGenerated.status || 1)
  }

  const currentGenerated = spawnSync(
    process.execPath,
    ["scripts/generate-api-surface.mjs", "--out-dir", currentSnapshots],
    { cwd: repoRoot, encoding: "utf8" }
  )
  if (currentGenerated.status !== 0) {
    process.stderr.write(currentGenerated.stderr || currentGenerated.stdout)
    process.exit(currentGenerated.status || 1)
  }

  const previousFiles = readdirSync(previousSnapshots)
    .filter((path) => path.endsWith(".api.md"))
    .sort()
  if (previousFiles.length === 0) {
    throw new Error(
      `semiotic@${previousVersion} produced no public API snapshots`
    )
  }
  const currentFiles = readdirSync(currentSnapshots)
    .filter((path) => path.endsWith(".api.md"))
    .sort()
  const currentFileSet = new Set(currentFiles)
  const addedEntries = currentFiles.filter((file) => {
    return !previousFiles.includes(file)
  })

  const allowlist = loadAllowlist()
  const allowed = new Map(allowlist.map((change) => [changeId(change), change]))
  const used = new Set()
  const failures = []
  const semanticCompatibility = createDeclarationAssignability({
    previousDist: join(previousPackageRoot, "dist"),
    currentDist: join(repoRoot, "dist")
  })
  const semanticallyCompatible = []

  for (const file of previousFiles) {
    const entry = file.replace(/\.api\.md$/, "")
    const currentPath = join(currentSnapshots, file)
    let currentMarkdown
    try {
      currentMarkdown = readFileSync(currentPath, "utf8")
    } catch {
      failures.push(`${entry}: released entry point was removed`)
      continue
    }

    const previousMarkdown = readFileSync(join(previousSnapshots, file), "utf8")
    const changes = compareDeclarationLines(
      snapshotLines(previousMarkdown),
      snapshotLines(currentMarkdown)
    )
    for (const change of changes) {
      const candidate = {
        against,
        entry,
        symbol: change.symbol,
        previous: change.previous,
        current: change.current
      }
      if (semanticCompatibility.isCompatible(entry, change)) {
        semanticallyCompatible.push(`${entry}.${change.symbol}`)
        continue
      }
      const id = changeId(candidate)
      if (allowed.has(id)) {
        used.add(id)
        continue
      }
      const label =
        change.kind === "removed"
          ? "declaration was removed"
          : change.kind === "required-added"
            ? "required interface member was added"
            : "declaration changed"
      failures.push(
        `${entry}.${change.symbol}: ${label}\n` +
          `    previous: ${change.previous.join(" | ") || "<absent>"}\n` +
          `    current:  ${change.current.join(" | ") || "<absent>"}`
      )
    }
  }

  const stale = allowlist.filter(
    (change) => change.against === against && !used.has(changeId(change))
  )
  for (const change of stale) {
    failures.push(
      `${change.entry}.${change.symbol}: compatibility allowlist entry for ${against} is stale`
    )
  }

  if (failures.length > 0) {
    console.error(`\n✗ public API compatibility failed against ${against}:\n`)
    for (const failure of failures) console.error(`  - ${failure}`)
    console.error(
      "\nPreserve the released declaration, or add an exact reviewed entry with a reason to " +
        "etc/api-surface/compatibility-allowlist.json."
    )
    process.exitCode = 1
  } else {
    if (verbose && addedEntries.length > 0) {
      console.log("Additive stable entry points:")
      for (const file of addedEntries) {
        console.log(`  - ${file.replace(/\.api\.md$/, "")}`)
      }
    }
    for (const file of addedEntries) {
      const entry = file.replace(/\.api\.md$/, "")
      const declarations = readFileSync(
        join(currentSnapshots, file),
        "utf8"
      ).trim()
      if (!declarations) {
        failures.push(`${entry}: newly released entry point has an empty API snapshot`)
      }
    }
    if (failures.length > 0) {
      console.error(`\n✗ public API compatibility failed against ${against}:\n`)
      for (const failure of failures) console.error(`  - ${failure}`)
      process.exitCode = 1
    } else {
      console.log(
        `✅ public API is backward-compatible with ${against} ` +
          `(${previousFiles.length} released entry-point snapshots; ` +
          `${addedEntries.length} additive entries; ` +
          `${semanticallyCompatible.length} assignability-proven changes; ` +
          `${used.size} reviewed ${used.size === 1 ? "change" : "changes"})`
      )
      if (verbose && semanticallyCompatible.length > 0) {
        console.log("Assignability-proven changes:")
        for (const change of semanticallyCompatible) console.log(`  - ${change}`)
      }
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
