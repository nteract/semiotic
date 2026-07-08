#!/usr/bin/env node
/**
 * Context7 manifest freshness check.
 *
 * `context7.json` lives in the repo root and is read by Context7's
 * indexer to populate the agent-facing documentation surface. Drift
 * categories this gate guards against:
 *
 *   1. Format errors that Context7 silently swallows but ship a
 *      partially-rejected index. The submission flow's most-bitten
 *      mistake is the 255-char-per-rule limit; rules over the limit
 *      get dropped on parse, the project still indexes, and the agent
 *      ends up missing the very guidance the rule was supposed to
 *      provide.
 *
 *   2. Broken references — `folders` pointing at paths that have been
 *      moved or renamed. Context7 falls back to scanning the whole
 *      repo on a missing folder, which surfaces internal docs the
 *      `folders` allowlist was meant to curate out.
 *
 *   3. Sub-path drift — rule 0 enumerates the stable public sub-path
 *      imports (`semiotic/xy`, `semiotic/ordinal`, etc.). When
 *      `package.json` exports a new stable sub-path, the rule should
 *      mention it; when an export disappears, the rule must drop the
 *      stale name. Temporary experimental sub-paths are intentionally
 *      ignored.
 *
 * Run via `npm run check:context7`. Wired into release/prepublish and
 * the CI workflow so a stale manifest can't merge unnoticed.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const manifestPath = join(repoRoot, "context7.json")

const errors = []
const warnings = []

function fail(msg) {
  errors.push(msg)
}

function warn(msg) {
  warnings.push(msg)
}

if (!existsSync(manifestPath)) {
  console.error("✗ context7.json is missing from the repo root")
  process.exit(1)
}

let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
} catch (e) {
  console.error(`✗ context7.json is not valid JSON: ${e.message}`)
  process.exit(1)
}

// ── Required fields ────────────────────────────────────────────────────
for (const field of ["projectTitle", "description"]) {
  if (typeof manifest[field] !== "string" || manifest[field].length === 0) {
    fail(`${field} must be a non-empty string`)
  }
}

// ── Rule length limit ─────────────────────────────────────────────────
// Context7 rejects rules over 255 chars at parse time and silently
// drops them from the index. This is the single most common
// submission failure mode.
const MAX_RULE_LENGTH = 255
if (Array.isArray(manifest.rules)) {
  manifest.rules.forEach((rule, i) => {
    if (typeof rule !== "string") {
      fail(`rules[${i}] must be a string`)
      return
    }
    if (rule.length > MAX_RULE_LENGTH) {
      fail(`rules[${i}] is ${rule.length} chars; max is ${MAX_RULE_LENGTH}`)
    }
  })
} else if (manifest.rules !== undefined) {
  fail("rules must be an array of strings (or omitted)")
}

// ── Folder references resolve ─────────────────────────────────────────
if (Array.isArray(manifest.folders)) {
  for (const entry of manifest.folders) {
    if (typeof entry !== "string") {
      fail(`folders entry "${entry}" must be a string`)
      continue
    }
    const abs = join(repoRoot, entry)
    if (!existsSync(abs)) {
      fail(`folders entry "${entry}" does not exist on disk`)
    }
  }
}

// ── Sub-path drift vs package.json exports ────────────────────────────
// Rule 0 enumerates the public sub-path entry points; cross-check that
// every sub-path package.json exports also appears in the rule, and
// that the rule doesn't name a sub-path that has been removed.
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))
// Experimental preview subpaths are intentionally omitted from Context7 so
// agents do not treat temporary collaborator APIs as stable import guidance.
const IGNORED_SUBPATHS = new Set(["experimental"])
const exportedSubpaths = Object.keys(pkg.exports || {})
  .filter((k) => k.startsWith("./") && k !== "./package.json")
  .map((k) => k.slice(2))
  .filter((k) => !IGNORED_SUBPATHS.has(k))

const subpathRule = (manifest.rules || []).find((r) => r.includes("sub-path"))
if (!subpathRule) {
  warn(
    "no rule mentions sub-paths — if the public entry points changed, " +
      "consider documenting them in `rules` so agents see the import boundary",
  )
} else {
  const missingFromRule = exportedSubpaths.filter(
    (sp) => !subpathRule.includes(`/${sp}`),
  )
  const phantomInRule = []
  // Pull `/word` and nested `/word/word` tokens out of the rule text and compare against the
  // exported set. The rule format is loose ("`semiotic/xy`, `/ordinal`,
  // …") so we look for `/<sub-path>` occurrences.
  const ruleTokens = [...subpathRule.matchAll(/\/([a-z][a-z-]*(?:\/[a-z][a-z-]*)*)/g)].map(
    (m) => m[1],
  )
  for (const tok of ruleTokens) {
    if (!exportedSubpaths.includes(tok)) phantomInRule.push(tok)
  }
  if (missingFromRule.length) {
    fail(
      `sub-path rule is missing entries that package.json exports: ${missingFromRule.join(
        ", ",
      )}`,
    )
  }
  if (phantomInRule.length) {
    fail(
      `sub-path rule mentions entries that package.json no longer exports: ${[
        ...new Set(phantomInRule),
      ].join(", ")}`,
    )
  }
}

// ── Output ────────────────────────────────────────────────────────────
if (warnings.length) {
  for (const msg of warnings) console.warn(`  ⚠ ${msg}`)
}
if (errors.length) {
  console.error("\n✗ context7.json drift detected:\n")
  for (const msg of errors) console.error(`  - ${msg}`)
  console.error(
    "\nFix: edit context7.json. The 255-char rule limit and missing-folder " +
      "checks catch the two failure modes Context7's submission flow has " +
      "actually rejected on this repo.",
  )
  process.exit(1)
}

console.log(
  `✓ context7.json clean (${manifest.rules?.length ?? 0} rules, ${manifest.folders?.length ?? 0} folders, ${exportedSubpaths.length} exported sub-paths)`,
)
