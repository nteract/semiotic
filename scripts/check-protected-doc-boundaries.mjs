#!/usr/bin/env node
/**
 * Prevent ignored documentation sources from leaking into public source,
 * generated documentation, declarations, or package bundles.
 *
 * Protected paths are derived from anchored `/docs/...` directory entries in
 * `.gitignore`. The checker deliberately never prints the protected path,
 * filename, or matched text; CI output identifies only the public file that
 * must be cleaned.
 */
import { execFileSync } from "node:child_process"
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync
} from "node:fs"
import { basename, dirname, extname, relative, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const GENERATED_ROOTS = ["docs/public", "docs/build", "dist"]
const TRACKED_PROTECTED_ERROR =
  "A tracked file exists inside a protected documentation boundary"
const REDACTED_GENERATED_PATH = "[generated output path redacted]"
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".cts",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".map",
  ".md",
  ".mdx",
  ".mjs",
  ".mts",
  ".sh",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
])

function normalizePath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "")
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Discover anchored ignored documentation directories without naming them. */
export function discoverProtectedDocPaths(root = ROOT) {
  const ignorePath = resolve(root, ".gitignore")
  if (!existsSync(ignorePath)) return []

  return readFileSync(ignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.startsWith("/docs/") &&
        !line.startsWith("!") &&
        !/[?*\[\]]/.test(line)
    )
    .map((line) => normalizePath(line.replace(/^\//, "").replace(/\/$/, "")))
}

function collectFiles(directory, files = [], textOnly = true) {
  if (!existsSync(directory) || lstatSync(directory).isSymbolicLink()) {
    return files
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) collectFiles(path, files, textOnly)
    else if (
      entry.isFile() &&
      (!textOnly || TEXT_EXTENSIONS.has(extname(entry.name)))
    ) {
      files.push(path)
    }
  }
  return files
}

function collectProtectedFilenames(root, protectedPaths) {
  const filenames = new Set()
  for (const protectedPath of protectedPaths) {
    for (const filePath of collectFiles(resolve(root, protectedPath), [], false)) {
      const name = basename(filePath).toLowerCase()
      // Common names such as README.md are not useful leak identifiers. Long
      // names retain enough specificity to catch a copied private-doc link.
      if (name.length >= 16) filenames.add(name)
    }
  }
  return filenames
}

function stem(filename) {
  const extension = extname(filename)
  return extension ? filename.slice(0, -extension.length) : filename
}

function trackedFiles(root) {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8"
  })
  return output.split("\0").filter(Boolean)
}

function isWithin(path, parent) {
  const normalizedPath = normalizePath(path).toLowerCase()
  const normalizedParent = normalizePath(parent).toLowerCase()
  return (
    normalizedPath === normalizedParent ||
    normalizedPath.startsWith(`${normalizedParent}/`)
  )
}

function containsProtectedReference(
  source,
  protectedPaths,
  protectedReferenceFilenames
) {
  const normalized = source.replaceAll("\\", "/").toLowerCase()

  for (const protectedPath of protectedPaths) {
    const lowerPath = protectedPath.toLowerCase()
    if (normalized.includes(lowerPath)) return true

    const leaf = basename(lowerPath)
    const relativeDirectoryReference = new RegExp(
      `(?:^|[^a-z0-9_-])(?:\\.\\.?/)+${escapeRegExp(leaf)}(?:/|(?=["'\\s)]))`,
      "m"
    )
    if (relativeDirectoryReference.test(normalized)) return true
  }

  for (const filename of protectedReferenceFilenames) {
    if (normalized.includes(filename)) return true
  }
  return false
}

function protectedOutputIdentifiers(
  protectedPaths,
  protectedReferenceFilenames,
  publicStems = new Set()
) {
  const identifiers = new Set(
    protectedPaths.map((protectedPath) => basename(protectedPath).toLowerCase())
  )
  for (const filename of protectedReferenceFilenames) {
    identifiers.add(filename)
    const filenameStem = stem(filename)
    if (filenameStem.length >= 12 && !publicStems.has(filenameStem)) {
      identifiers.add(filenameStem)
    }
  }
  return identifiers
}

function containsProtectedOutputPath(candidate, identifiers) {
  const normalized = normalizePath(candidate).toLowerCase()
  return [...identifiers].some((identifier) => normalized.includes(identifier))
}

