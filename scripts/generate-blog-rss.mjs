#!/usr/bin/env node
/**
 * Generates the Atom feed for the blog.
 *
 *   docs/public/blog/feed.xml
 *
 * Atom 1.0 (not RSS 2.0) because every major reader supports Atom and
 * the schema is stricter — fewer interoperability surprises across
 * Feedly / NetNewsWire / Reeder / Miniflux.
 *
 * Discovery is wired up in `docs/public/index.html` via:
 *   <link rel="alternate" type="application/atom+xml" href="/blog/feed.xml" …>
 *
 * Sort: most-recent first. Reads `docs/src/blog/entries-meta.js` —
 * the same metadata-only mirror the OG-card generator uses, so we
 * don't drag in React/JSX. Entry bodies aren't part of the feed
 * payload (they're React, not Markdown) — each `<entry>` carries
 * title + subtitle + excerpt as the summary. Readers that fetch the
 * full article follow the `<link>` back to the blog URL.
 *
 *   $ node scripts/generate-blog-rss.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const OUT_DIR = resolve(ROOT, "docs/public/blog")
const OUT_FILE = resolve(OUT_DIR, "feed.xml")
const META_FILE = resolve(ROOT, "docs/src/blog/entries-meta.js")

// Canonical site origin used for feed-level `<id>` URIs and per-entry
// links. Matches the canonical URL set in `docs/public/index.html`.
const SITE_URL = "https://semiotic3.nteract.io"
const FEED_TITLE = "Semiotic Blog"
const FEED_SUBTITLE = "Chart explainers, case studies, and release notes from the Semiotic data-visualization library."
const FEED_AUTHOR = "Semiotic"

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// Atom requires RFC 3339 timestamps. The entries-meta dates are
// YYYY-MM-DD; we anchor at midnight UTC so the feed is stable across
// build environments (CI in negative-UTC zones would otherwise shift
// the date by 1).
function toRfc3339(dateStr) {
  return `${dateStr}T00:00:00Z`
}

// Feed-level `<updated>` should be the newest entry's date — readers
// use this to decide whether to refetch the feed body.
function newestDate(entries) {
  return entries
    .map((e) => e.date)
    .sort()
    .reverse()[0]
}

function buildAtom(entries) {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
  const updated = toRfc3339(newestDate(sorted) || new Date().toISOString().slice(0, 10))

  const items = sorted
    .map((e) => {
      const url = `${SITE_URL}/blog/${e.slug}`
      const tags = (e.tags || []).map((t) => `    <category term="${escapeXml(t)}"/>`).join("\n")
      // Summary = excerpt if present, else subtitle. Subtitle reads as
      // a sentence-form summary the way an RSS reader expects.
      const summary = e.excerpt || e.subtitle || ""
      // OG card lives at /blog/og/<slug>.png — surface it via an
      // enclosure-style media link so feed readers that show
      // thumbnails (Feedly, Inoreader) can pick it up.
      const ogUrl = `${SITE_URL}/blog/og/${e.slug}.png`
      return [
        `  <entry>`,
        `    <title>${escapeXml(e.title)}</title>`,
        `    <id>${url}</id>`,
        `    <link rel="alternate" type="text/html" href="${url}"/>`,
        `    <link rel="enclosure" type="image/png" href="${ogUrl}"/>`,
        `    <published>${toRfc3339(e.date)}</published>`,
        `    <updated>${toRfc3339(e.date)}</updated>`,
        `    <author><name>${escapeXml(e.author || FEED_AUTHOR)}</name></author>`,
        tags,
        `    <summary type="text">${escapeXml(summary)}</summary>`,
        `  </entry>`,
      ].filter(Boolean).join("\n")
    })
    .join("\n")

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom">`,
    `  <title>${escapeXml(FEED_TITLE)}</title>`,
    `  <subtitle>${escapeXml(FEED_SUBTITLE)}</subtitle>`,
    `  <link rel="self" type="application/atom+xml" href="${SITE_URL}/blog/feed.xml"/>`,
    `  <link rel="alternate" type="text/html" href="${SITE_URL}/blog"/>`,
    `  <id>${SITE_URL}/blog/</id>`,
    `  <updated>${updated}</updated>`,
    `  <author><name>${escapeXml(FEED_AUTHOR)}</name></author>`,
    items,
    `</feed>`,
    ``,
  ].join("\n")
}

async function importEntriesMeta() {
  // Import through a data URL so Node treats this typeless `.js` file
  // as an explicit ES module without forcing `"type": "module"` on
  // the whole package.
  const source = readFileSync(META_FILE, "utf8")
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const mod = await importEntriesMeta()
  const entries = mod.blogEntriesMeta
  const xml = buildAtom(entries)
  writeFileSync(OUT_FILE, xml)
  console.log(`[rss] wrote ${entries.length}-entry Atom feed → ${OUT_FILE}`)
}

main().catch((err) => {
  console.error("[rss] failed:", err)
  process.exit(1)
})
