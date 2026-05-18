#!/usr/bin/env node
/**
 * Generates the social-preview Open Graph cards for each blog entry.
 *
 *   docs/public/blog/og/<slug>.png   (1200 × 630)
 *
 * Layout: 2-column composite. The left 2/3 of the card is a designed
 * text region (title / subtitle / byline / tags / Semiotic mark);
 * the right 1/3 hosts a chart preview rendered through
 * `semiotic/server`'s `renderToImage` when the entry registers an
 * `ogChart` spec. Entries without one fall through to a decorative
 * gradient — release-note posts and broad case studies don't have
 * a natural single-chart cover.
 *
 * Run after `npm run dist:prod` so `dist/server.module.min.js` is
 * available for the chart-side render. The hook in `package.json`
 * runs us inside `npm run website:build`, after `dist:prod` and
 * before `parcel build`.
 *
 * Default behavior is append-only: existing PNGs are preserved so
 * hand-repaired social cards do not get clobbered by a normal docs
 * build. Delete a specific output file to regenerate just that card,
 * or pass `--force` to intentionally regenerate matching cards.
 *
 *   $ node scripts/generate-blog-og-cards.mjs
 *   $ node scripts/generate-blog-og-cards.mjs --slug=release-3-5-4
 *   $ node scripts/generate-blog-og-cards.mjs --force
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const requireFromScript = createRequire(import.meta.url)
const ROOT = resolve(__dirname, "..")
const OUT_DIR = resolve(ROOT, "docs/public/blog/og")
const META_FILE = resolve(ROOT, "docs/src/blog/entries-meta.js")
const RELEASE_IMAGE_FILE = resolve(ROOT, "docs/public/assets/img/semiotic-social.png")
const args = process.argv.slice(2)
const force = args.includes("--force")
const slugFilter = new Set(
  args
    .filter((arg) => arg.startsWith("--slug="))
    .map((arg) => arg.slice("--slug=".length))
    .filter(Boolean)
)

// 1200 × 630 is the canonical OG / Twitter summary_large_image size.
// 2:1.05 aspect; renders down to roughly the right pixel weight on
// most social cards. Wider than 16:9 because the social-card layout
// tends to cap card height ~315–360px.
const W = 1200
const H = 630

// Brand palette — tuned for the dark Semiotic identity. Light card
// variant possible later by flipping these and re-rendering.
const BG = "#0a0a0f"
const FG = "#e5e7eb"
const FG_DIM = "#94a3b8"
const ACCENT = "#0f62fe"          // Semiotic's primary blue.
const PANEL_BG = "#111118"        // Right-third chart panel base.
const SEP = "#2a2a35"

// XML/attribute-safe text escaping. SVG won't tolerate raw `&` or `<`
// in attribute values or text nodes, and entry titles include both
// at times ("X & Y", "A < B"). Keep this in lockstep with the
// equivalent escape used by `renderToStaticSVG`.
function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// Soft auto-wrap into N lines that each fit `maxChars`. Doesn't
// hyphenate; if a single word exceeds `maxChars` it sits on its own
// line. Good enough for the title block — overflow gets truncated
// with an ellipsis to keep the card honest about the limit.
function wrapText(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/)
  const lines = []
  let current = ""
  // Track exactly how many words have been consumed into `current` or
  // `lines` so the overflow path can slice `words` by index instead of
  // recovering it via `indexOf` (which breaks on repeated words like
  // "the … the").
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
    // Try to keep ALL remaining words inside the last line; if it
    // overflows, truncate with an ellipsis. Avoids "..." appearing
    // when there's actually more room on the line.
    const rest = words.slice(consumed)
    if (rest.length) {
      const combined = (lines[lines.length - 1] + " " + rest.join(" ")).trim()
      lines[lines.length - 1] = combined.length > maxChars
        ? combined.slice(0, maxChars - 1).trimEnd() + "\u2026"
        : combined
    }
  }
  return lines
}

function formatDate(iso) {
  // Force UTC interpretation so a "2026-05-16" date doesn't shift
  // by a day in negative-UTC build environments.
  const d = new Date(iso + "T00:00:00Z")
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  })
}

// ── Chart-area resolver ────────────────────────────────────────────────
//
// Pulls in semiotic/server lazily so we don't pay its import cost when
// no entry asks for a chart preview. Returns an SVG string or null.
let _renderChart = null
let _renderChartTried = false
async function getRenderChart() {
  if (_renderChartTried) return _renderChart
  _renderChartTried = true
  try {
    const mod = requireFromScript(resolve(ROOT, "dist/server.min.js"))
    _renderChart = mod.renderChart
  } catch {
    console.warn("[og-cards] dist/server.min.js not built; chart previews will be the decorative fallback.")
    _renderChart = null
  }
  return _renderChart
}

let _releaseImageHref = null
let _releaseImageTried = false
function getReleaseImageHref() {
  if (_releaseImageTried) return _releaseImageHref
  _releaseImageTried = true
  try {
    const raw = readFileSync(RELEASE_IMAGE_FILE)
    _releaseImageHref = `data:image/png;base64,${raw.toString("base64")}`
  } catch {
    console.warn("[og-cards] release-card image missing; release posts will use the text fallback.")
    _releaseImageHref = null
  }
  return _releaseImageHref
}

// Each entry's `ogChart` spec is intentionally loose — `component`
// names the chart, `props` (optional) overrides any default props.
// The presets below give the chart-explainer entries a sensible cover
// chart without forcing the entry author to duplicate data twice.
const OG_CHART_PRESETS = {
  DifferenceChart: {
    chartType: "DifferenceChart",
    // Numeric x so the chart's segment + crossover math runs through
    // the same linear-scale path SSR exercises. (xScaleType: "band"
    // collapses the SVG to an empty frame in SSR — the segment
    // recomputation requires comparable x values.)
    defaults: {
      data: Array.from({ length: 12 }, (_, i) => {
        // This year (a) starts cold, climbs, peaks midsummer, slumps fall.
        // Last year (b) drifts steadily. Two visible crossovers.
        const a = [180, 196, 215, 240, 268, 295, 312, 305, 282, 258, 238, 222][i]
        const b = [220, 228, 232, 238, 244, 252, 260, 268, 276, 282, 285, 288][i]
        return { x: i, a, b }
      }),
      xAccessor: "x",
      seriesAAccessor: "a",
      seriesBAccessor: "b",
      xScaleType: "linear",
    },
  },
  QuadrantChart: {
    chartType: "QuadrantChart",
    defaults: {
      data: [
        { x: 2, y: 9 }, { x: 9, y: 8 }, { x: 3, y: 5 }, { x: 7, y: 4 },
        { x: 1, y: 7 }, { x: 6, y: 8 }, { x: 4, y: 3 }, { x: 8, y: 2 },
        { x: 3, y: 4 }, { x: 7, y: 7 }, { x: 5, y: 2 }, { x: 9, y: 9 },
      ],
      xAccessor: "x", yAccessor: "y",
      xCenter: 5.5, yCenter: 5.5,
      quadrants: {
        topLeft: { label: "QW", color: "#22c55e" },
        topRight: { label: "SB", color: "#3b82f6" },
        bottomLeft: { label: "FI", color: "#94a3b8" },
        bottomRight: { label: "MP", color: "#ef4444" },
      },
    },
  },
  FunnelChart: {
    chartType: "FunnelChart",
    defaults: {
      data: [
        { step: "Visited", count: 25000 },
        { step: "Signed up", count: 9400 },
        { step: "Activated", count: 5700 },
        { step: "Subscribed", count: 2100 },
        { step: "Retained", count: 1640 },
      ],
      stepAccessor: "step",
      valueAccessor: "count",
    },
  },
}

async function renderChartSVG(entry, chartW, chartH) {
  if (!entry.ogChart) return null
  const preset = OG_CHART_PRESETS[entry.ogChart.component]
  if (!preset) return null
  const renderChart = await getRenderChart()
  if (!renderChart) return null
  const props = {
    ...preset.defaults,
    ...(entry.ogChart.props || {}),
    width: chartW,
    height: chartH,
    theme: "carbon-dark",
    showLegend: false,
    margin: { top: 16, right: 16, bottom: 24, left: 32 },
  }
  try {
    return renderChart(preset.chartType, props)
  } catch (err) {
    console.warn(`[og-cards] chart render failed for ${entry.slug}: ${err.message}`)
    return null
  }
}

function renderReleaseImageSVG(entry, chartW, chartH) {
  const isRelease = (entry.tags || []).includes("release") || /^release-/.test(entry.slug || "")
  if (!isRelease || entry.ogChart) return null
  const href = getReleaseImageHref()
  if (!href) return null
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${chartW}" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}">
    <rect width="${chartW}" height="${chartH}" fill="${BG}" />
    <image href="${href}" x="0" y="0" width="${chartW}" height="${chartH}"
      preserveAspectRatio="xMidYMid meet" />
  </svg>`
}

// ── Composite SVG ──────────────────────────────────────────────────────

function buildCardSVG({ entry, chartSVG }) {
  const titleLines = wrapText(entry.title, 28, 3)
  const subtitleLines = wrapText(entry.subtitle, 56, 3)
  const dateLabel = formatDate(entry.date)
  const tagLine = entry.tags.map((t) => `#${t}`).join("  ")
  const chartW = 380
  const chartH = 380
  const chartX = W - chartW - 48
  const chartY = (H - chartH) / 2

  // The chart-side panel renders the chart against the panel
  // background, framed by a 1-px border that doubles as the
  // sectional divider in the composition.
  const chartPanel = `
    <rect x="${chartX - 12}" y="${chartY - 12}" width="${chartW + 24}" height="${chartH + 24}"
      fill="${PANEL_BG}" stroke="${SEP}" rx="8" />
    ${chartSVG
      ? `<g transform="translate(${chartX}, ${chartY})">${chartSVG}</g>`
      : `<g transform="translate(${chartX}, ${chartY})">
           <rect width="${chartW}" height="${chartH}" fill="${BG}" />
           <text x="${chartW / 2}" y="${chartH / 2}" text-anchor="middle"
                 fill="${FG_DIM}" font-family="ui-monospace, Menlo, monospace"
                 font-size="12" opacity="0.5">semiotic.nteract.io</text>
         </g>`
    }
  `

  // Text-side layout. Title at 56px, subtitle at 22px, byline 18px.
  // Vertical rhythm: 48 px margins, 24 px between title block and
  // subtitle, 32 px from subtitle to byline.
  const leftX = 56
  const titleY = 200
  const lineHeight = 70
  const titleSVG = titleLines.map(
    (l, i) =>
      `<text x="${leftX}" y="${titleY + i * lineHeight}" fill="${FG}"
         font-family="-apple-system, system-ui, sans-serif"
         font-size="56" font-weight="700">${escapeXml(l)}</text>`
  ).join("")

  const subtitleY = titleY + titleLines.length * lineHeight + 12
  const subLineHeight = 32
  const subtitleSVG = subtitleLines.map(
    (l, i) =>
      `<text x="${leftX}" y="${subtitleY + i * subLineHeight}" fill="${FG_DIM}"
         font-family="-apple-system, system-ui, sans-serif"
         font-size="22" font-weight="400">${escapeXml(l)}</text>`
  ).join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${BG}" />

    <!-- Brand row -->
    <text x="${leftX}" y="80" fill="${FG}" font-family="-apple-system, system-ui, sans-serif"
      font-size="24" font-weight="600">Semiotic</text>
    <text x="${leftX + 110}" y="80" fill="${FG_DIM}" font-family="-apple-system, system-ui, sans-serif"
      font-size="24">·</text>
    <text x="${leftX + 130}" y="80" fill="${ACCENT}" font-family="-apple-system, system-ui, sans-serif"
      font-size="20" font-weight="500">BLOG</text>

    <!-- Title -->
    ${titleSVG}

    <!-- Subtitle -->
    ${subtitleSVG}

    <!-- Byline row -->
    <text x="${leftX}" y="${H - 56}" fill="${FG_DIM}"
      font-family="-apple-system, system-ui, sans-serif" font-size="18" font-weight="500">
      ${escapeXml(entry.author)}
    </text>
    <text x="${leftX + 12 + 8 * (entry.author?.length ?? 0)}" y="${H - 56}" fill="${FG_DIM}"
      font-family="-apple-system, system-ui, sans-serif" font-size="18" opacity="0.7"> · ${escapeXml(dateLabel)}</text>

    <!-- Tag row (monospace) -->
    <text x="${leftX}" y="${H - 28}" fill="${FG_DIM}"
      font-family="ui-monospace, Menlo, monospace" font-size="14" opacity="0.7">
      ${escapeXml(tagLine)}
    </text>

    <!-- Right chart panel -->
    ${chartPanel}
  </svg>`
}

// ── Entry loader ───────────────────────────────────────────────────────
//
// Reads from the metadata-only mirror so plain-Node import works
// (the React-aware `entries.js` would need a JSX transform we don't
// configure here). The blog-post skill enforces keeping the two in
// sync; `scripts/check-blog-entry-sync.mjs` is the CI guard.
async function loadEntries() {
  // Import through a data URL so Node treats this typeless `.js` file
  // as an explicit ES module without forcing `"type": "module"` on
  // the whole package.
  const source = readFileSync(META_FILE, "utf8")
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)
  return mod.blogEntriesMeta
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const entries = await loadEntries()
  const selectedEntries = slugFilter.size > 0
    ? entries.filter((entry) => slugFilter.has(entry.slug))
    : entries
  const missingSlugs = [...slugFilter].filter((slug) => !entries.some((entry) => entry.slug === slug))
  if (missingSlugs.length > 0) {
    throw new Error(`unknown blog slug(s): ${missingSlugs.join(", ")}`)
  }

  console.log(`[og-cards] ensuring ${selectedEntries.length} cards → ${OUT_DIR}${force ? " (force)" : ""}`)
  let ok = 0, skipped = 0, failed = 0
  for (const entry of selectedEntries) {
    const outFile = resolve(OUT_DIR, `${entry.slug}.png`)
    if (!force && existsSync(outFile)) {
      skipped++
      continue
    }
    try {
      const chartSVG = await renderChartSVG(entry, 380, 380) || renderReleaseImageSVG(entry, 380, 380)
      const svg = buildCardSVG({ entry, chartSVG })
      const png = await sharp(Buffer.from(svg)).png().toBuffer()
      writeFileSync(outFile, png)
      ok++
    } catch (err) {
      failed++
      console.error(`[og-cards] ${entry.slug} failed:`, err.message)
    }
  }
  console.log(`[og-cards] ${ok} written, ${skipped} skipped, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
