#!/usr/bin/env node
/**
 * JSDoc coverage gate for the public HOC surface.
 *
 * Enforces a minimum agent-visible documentation surface for every HOC
 * registered in `chartSpecs.ts`:
 *
 *   1. The HOC's source file has a `/** … * /` block immediately
 *      preceding the `export` of the same-named identifier.
 *   2. That block contains ≥2 `@example` blocks. Examples are the
 *      single largest lever for both human onboarding and agent
 *      tool-calling — TypeDoc surfaces them on `/api/typedoc`,
 *      generated AI docs include them verbatim, and the MCP
 *      `getSchema` resource reads them for prompt context.
 *   3. The first non-empty line of the block is a one-line summary
 *      (a sentence, not a `@tag`). This is what TypeDoc renders as
 *      the component's "blurb" on `/api/charts`.
 *
 * Why this gate exists: the previous baseline ("TypeDoc resolves the
 * type") only proved the JSDoc parsed, not that any of it was useful.
 * Today's 38/38 ≥2-example coverage was hand-audited in 2026-04-26 and
 * has no regression detection — a new HOC could ship with zero
 * `@example` blocks and nothing in CI would notice. This gate locks
 * in the audit so newly-added HOCs are required to clear the same bar.
 *
 * Run via `npm run check:jsdoc-coverage`. Wired into `release:check`,
 * `prepublishOnly`, and the CI workflow.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

// ── Walk chartSpecs.ts to discover the canonical HOC list ──────────────
//
// Mirrors what `check:chart-specs` already validates is the source of
// truth. Parsing the literal `name`/`category` pairs (rather than
// importing the TS module) keeps this script dependency-free and
// avoids a tsx compile step.
//
// chartSpecs.ts composes CHART_SPECS from per-family files
// (chartSpecsXY.ts, chartSpecsOrdinal.ts, ...) rather than declaring
// chart entries itself, so discover those files from its own imports
// and walk each in turn.

const chartSpecsDir = join(repoRoot, "src/components/charts/shared")
const chartSpecsIndexPath = join(chartSpecsDir, "chartSpecs.ts")
const chartSpecsIndexSource = readFileSync(chartSpecsIndexPath, "utf8")
const chartSpecFiles = [...chartSpecsIndexSource.matchAll(/from\s+"\.\/(chartSpecs\w+)"/g)]
  .map((match) => join(chartSpecsDir, `${match[1]}.ts`))

const SPEC_BLOCK_RE = /^ {2}([A-Z][A-Za-z]+):\s*\{\n([\s\S]*?)^ {2}\},?$/gm
const NAME_RE = /^\s*name:\s*"([^"]+)"/m
const CATEGORY_RE = /^\s*category:\s*"([^"]+)"/m

const hocs = []
for (const chartSpecsPath of chartSpecFiles) {
  const chartSpecsSource = readFileSync(chartSpecsPath, "utf8")
  for (const match of chartSpecsSource.matchAll(SPEC_BLOCK_RE)) {
    const key = match[1]
    const body = match[2]
    const nameMatch = NAME_RE.exec(body)
    const categoryMatch = CATEGORY_RE.exec(body)
    if (!nameMatch || !categoryMatch) continue
    const name = nameMatch[1]
    // The keyword "category" inside CHART_SPECS uses one of: xy, ordinal,
    // network, geo, realtime. The realtime charts live in
    // src/components/charts/realtime/ even though they're categorized as
    // "realtime" in the spec — the directory and category line up by
    // convention.
    const category = categoryMatch[1]
    const filePath = join(repoRoot, `src/components/charts/${category}/${name}.tsx`)
    if (!existsSync(filePath)) {
      // Defer this to check:chart-specs / check:surface — they catch
      // missing files with a clearer error. We only fail when the file
      // exists but its JSDoc is insufficient.
      continue
    }
    hocs.push({ name, category, filePath, key })
  }
}

if (hocs.length === 0) {
  console.error("✗ check:jsdoc-coverage found 0 HOCs in chartSpecs.ts — file structure may have changed")
  process.exit(1)
}

// ── Per-HOC audit ──────────────────────────────────────────────────────

const errors = []

for (const hoc of hocs) {
  let source = readFileSync(hoc.filePath, "utf8")
  let lookupName = hoc.name

  // Locate the export of the HOC identifier. Three forms appear in the
  // codebase:
  //   - `export const <Name> = ...`
  //   - `export function <Name>(`
  //   - `function <Name>(...)` followed by `export { <Name> }`
  // The third form's JSDoc lives above the function declaration, not
  // the re-export, so we look for the function/const declaration first.
  //
  // Backwards-compat aliases (`export const Foo = Bar` where `Bar` is
  // declared above with full JSDoc) are followed once: the gate audits
  // the canonical declaration. The alias's own `@deprecated`-style
  // block intentionally stays minimal and is not the right surface for
  // examples.
  const aliasRegex = new RegExp(
    `^export\\s+const\\s+${lookupName}\\s*=\\s*([A-Z][A-Za-z]*)\\s*$`,
    "m",
  )
  const aliasMatch = aliasRegex.exec(source)
  if (aliasMatch && aliasMatch[1] !== lookupName) {
    lookupName = aliasMatch[1]
  }

  const declRegex = new RegExp(
    `^(?:export\\s+)?(?:function|const|interface)\\s+${lookupName}\\b`,
    "m",
  )
  const declMatch = declRegex.exec(source)
  if (!declMatch) {
    errors.push({ hoc, msg: `No \`function ${lookupName}\` / \`const ${lookupName}\` declaration found` })
    continue
  }

  // Walk backwards from the declaration to the closest preceding
  // `*/`. Everything between the prior `/**` and `*/` is the JSDoc
  // block. Tolerates blank lines and `"use client"` directives between
  // the block and the declaration.
  const before = source.slice(0, declMatch.index)
  const closeIdx = before.lastIndexOf("*/")
  if (closeIdx === -1) {
    errors.push({ hoc, msg: `No JSDoc block precedes \`${hoc.name}\`` })
    continue
  }
  // The text between `*/` and the declaration must not contain another
  // top-level statement — otherwise the JSDoc belongs to something else.
  const between = before.slice(closeIdx + 2).trim()
  if (between !== "" && !/^"use client"/.test(between) && !/^\s*$/.test(between)) {
    errors.push({ hoc, msg: `JSDoc block is not adjacent to \`${hoc.name}\` (interleaved code: ${JSON.stringify(between.slice(0, 80))}…)` })
    continue
  }

  const openIdx = before.lastIndexOf("/**")
  if (openIdx === -1 || openIdx > closeIdx) {
    errors.push({ hoc, msg: `Could not locate JSDoc \`/**\` opener for \`${hoc.name}\`` })
    continue
  }
  const block = before.slice(openIdx, closeIdx + 2)

  // ── Rule 1: ≥2 @example blocks ──────────────────────────────────────
  const exampleCount = (block.match(/@example\b/g) || []).length
  if (exampleCount < 2) {
    errors.push({
      hoc,
      msg: `Has ${exampleCount} \`@example\` block(s); minimum is 2. Examples drive TypeDoc, /api/charts, generated AI docs, and MCP getSchema prompt context — a single example doesn't show variation.`,
    })
  }

  // ── Rule 2: top-line summary present ────────────────────────────────
  // First non-empty line after `/**` that isn't a tag line. The
  // standard JSDoc shape on the HOCs is:
  //   /**
  //    * BarChart - Visualize categorical data ...
  //    * ...
  // so a blank "/** *" → "* @example …" with no prose body fails this.
  const lines = block.split("\n")
  let hasSummary = false
  for (let i = 1; i < lines.length; i++) {
    const stripped = lines[i].replace(/^\s*\*\s?/, "").trim()
    if (stripped === "" || stripped.startsWith("/")) continue
    if (stripped.startsWith("@")) break
    hasSummary = true
    break
  }
  if (!hasSummary) {
    errors.push({
      hoc,
      msg: `JSDoc lacks a top-line summary before the first \`@\` tag. TypeDoc renders this as the component blurb on /api/charts.`,
    })
  }
}

// ── Output ────────────────────────────────────────────────────────────

if (errors.length) {
  console.error(`\n✗ JSDoc coverage gate failed for ${errors.length} HOC issue(s):\n`)
  for (const { hoc, msg } of errors) {
    console.error(`  - ${hoc.name} (${hoc.filePath.replace(repoRoot + "/", "")})`)
    console.error(`    ${msg}`)
  }
  console.error(
    "\nFix the JSDoc on each HOC above. Each HOC must have:" +
      "\n  • A top-line one-sentence summary (TypeDoc → /api/charts)." +
      "\n  • At least 2 `@example` blocks showing meaningfully different usage.",
  )
  process.exit(1)
}

console.log(`✓ JSDoc coverage clean across ${hocs.length} HOCs (≥2 @example blocks + summary).`)
