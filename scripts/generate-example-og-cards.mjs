#!/usr/bin/env node
/**
 * Generates the social-preview Open Graph cards for each examples entry.
 *
 *   docs/public/examples/og/<slug>.png   (1200 × 630)
 *
 * Each example gets a branded text card carrying its name (the thing a
 * shared link should announce): a "Semiotic · Example" brand row, the
 * example's eyebrow, its title, and its description, on the dark
 * Semiotic identity. Unlike the blog cards this is intentionally
 * chart-free — examples are complex multi-frame pages with no single
 * server-renderable hero chart, so a legible, consistent text card is
 * the honest preview.
 *
 * The examples manifest (docs/src/pages/examples/examplesManifest.js) is
 * the single source of truth; it is pure data (no JSX) so it imports
 * directly here.
 *
 * Default behavior is append-only: existing PNGs are preserved so a
 * hand-repaired card is not clobbered by a normal docs build. Delete a
 * specific output file to regenerate just that card, or pass `--force`.
 *
 *   $ node scripts/generate-example-og-cards.mjs
 *   $ node scripts/generate-example-og-cards.mjs --slug=us-war-timeline
 *   $ node scripts/generate-example-og-cards.mjs --force
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const OUT_DIR = resolve(ROOT, "docs/public/examples/og")
const MANIFEST_FILE = resolve(ROOT, "docs/src/pages/examples/examplesManifest.js")
const args = process.argv.slice(2)
const force = args.includes("--force")
const slugFilter = new Set(
  args
    .filter((arg) => arg.startsWith("--slug="))
    .map((arg) => arg.slice("--slug=".length))
    .filter(Boolean)
)

// 1200 × 630 is the canonical OG / Twitter summary_large_image size.
const W = 1200
const H = 630

// Brand palette — matches the blog OG cards (dark Semiotic identity).
const BG = "#0a0a0f"
const FG = "#e5e7eb"
const FG_DIM = "#94a3b8"
const ACCENT = "#0f62fe" // Semiotic's primary blue.

// XML/attribute-safe text escaping. Titles include `&` at times
// ("Cubism & Abstract Art", "New York & Erie Railroad").
function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// Soft auto-wrap into at most `maxLines` lines each fitting `maxChars`.
// The final line is ellipsis-truncated if content still overflows, so
// the card stays honest about the limit.
function wrapText(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ""
  let consumed = 0
  let broke = false
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (!current) {
      current = w
      consumed = i + 1
      continue
    }
    if ((current + " " + w).length <= maxChars) {
      current += " " + w
      consumed = i + 1
    } else {
      lines.push(current)
      current = w
      consumed = i + 1
      if (lines.length === maxLines - 1) { broke = true; break }
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  if (lines.length === maxLines && broke) {
    const rest = words.slice(consumed)
    if (rest.length) {
      const combined = (lines[lines.length - 1] + " " + rest.join(" ")).trim()
      lines[lines.length - 1] = combined.length > maxChars
        ? combined.slice(0, maxChars - 1).trimEnd() + "…"
        : combined
    }
  }
  return lines
}

// Derive the route slug from the manifest `path` ("/examples/<slug>").
function slugFor(entry) {
  return String(entry.path).split("/").filter(Boolean).pop()
}

// ── Composite SVG ──────────────────────────────────────────────────────

function buildCardSVG(entry) {
  const leftX = 72
  const rightEdge = W - 72
  const titleLines = wrapText(entry.title, 24, 3)
  const descLines = wrapText(entry.description, 62, 3)

  // Brand row at the top; eyebrow, title, description flow below it.
  const brandY = 104

  // Anchor the title block so the whole composition sits centered-ish
  // vertically regardless of how many title/description lines there are.
  const titleSize = 68
  const titleLH = 82
  const eyebrowY = 236
  const titleY = eyebrowY + 66
  const titleBlockSVG = titleLines
    .map(
      (l, i) =>
        `<text x="${leftX}" y="${titleY + i * titleLH}" fill="${FG}"
           font-family="-apple-system, system-ui, sans-serif"
           font-size="${titleSize}" font-weight="700">${escapeXml(l)}</text>`
    )
    .join("")

  const descY = titleY + (titleLines.length - 1) * titleLH + 74
  const descLH = 38
  const descSVG = descLines
    .map(
      (l, i) =>
        `<text x="${leftX}" y="${descY + i * descLH}" fill="${FG_DIM}"
           font-family="-apple-system, system-ui, sans-serif"
           font-size="26" font-weight="400">${escapeXml(l)}</text>`
    )
    .join("")

  // A faint stack of pictogram-like signs in the bottom-right, echoing the
  // ISOTYPE lean of the examples section without competing with the text.
  const signMotif = `
    <g opacity="0.10" fill="${ACCENT}">
      ${[0, 1, 2, 3]
        .map((i) => `<rect x="${rightEdge - 40 - i * 92}" y="${H - 150}" width="56" height="118" rx="6" />`)
        .join("")}
    </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${BG}" />

    <!-- Left accent rule -->
    <rect x="0" y="0" width="10" height="${H}" fill="${ACCENT}" />

    <!-- Brand row -->
    <text x="${leftX}" y="${brandY}" fill="${FG}" font-family="-apple-system, system-ui, sans-serif"
      font-size="26" font-weight="600">Semiotic</text>
    <text x="${leftX + 118}" y="${brandY}" fill="${FG_DIM}" font-family="-apple-system, system-ui, sans-serif"
      font-size="26">·</text>
    <text x="${leftX + 140}" y="${brandY}" fill="${ACCENT}" font-family="-apple-system, system-ui, sans-serif"
      font-size="22" font-weight="600" letter-spacing="2">EXAMPLE</text>

    <!-- Eyebrow -->
    <text x="${leftX}" y="${eyebrowY}" fill="${ACCENT}" font-family="-apple-system, system-ui, sans-serif"
      font-size="28" font-weight="500">${escapeXml(entry.eyebrow || "")}</text>

    <!-- Title -->
    ${titleBlockSVG}

    <!-- Description -->
    ${descSVG}

    <!-- Footer -->
    <text x="${leftX}" y="${H - 44}" fill="${FG_DIM}"
      font-family="ui-monospace, Menlo, monospace" font-size="16" opacity="0.7">semiotic3.nteract.io/examples</text>

    ${signMotif}
  </svg>`
}

// ── Manifest loader ────────────────────────────────────────────────────
//
// examplesManifest.js is pure ESM data (no JSX), so import it through a
// data URL — the same trick prerender.mjs / generate-blog-og-cards.mjs
// use so a typeless `.js` loads as an explicit ES module.
async function loadExamples() {
  const source = readFileSync(MANIFEST_FILE, "utf8")
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)
  return mod.EXAMPLES || []
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const examples = await loadExamples()
  const selected = slugFilter.size > 0
    ? examples.filter((entry) => slugFilter.has(slugFor(entry)))
    : examples
  const missingSlugs = [...slugFilter].filter((slug) => !examples.some((entry) => slugFor(entry) === slug))
  if (missingSlugs.length > 0) {
    throw new Error(`unknown example slug(s): ${missingSlugs.join(", ")}`)
  }

  console.log(`[example-og] ensuring ${selected.length} cards → ${OUT_DIR}${force ? " (force)" : ""}`)
  let ok = 0, skipped = 0, failed = 0
  for (const entry of selected) {
    const slug = slugFor(entry)
    const outFile = resolve(OUT_DIR, `${slug}.png`)
    if (!force && existsSync(outFile)) {
      skipped++
      continue
    }
    try {
      const svg = buildCardSVG(entry)
      const png = await sharp(Buffer.from(svg)).png().toBuffer()
      writeFileSync(outFile, png)
      ok++
    } catch (err) {
      failed++
      console.error(`[example-og] ${slug} failed:`, err.message)
    }
  }
  console.log(`[example-og] ${ok} written, ${skipped} skipped, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
