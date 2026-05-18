#!/usr/bin/env node
/**
 * Keep the React blog registry (`entries.js`) and the metadata-only
 * registry (`entries-meta.js`) in lockstep.
 *
 * `entries.js` imports entry bodies that contain JSX, so this check
 * reads the files as source instead of importing them in bare Node.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const ENTRIES_JS = resolve(ROOT, "docs/src/blog/entries.js")
const META_JS = resolve(ROOT, "docs/src/blog/entries-meta.js")

function fail(errors, message) {
  errors.push(message)
}

function parseJsonString(raw) {
  try {
    return JSON.parse(`"${raw}"`)
  } catch {
    return raw
  }
}

function readStringField(source, field) {
  const match = source.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"))
  return match ? parseJsonString(match[1]) : undefined
}

function readTags(source) {
  const match = source.match(/tags:\s*\[([^\]]*)\]/m)
  if (!match) return []
  return [...match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => parseJsonString(m[1]))
}

function readOgChart(source) {
  const match = source.match(/ogChart:\s*\{\s*component:\s*"([^"]+)"/m)
  return match ? { component: parseJsonString(match[1]) } : undefined
}

function parseEntryFile(path) {
  const source = readFileSync(path, "utf8")
  return {
    slug: readStringField(source, "slug"),
    title: readStringField(source, "title"),
    subtitle: readStringField(source, "subtitle"),
    author: readStringField(source, "author"),
    date: readStringField(source, "date"),
    tags: readTags(source),
    excerpt: readStringField(source, "excerpt"),
    ogChart: readOgChart(source),
  }
}

function parseEntriesRegistry() {
  const source = readFileSync(ENTRIES_JS, "utf8")
  const imports = new Map()
  for (const match of source.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s+"\.\/entries\/([^"]+)"/g)) {
    imports.set(match[1], resolve(ROOT, "docs/src/blog/entries", match[2]))
  }
  const arrayMatch = source.match(/export const blogEntries\s*=\s*\[([\s\S]*?)\]/m)
  if (!arrayMatch) throw new Error("Could not find `export const blogEntries = [...]`")
  const names = [...arrayMatch[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map((m) => m[1])
  return names.map((name) => {
    const entryPath = imports.get(name)
    if (!entryPath) return { name, missingImport: true }
    return { name, path: entryPath, ...parseEntryFile(entryPath) }
  })
}

function objectBlocksFromArray(source, marker) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Could not find ${marker}`)
  const arrayStart = source.indexOf("[", markerIndex)
  if (arrayStart < 0) throw new Error(`Could not find array for ${marker}`)
  const blocks = []
  let depth = 0
  let start = -1
  let quote = null
  for (let i = arrayStart + 1; i < source.length; i++) {
    const ch = source[i]
    if (quote) {
      if (ch === "\\") i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "\"" || ch === "'") {
      quote = ch
    } else if (ch === "{") {
      if (depth === 0) start = i
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0 && start >= 0) {
        blocks.push(source.slice(start, i + 1))
        start = -1
      }
    } else if (ch === "]" && depth === 0) {
      break
    }
  }
  return blocks
}

function parseMetaRegistry() {
  const source = readFileSync(META_JS, "utf8")
  return objectBlocksFromArray(source, "blogEntriesMeta").map((block) => ({
    slug: readStringField(block, "slug"),
    title: readStringField(block, "title"),
    subtitle: readStringField(block, "subtitle"),
    author: readStringField(block, "author"),
    date: readStringField(block, "date"),
    tags: readTags(block),
    excerpt: readStringField(block, "excerpt"),
    ogChart: readOgChart(block),
  }))
}

const errors = []

if (!existsSync(ENTRIES_JS)) fail(errors, "docs/src/blog/entries.js is missing")
if (!existsSync(META_JS)) fail(errors, "docs/src/blog/entries-meta.js is missing")

let entries = []
let meta = []
if (errors.length === 0) {
  entries = parseEntriesRegistry()
  meta = parseMetaRegistry()
}

if (entries.length !== meta.length) {
  fail(errors, `Entry count mismatch: entries.js has ${entries.length}, entries-meta.js has ${meta.length}`)
}

const max = Math.max(entries.length, meta.length)
for (let i = 0; i < max; i++) {
  const full = entries[i]
  const mirror = meta[i]
  if (!full) {
    fail(errors, `entries-meta.js has extra entry at index ${i}: ${mirror?.slug || "unknown"}`)
    continue
  }
  if (!mirror) {
    fail(errors, `entries.js has extra entry at index ${i}: ${full.slug || full.name}`)
    continue
  }
  if (full.missingImport) {
    fail(errors, `entries.js lists ${full.name}, but no matching import was found`)
    continue
  }
  for (const field of ["slug", "title", "subtitle", "author", "date", "excerpt"]) {
    if (full[field] !== mirror[field]) {
      fail(errors, `${full.name}.${field} drift: entries.js=${JSON.stringify(full[field])}, entries-meta.js=${JSON.stringify(mirror[field])}`)
    }
  }
  if (JSON.stringify(full.tags) !== JSON.stringify(mirror.tags || [])) {
    fail(errors, `${full.name}.tags drift: entries.js=${JSON.stringify(full.tags)}, entries-meta.js=${JSON.stringify(mirror.tags || [])}`)
  }
  const fullOg = full.ogChart?.component
  const mirrorOg = mirror.ogChart?.component
  if (fullOg !== mirrorOg) {
    fail(errors, `${full.name}.ogChart.component drift: entries.js=${JSON.stringify(fullOg)}, entries-meta.js=${JSON.stringify(mirrorOg)}`)
  }
}

if (errors.length > 0) {
  console.error("\n✗ blog entry metadata drift detected:\n")
  for (const error of errors) console.error(`  - ${error}`)
  console.error("\nFix: update both docs/src/blog/entries.js entry metadata and docs/src/blog/entries-meta.js.\n")
  process.exit(1)
}

console.log(`✓ blog entry registries in sync (${entries.length} entries)`)
