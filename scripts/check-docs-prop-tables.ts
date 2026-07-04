#!/usr/bin/env tsx
/**
 * Prop-table drift gate (docs strategy Phase 1).
 *
 * The interactive chart pages hand-author their prop tables. That's fine for
 * curation — a human decides which props matter and how to describe them — but
 * it means a table can silently drift from the canonical surface: drop a
 * required prop, or document a prop the chart no longer has.
 *
 * This gate resolves each chart's prop surface from `chartSpecs.ts`
 * (`ownProps` overlaid on resolved `PROP_BAGS`) — the same registry that backs
 * validation, the schema, and the MCP tools — and checks the documented prop
 * names against it. It deliberately does NOT replace the hand tables or compare
 * types/defaults (too noisy to gate); it enforces the two robust invariants:
 *
 *   1. Every statically-`required` prop is documented on the chart's page.
 *   2. (Reported, non-failing) props documented but absent from chartSpecs —
 *      a signal that either chartSpecs is missing a prop or the docs invented
 *      one. Surfaced so the gap can be closed deliberately, not gated (some
 *      real props legitimately live outside the canonical LLM surface).
 *
 * Run: npx tsx scripts/check-docs-prop-tables.ts
 */

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseSync } from "@babel/core"
import { CHART_SPECS, PROP_BAGS } from "../src/components/charts/shared/chartSpecs.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const chartsDir = join(repoRoot, "docs/src/pages/charts")

const errors: string[] = []
const note = (m: string) => errors.push(m)

// Charts documented somewhere other than a dedicated <Name>Page.jsx — kept in
// sync with check-docs-coverage's DOCS_PAGE_BURN_DOWN.
const NO_PAGE = new Set(["RidgelinePlot", "TemporalHistogram", "MinimapChart"])

// ── Resolve the canonical prop surface per chart ───────────────────────────

function resolvedPropNames(spec: (typeof CHART_SPECS)[string]): Set<string> {
  const merged: Record<string, unknown> = {}
  for (const bag of spec.propBags) Object.assign(merged, PROP_BAGS[bag])
  Object.assign(merged, spec.ownProps)
  return new Set(Object.keys(merged))
}

// ── Extract documented prop-row names from a page's AST ─────────────────────
//
// A prop table is an array of objects shaped like `{ name, type, ... }`. That
// `name`+`type` shape distinguishes it from the page's other object arrays
// (`related` rows are `{ name, path }`; linkedHover configs are `{ name, mode }`),
// so we collect names only from arrays whose objects carry both keys.

function objectKeys(node: any): Set<string> {
  const keys = new Set<string>()
  if (node?.type !== "ObjectExpression") return keys
  for (const prop of node.properties) {
    if (prop.type !== "ObjectProperty") continue
    const k = prop.key
    if (k.type === "Identifier") keys.add(k.name)
    else if (k.type === "StringLiteral") keys.add(k.value)
  }
  return keys
}

function stringPropValue(node: any, key: string): string | null {
  if (node?.type !== "ObjectExpression") return null
  for (const prop of node.properties) {
    if (prop.type !== "ObjectProperty") continue
    const k = prop.key
    const name = k.type === "Identifier" ? k.name : k.type === "StringLiteral" ? k.value : null
    if (name === key && prop.value.type === "StringLiteral") return prop.value.value
  }
  return null
}

function documentedPropNames(source: string): Set<string> {
  const ast = parseSync(source, {
    parserOpts: { plugins: ["jsx"], sourceType: "module" },
    babelrc: false,
    configFile: false,
  })
  const names = new Set<string>()
  const visit = (node: any) => {
    if (!node || typeof node !== "object") return
    if (node.type === "ArrayExpression") {
      const objs = node.elements.filter((e: any) => e?.type === "ObjectExpression")
      // Prop-table array: its objects carry both `name` and `type`.
      const looksLikePropTable =
        objs.length > 0 &&
        objs.every((o: any) => {
          const keys = objectKeys(o)
          return keys.has("name") && keys.has("type")
        })
      if (looksLikePropTable) {
        for (const o of objs) {
          const n = stringPropValue(o, "name")
          if (n) names.add(n)
        }
      }
    }
    for (const key of Object.keys(node)) {
      const child = (node as any)[key]
      if (Array.isArray(child)) child.forEach(visit)
      else if (child && typeof child === "object" && child.type) visit(child)
    }
  }
  visit(ast)
  return names
}

// ── Run ────────────────────────────────────────────────────────────────────

const pageFiles = existsSync(chartsDir)
  ? readdirSync(chartsDir).filter((f) => f.endsWith("Page.jsx"))
  : []
const pageCharts = new Set(pageFiles.map((f) => f.replace(/Page\.jsx$/, "")))

let checked = 0
const completenessGaps: string[] = []

for (const [name, spec] of Object.entries(CHART_SPECS)) {
  if (!pageCharts.has(name)) {
    if (!NO_PAGE.has(name)) {
      note(`${name}: no chart page found to verify (and not in the documented-elsewhere set).`)
    }
    continue
  }
  const source = readFileSync(join(chartsDir, `${name}Page.jsx`), "utf8")
  let documented: Set<string>
  try {
    documented = documentedPropNames(source)
  } catch (e) {
    note(`${name}Page.jsx: could not parse to verify prop table (${(e as Error).message.split("\n")[0]}).`)
    continue
  }
  if (documented.size === 0) {
    note(`${name}Page.jsx: no prop-table array detected (expected an array of { name, type, … } rows).`)
    continue
  }
  checked++

  // Invariant 1: every required prop is documented.
  const missingRequired = spec.required.filter((r) => !documented.has(r))
  if (missingRequired.length > 0) {
    note(
      `${name}: required prop(s) not documented on the page: ${missingRequired.join(", ")}. ` +
        `chartSpecs marks them required — the prop table must list them.`,
    )
  }

  // Signal 2 (non-failing): documented props absent from chartSpecs.
  const canonical = resolvedPropNames(spec)
  const docOnly = [...documented].filter((p) => !canonical.has(p))
  if (docOnly.length > 0) completenessGaps.push(`${name}: ${docOnly.join(", ")}`)
}

// The completeness gaps are a real backlog (chartSpecs missing common props,
// thin geo ownProps, doc-only props) but they don't gate — printing all of them
// on every CI run is noise. Surface them only with --verbose.
if (completenessGaps.length > 0 && process.argv.includes("--verbose")) {
  console.log(
    "ℹ docs document props absent from chartSpecs (close the gap in chartSpecs, or accept as doc-only):",
  )
  for (const g of completenessGaps) console.log(`    ${g}`)
  console.log("")
}

if (errors.length) {
  console.error("✗ prop-table drift detected:\n")
  for (const m of errors) console.error(`  - ${m}\n`)
  process.exit(1)
}

console.log(
  `✓ prop tables clean: ${checked} chart page(s) document every required prop from chartSpecs.ts ` +
    `(${completenessGaps.length} with doc-only props flagged above for follow-up).`,
)
