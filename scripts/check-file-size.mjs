#!/usr/bin/env node
/**
 * Source file size gate — runs in CI.
 *
 * Hard limits (physical line counts, same as `wc -l`):
 *   production source: 800 lines (warn from 500)
 *   tests:            1500 lines (warn from 800)
 *
 * Best-practice context: ESLint's max-lines defaults to 300 and docs
 * recommend 100–500. Visualization / stream-frame code is denser, so
 * Semiotic uses a higher hard ceiling with a ratchet allowlist for the
 * existing mega-files we are actively splitting.
 *
 * Escape hatches (corner cases only):
 *   1. Allowlist entry in `scripts/file-size-policy.json` with `path`,
 *      `maxLines` (ratchet ceiling), and a non-empty `reason`.
 *   2. Inline marker in the first 40 lines of a file:
 *        // file-size-limit: allow — short reason
 *      Prefer the allowlist so exemptions stay reviewable in one place.
 *      Generated fixtures may use the inline form.
 *
 * Flags:
 *   --update-allowlist   Rewrite allowlist ceilings from current sizes
 *                        (adds over-limit files, drops files now under limit).
 *   --json               Machine-readable report on stdout.
 *   --verbose            List every soft-warning (near-limit) file.
 *   --warn-only          Print violations but exit 0 (local exploration).
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs"
import { dirname, join, relative, resolve, extname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const policyPath = join(__dirname, "file-size-policy.json")

const updateAllowlist = process.argv.includes("--update-allowlist")
const jsonOut = process.argv.includes("--json")
const warnOnly = process.argv.includes("--warn-only")
const verbose = process.argv.includes("--verbose")

const INLINE_ALLOW_RE =
  /file-size-limit:\s*allow(?:\s*[—–-]\s*|\s+)(.{8,})/i
const TEST_FILE_RE = /\.(test|spec)\.[^.]+$/

function loadPolicy() {
  if (!existsSync(policyPath)) {
    console.error(`Missing ${relative(repoRoot, policyPath)}`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(policyPath, "utf8"))
}

function minimatchSimple(path, pattern) {
  // Tiny glob subset: **/foo, *.bar, exact, prefix/**
  if (pattern.startsWith("**/") && pattern.endsWith("/**")) {
    const mid = pattern.slice(3, -3)
    return path.includes(`/${mid}/`) || path.startsWith(`${mid}/`)
  }
  if (pattern.startsWith("**/")) {
    const suf = pattern.slice(3)
    return path === suf || path.endsWith(`/${suf}`) || path.endsWith(suf)
  }
  if (pattern.endsWith("/**")) {
    const pre = pattern.slice(0, -3)
    return path === pre || path.startsWith(`${pre}/`)
  }
  if (pattern.includes("*")) {
    const re = new RegExp(
      "^" +
        pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*") +
        "$"
    )
    return re.test(path)
  }
  return path === pattern
}

function isExcluded(relPath, exclude) {
  return (exclude || []).some((pat) => minimatchSimple(relPath, pat))
}

function walk(dir, extensions, exclude, files = []) {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "build") {
      continue
    }
    const full = join(dir, entry)
    const rel = relative(repoRoot, full).replace(/\\/g, "/")
    if (isExcluded(rel, exclude)) continue
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, extensions, exclude, files)
    } else if (extensions.includes(extname(entry))) {
      files.push(full)
    }
  }
  return files
}

function countLines(filePath) {
  const buf = readFileSync(filePath)
  if (buf.length === 0) return 0
  let n = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 10) n++
  }
  // Files that do not end with a newline still count their last line.
  if (buf[buf.length - 1] !== 10) n++
  return n
}

function isTestPath(relPath) {
  return TEST_FILE_RE.test(relPath) || relPath.includes("/__tests__/")
}

function readInlineAllow(filePath) {
  const head = readFileSync(filePath, "utf8").split(/\r?\n/).slice(0, 40)
  for (const line of head) {
    const m = line.match(INLINE_ALLOW_RE)
    if (m) {
      const reason = m[1].trim().replace(/\*\/\s*$/, "").trim()
      if (reason.length >= 8) return reason
    }
  }
  return null
}

function classify(relPath, policy) {
  return isTestPath(relPath) ? policy.test : policy.production
}