function inspectProtectedDocReferenceLeaks({
  root = ROOT,
  tracked = null,
  generatedRoots = GENERATED_ROOTS
} = {}) {
  const protectedPaths = discoverProtectedDocPaths(root)
  if (protectedPaths.length === 0) {
    throw new Error(
      "No anchored ignored documentation boundary was found in .gitignore"
    )
  }

  const trackedCandidates = (tracked ?? trackedFiles(root)).map(normalizePath)
  if (
    trackedCandidates.some((candidate) =>
      protectedPaths.some((protectedPath) => isWithin(candidate, protectedPath))
    )
  ) {
    throw new Error(TRACKED_PROTECTED_ERROR)
  }

  const candidates = new Set(trackedCandidates)
  const generatedCandidates = new Set()
  for (const generatedRoot of generatedRoots) {
    for (const filePath of collectFiles(resolve(root, generatedRoot), [], false)) {
      const candidate = normalizePath(relative(root, filePath))
      candidates.add(candidate)
      generatedCandidates.add(candidate)
    }
  }

  const protectedFilenames = collectProtectedFilenames(root, protectedPaths)
  const publicFilenames = new Set(
    [...candidates]
      .map(normalizePath)
      .filter(
        (candidate) =>
          !protectedPaths.some((protectedPath) =>
            isWithin(candidate, protectedPath)
          )
      )
      .map((candidate) => basename(candidate).toLowerCase())
  )
  const publicStems = new Set([...publicFilenames].map(stem))
  // A generated data projection may intentionally share its output filename
  // with a protected working copy. Such a public filename is not itself a
  // private-doc reference, so only use protected-only names as content needles.
  const protectedReferenceFilenames = new Set(
    [...protectedFilenames].filter((name) => !publicFilenames.has(name))
  )
  const outputPathIdentifiers = protectedOutputIdentifiers(
    protectedPaths,
    protectedReferenceFilenames,
    publicStems
  )
  // A public asset may legitimately share a stem with a protected working
  // document. That is not a leak by itself, but if its contents independently
  // reference the protected boundary its path still must be redacted.
  const redactionIdentifiers = protectedOutputIdentifiers(
    protectedPaths,
    protectedFilenames
  )

  const findings = new Map()
  const addFinding = (path, reason, redactPath) => {
    const finding = findings.get(path) ?? {
      path,
      reasons: new Set(),
      redactPath: false
    }
    finding.reasons.add(reason)
    finding.redactPath ||= redactPath
    findings.set(path, finding)
  }
  for (const candidate of candidates) {
    const normalizedCandidate = normalizePath(candidate)
    if (normalizedCandidate === ".gitignore") continue
    if (
      protectedPaths.some((protectedPath) =>
        isWithin(normalizedCandidate, protectedPath)
      )
    ) {
      continue
    }

    const absolutePath = resolve(root, normalizedCandidate)
    const pathNeedsRedaction = containsProtectedOutputPath(
      normalizedCandidate,
      redactionIdentifiers
    )
    if (
      generatedCandidates.has(normalizedCandidate) &&
      containsProtectedOutputPath(normalizedCandidate, outputPathIdentifiers)
    ) {
      addFinding(normalizedCandidate, "generated-path", true)
    }
    if (
      !existsSync(absolutePath) ||
      !lstatSync(absolutePath).isFile() ||
      !TEXT_EXTENSIONS.has(extname(absolutePath))
    ) {
      continue
    }

    const source = readFileSync(absolutePath, "utf8")
    if (
      containsProtectedReference(
        source,
        protectedPaths,
        protectedReferenceFilenames
      )
    ) {
      addFinding(normalizedCandidate, "content-reference", pathNeedsRedaction)
    }
  }

  return [...findings.values()]
}

/** Return safe public-file diagnostics without exposing protected identities. */
export function findProtectedDocReferenceLeaks(options = {}) {
  const findings = inspectProtectedDocReferenceLeaks(options)
  return [
    ...new Set(
      findings.map((finding) =>
        finding.redactPath ? REDACTED_GENERATED_PATH : finding.path
      )
    )
  ].sort()
}

/** Summarize findings by public output root and reason without returning paths. */
export function summarizeProtectedDocReferenceLeaks(options = {}) {
  const generatedRoots = options.generatedRoots ?? GENERATED_ROOTS
  const findings = inspectProtectedDocReferenceLeaks(options)
  const rows = new Map()
  for (const finding of findings) {
    const scope = generatedRoots.find((root) => isWithin(finding.path, root)) ?? "tracked"
    for (const reason of finding.reasons) {
      const key = `${scope}\u0000${reason}`
      const row = rows.get(key) ?? {
        scope,
        reason,
        count: 0,
        redactedCount: 0
      }
      row.count += 1
      if (finding.redactPath) row.redactedCount += 1
      rows.set(key, row)
    }
  }
  return [...rows.values()].sort((left, right) =>
    `${left.scope}:${left.reason}`.localeCompare(`${right.scope}:${right.reason}`)
  )
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  let leaks
  try {
    leaks = findProtectedDocReferenceLeaks()
  } catch (error) {
    if (error instanceof Error && error.message === TRACKED_PROTECTED_ERROR) {
      console.error(`Protected documentation boundary violation: ${error.message}.`)
      process.exit(1)
    }
    throw error
  }
  if (leaks.length > 0) {
    console.error(
      "Protected documentation references leaked into public files:"
    )
    for (const leak of leaks) console.error(`- ${leak}`)
    process.exit(1)
  }
  console.log("✓ protected documentation boundaries are clean")
}
