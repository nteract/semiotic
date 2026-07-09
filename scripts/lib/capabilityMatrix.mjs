/**
 * Parse the capability matrix out of the chart-spec registry.
 *
 * Three call sites consume this:
 *   1. `check-capabilities.mjs` — CI gate that locks runtime ↔ matrix.
 *   2. `generate-capabilities-md.mjs` — emits `docs/capabilities.md`.
 *   3. `generate-capabilities-json.mjs` — emits `ai/capabilities.json`
 *      so the AI suggestion path can filter by capability without
 *      re-parsing TS at runtime.
 *
 * Keeping the parser in one place means a chartSpecs schema change
 * touches one regex set, not three.
 *
 * `chartSpecs.ts` itself no longer declares chart entries — it composes
 * `CHART_SPECS` from per-family files (`chartSpecsXY.ts`,
 * `chartSpecsOrdinal.ts`, ...) via `...FAMILY_CHART_SPECS` spreads. Discover
 * those files from chartSpecs.ts's own imports so this stays in sync as
 * families are added/renamed, then parse each the same way the single file
 * used to be parsed.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..", "..")
const SPECS_DIR = path.join(ROOT, "src/components/charts/shared")
const SPECS_INDEX_PATH = path.join(SPECS_DIR, "chartSpecs.ts")

function specFilePaths() {
  const indexSource = fs.readFileSync(SPECS_INDEX_PATH, "utf8")
  const paths = []
  const specFileRegex = /from\s+"\.\/(chartSpecs\w+)"/g
  let m
  while ((m = specFileRegex.exec(indexSource))) {
    const specPath = path.join(SPECS_DIR, `${m[1]}.ts`)
    if (fs.existsSync(specPath)) paths.push(specPath)
  }
  return paths
}

/**
 * Read the chart-spec family files and return a sorted array of capability
 * entries. Each entry has the same shape consumers expect:
 *   { name, category, legend, selection, linkedHover, push, ssr,
 *     colorModel, layoutMode, features }
 */
export function parseCapabilityMatrix() {
  const entries = []
  const entryStart = /^ {2}([A-Z][A-Za-z]+):\s*\{$/gm
  for (const specPath of specFilePaths()) {
    const text = fs.readFileSync(specPath, "utf8")
    let m
    while ((m = entryStart.exec(text))) {
      const name = m[1]
      let i = text.indexOf("{", m.index) + 1
      let depth = 1
      while (i < text.length && depth > 0) {
        if (text[i] === "{") depth++
        else if (text[i] === "}") depth--
        i++
      }
      const body = text.slice(m.index, i)
      const cap = body.match(/capabilities:\s*\{([\s\S]*?)\n\s{4}\}/)
      if (!cap) continue
      const get = (key) => {
        const r = cap[1].match(new RegExp(`${key}:\\s*([^,\\n]+)`))
        return r ? r[1].trim() : null
      }
      const arr = (key) => {
        const r = cap[1].match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`))
        if (!r) return []
        return r[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean)
      }
      const cat = body.match(/category:\s*"([^"]+)"/)
      entries.push({
        name,
        category: cat ? cat[1] : "?",
        legend: get("supportsLegend") === "true",
        selection: get("supportsSelection") === "true",
        linkedHover: get("supportsLinkedHover") === "true",
        push: get("supportsPush") === "true",
        ssr: get("supportsSSR") === "true",
        colorModel: (get("colorModel") || "").replace(/^"|"$/g, ""),
        layoutMode: (get("layoutMode") || "").replace(/^"|"$/g, ""),
        features: arr("specialFeatures"),
      })
    }
  }

  // Sort by category then alphabetical within category — same order
  // both md/json consumers expect.
  const ORDER = ["xy", "ordinal", "network", "geo", "realtime", "physics", "value"]
  entries.sort((a, b) => {
    const ai = ORDER.indexOf(a.category)
    const bi = ORDER.indexOf(b.category)
    if (ai !== bi) return ai - bi
    return a.name.localeCompare(b.name)
  })

  return entries
}

/** Category sort order used by the matrix output. */
export const CATEGORY_ORDER = ["xy", "ordinal", "network", "geo", "realtime", "physics", "value"]