function main() {
  const policy = loadPolicy()
  const roots = policy.roots || ["src"]
  const extensions = policy.extensions || [".ts", ".tsx", ".js", ".jsx"]
  const exclude = policy.exclude || []
  const allowByPath = new Map(
    (policy.allowlist || []).map((e) => [e.path.replace(/\\/g, "/"), e])
  )

  const files = roots.flatMap((root) =>
    walk(join(repoRoot, root), extensions, exclude)
  )

  const violations = []
  const growth = []
  const staleAllow = []
  const warnings = []
  const inlineExempt = []
  const measured = []

  for (const full of files) {
    const rel = relative(repoRoot, full).replace(/\\/g, "/")
    const lines = countLines(full)
    const band = classify(rel, policy)
    const hard = band.maxLines
    const warnAt = band.warnLines ?? hard
    const allow = allowByPath.get(rel)
    const inlineReason = readInlineAllow(full)

    measured.push({ path: rel, lines, hard, isTest: isTestPath(rel) })

    if (lines > hard) {
      if (allow) {
        if (lines > allow.maxLines) {
          growth.push({
            path: rel,
            lines,
            maxLines: allow.maxLines,
            hard,
            reason: allow.reason
          })
        }
        // still over hard but within ratchet — ok
      } else if (inlineReason) {
        inlineExempt.push({ path: rel, lines, hard, reason: inlineReason })
      } else {
        violations.push({ path: rel, lines, hard })
      }
    } else if (allow) {
      // File is back under the hard limit — allowlist entry is dead weight.
      staleAllow.push({
        path: rel,
        lines,
        hard,
        maxLines: allow.maxLines
      })
    } else if (lines > warnAt) {
      warnings.push({ path: rel, lines, hard, warnAt })
    }
  }

  if (updateAllowlist) {
    const next = measured
      .filter((m) => m.lines > m.hard)
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((m) => {
        const prev = allowByPath.get(m.path)
        return {
          path: m.path,
          // Snap ceiling to the current size. The gate forbids growth above
          // maxLines, so regenerating after a shrink tightens the ratchet.
          maxLines: m.lines,
          reason:
            prev?.reason ||
            `Grandfathered ${m.isTest ? "test" : "production"} file above hard limit (${m.hard}). Split on meaningful touch; do not grow past maxLines.`
        }
      })

    const nextPolicy = {
      ...policy,
      allowlist: next
    }
    writeFileSync(policyPath, `${JSON.stringify(nextPolicy, null, 2)}\n`)
    console.log(
      `Updated ${relative(repoRoot, policyPath)}: ${next.length} allowlist entries (was ${allowByPath.size}).`
    )
    process.exit(0)
  }

  // Orphan allowlist paths (deleted files)
  const measuredSet = new Set(measured.map((m) => m.path))
  const orphans = [...allowByPath.keys()].filter((p) => !measuredSet.has(p))

  const report = {
    limits: {
      production: policy.production,
      test: policy.test
    },
    scanned: measured.length,
    violations,
    growth,
    staleAllow,
    orphans,
    warnings,
    inlineExempt
  }

  if (jsonOut) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  }

  let failed = false

  if (violations.length) {
    failed = true
    console.error(
      `\n✗ ${violations.length} file(s) exceed the hard line limit without an allowlist entry:\n`
    )
    for (const v of violations.sort((a, b) => b.lines - a.lines)) {
      console.error(`  ${v.lines}/${v.hard}  ${v.path}`)
    }
    console.error(`
Split the module (preferred) or, only when a split truly does not make sense,
add an allowlist entry to scripts/file-size-policy.json:

  {
    "path": "src/path/to/file.ts",
    "maxLines": <current line count>,
    "reason": "Why this file must stay large"
  }

Hard limits: production ${policy.production.maxLines}, tests ${policy.test.maxLines}.
See scripts/check-file-size.mjs for the full policy.
`)
  }

  if (growth.length) {
    failed = true
    console.error(
      `\n✗ ${growth.length} allowlisted file(s) grew past their ratchet ceiling:\n`
    )
    for (const g of growth.sort((a, b) => b.lines - a.lines)) {
      console.error(
        `  ${g.lines} lines (ceiling ${g.maxLines}, hard ${g.hard})  ${g.path}`
      )
      console.error(`    reason: ${g.reason}`)
    }
    console.error(`
Allowlisted files may not grow. Split out a helper module, or if growth is
unavoidable temporarily, raise maxLines only with a PR note explaining why
and a plan to split.
`)
  }

  if (staleAllow.length) {
    failed = true
    console.error(
      `\n✗ ${staleAllow.length} allowlist entr${staleAllow.length === 1 ? "y is" : "ies are"} under the hard limit (cleanup required):\n`
    )
    for (const s of staleAllow.sort((a, b) => a.path.localeCompare(b.path))) {
      console.error(
        `  ${s.lines}/${s.hard}  ${s.path}  (allowlist maxLines=${s.maxLines})`
      )
    }
    console.error(`
Remove these paths from scripts/file-size-policy.json, or run:
  npm run check:file-size -- --update-allowlist
`)
  }

  if (orphans.length) {
    failed = true
    console.error(
      `\n✗ ${orphans.length} allowlist path(s) no longer exist on disk:\n`
    )
    for (const p of orphans.sort()) console.error(`  ${p}`)
    console.error(`
Remove the stale entries from scripts/file-size-policy.json, or run:
  npm run check:file-size -- --update-allowlist
`)
  }

  if (inlineExempt.length && !jsonOut) {
    console.warn(
      `\n⚠ ${inlineExempt.length} file(s) exempted via inline file-size-limit marker:\n`
    )
    for (const e of inlineExempt) {
      console.warn(`  ${e.lines}/${e.hard}  ${e.path}`)
      console.warn(`    ${e.reason}`)
    }
  }

  // Soft warnings: one-line summary by default so CI stays readable.
  // Pass --verbose to list every near-limit file.
  if (warnings.length && !jsonOut && verbose) {
    console.warn(
      `\n⚠ ${warnings.length} file(s) approaching the hard limit (soft warning):\n`
    )
    for (const w of warnings.sort((a, b) => b.lines - a.lines)) {
      console.warn(`  ${w.lines}/${w.hard}  ${w.path}`)
    }
  }

  if (failed && !warnOnly) {
    process.exit(1)
  }

  if (!jsonOut) {
    const overHard = measured.filter((m) => m.lines > m.hard).length
    const warnNote =
      warnings.length === 0
        ? ""
        : `, ${warnings.length} soft warning${warnings.length === 1 ? "" : "s"}` +
          (verbose ? "" : " (npm run check:file-size -- --verbose)")
    console.log(
      `✓ file size gate passed (${measured.length} files scanned, ${overHard} allowlisted over hard limit${warnNote}).`
    )
  }
}

main()
