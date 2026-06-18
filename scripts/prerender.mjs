/**
 * Static site generation for the docs site.
 *
 * After `parcel build` produces docs/build/index.html (SPA shell),
 * this script creates an HTML file for each route with:
 * - Correct <title> for SEO
 * - <noscript> fallback with page title, navigation, and links to
 *   machine-readable AI docs (CLAUDE.md, schema.json, etc.)
 * - <link rel="canonical"> for the route
 * - sitemap.txt for crawlers
 *
 * The SPA JS still loads for full interactivity. Canvas-based chart
 * demos render as empty containers in the static HTML (expected).
 */

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve, dirname } from "path"
import { fileURLToPath, pathToFileURL } from "url"
import { JSDOM } from "jsdom"

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUILD_DIR = resolve(__dirname, "../docs/build")
const APP_SRC = resolve(__dirname, "../docs/src/App.js")
const PUBLIC_API_DIR = resolve(__dirname, "../docs/public/api")
const PUBLIC_BLOG_OG_DIR = resolve(__dirname, "../docs/public/blog/og")
const SITE_URL = "https://semiotic3.nteract.io"
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/img/semiotic-social.png`
const ROUTE_DOCS_MANIFEST = "llms-routes.json"

// Per-route SEO metadata. Keys are route paths exactly as extracted from
// App.js (no leading slash, "" for the landing page). Routes not listed
// here inherit the shell's generic description/og tags. Listing top-level
// sections meaningfully helps indexing — every chart page should not ship
// the same description as the landing page.
const ROUTE_META = {
  "": {
    title: "Semiotic — Data Visualization for React",
    description:
      "Semiotic is a React data visualization framework. Build interactive charts, network diagrams, geo maps, and streaming visualizations from simple, composable components.",
  },
  "getting-started": {
    title: "Getting Started — Semiotic",
    description:
      "Install Semiotic and ship your first chart. Sub-path imports, the HOC chart catalog, and the streaming Frame escape hatch.",
  },
  charts: {
    title: "Charts — Semiotic",
    description:
      "The Semiotic chart catalog: 45+ HOC charts spanning XY, ordinal, network, geo, hierarchy, and realtime families. Browse by family with live demos and copy-paste examples.",
  },
  features: {
    title: "Features — Semiotic",
    description:
      "Semiotic features: streaming push API, animated transitions, accessibility, annotations, coordinated views, themed CSS variables, SSR, and AI-facing tooling.",
  },
  "features/gofish-layouts": {
    title: "Experimental GoFish Adapter — Semiotic",
    description:
      "Temporary PR preview for rendering GoFish Frontend IR through Semiotic custom layouts; not a Semiotic release API contract.",
  },
  annotations: {
    title: "Annotations — Semiotic",
    description:
      "Semiotic's first-class annotation system: thresholds, labels, callouts, enclosures, trend / forecast / anomaly bands, emphasis hierarchy, curved connectors, and provenance + lifecycle metadata for AI- and watcher-authored notes.",
  },
  "annotations/design-guidance": {
    title: "Annotation Design Guidance — Semiotic",
    description:
      "Design first-class chart annotations for audience, hierarchy, placement, association, cohesion, and amount using Semiotic's annotation assistance APIs.",
  },
  theming: {
    title: "Theming — Semiotic",
    description:
      "Theme Semiotic with named presets (tufte, dark, bi-tool, journalist, …), CSS custom properties, and a scoped cascade override that flows through every chart.",
  },
  "theming/styling": {
    title: "Styling Primitives — Semiotic Theming",
    description:
      "Top-level color, stroke, strokeWidth, opacity, and gradient props on every Semiotic HOC. Precedence cascade, CSS variable overrides, and per-datum style functions.",
  },
  "theming/theme-provider": {
    title: "ThemeProvider — Semiotic Theming",
    description:
      "Wrap charts in ThemeProvider to apply a named preset or custom theme object. Categorical palettes, semantic status roles, fonts, and CSS-variable emission.",
  },
  "theming/semantic-colors": {
    title: "Semantic Colors — Semiotic Theming",
    description:
      "Use --semiotic-success, --semiotic-danger, --semiotic-warning, --semiotic-info and other semantic role tokens to drive status-aware visualizations.",
  },
  "theming/theme-explorer": {
    title: "Theme Explorer — Semiotic",
    description:
      "Preview every Semiotic theme preset across the chart catalog. Swap themes live, compare palettes, export tokens.",
  },
  playground: {
    title: "Playground — Semiotic",
    description:
      "Edit Semiotic chart props live in the browser. Round-trip JSON config, deep-link via URL, and copy generated JSX for any chart in the catalog.",
  },
  blog: {
    title: "Blog — Semiotic",
    description:
      "Release notes, chart explainers, and case studies from the Semiotic data visualization library.",
  },
  api: {
    title: "API Reference — Semiotic",
    description:
      "Generated TypeDoc API surface for Semiotic: every component, hook, frame, and helper exported from the library and its sub-path entry points.",
  },
  "api/charts": {
    title: "Chart Components API — Semiotic",
    description:
      "API reference for every Semiotic HOC chart: props, accessors, frameProps, and streaming ref methods.",
  },
  "api/typedoc": {
    title: "TypeDoc — Semiotic API Reference",
    description:
      "Full TypeDoc index for Semiotic — modules, classes, interfaces, types, and re-exports.",
  },
  cookbook: {
    title: "Cookbook — Semiotic",
    description:
      "Recipes for non-catalog charts: marginal graphics, slope graphs, marimekko, ridgelines, swarm plots, isotype charts, custom timelines, and more.",
  },
  recipes: {
    title: "Recipes — Semiotic",
    description:
      "Composed Semiotic patterns — KPI cards with sparklines, network explorers, streaming migration maps, benchmark dashboards, and other reusable dashboard primitives.",
  },
  migration: {
    title: "Migration Guide — Semiotic",
    description:
      "Upgrade to Semiotic 3.x. Removed APIs, replacement HOC charts, sub-path imports, and the new streaming-first runtime.",
  },
  "frames/xy-frame": {
    title: "XYFrame — Semiotic",
    description:
      "XYFrame is the low-level Cartesian rendering frame underlying every XY HOC chart. Use it when you need control the HOC abstractions don't expose.",
  },
  "frames/ordinal-frame": {
    title: "OrdinalFrame — Semiotic",
    description:
      "OrdinalFrame is the low-level rendering frame for category-by-value charts. Underlies BarChart, PieChart, BoxPlot, Histogram, and the rest of the ordinal family.",
  },
  "frames/network-frame": {
    title: "NetworkFrame — Semiotic",
    description:
      "NetworkFrame is the low-level rendering frame for graph, hierarchy, and sankey-style visualizations. Underlies ForceDirectedGraph, SankeyDiagram, Treemap, and others.",
  },
}

// ── Extract routes from App.js ──────────────────────────────────────────

function collectRouteOpeningTags(source) {
  const tags = []
  const routePattern = /<Route\b/g
  let match

  while ((match = routePattern.exec(source)) !== null) {
    const start = match.index
    const lineStart = source.lastIndexOf("\n", start) + 1
    const indent = source.slice(lineStart, start).match(/^\s*/)[0].length
    let quote = null
    let braceDepth = 0
    let end = -1

    for (let i = start; i < source.length; i++) {
      const char = source[i]

      if (quote) {
        if (char === "\\") {
          i++
        } else if (char === quote) {
          quote = null
        }
        continue
      }

      if (char === "\"" || char === "'" || char === "`") {
        quote = char
      } else if (char === "{") {
        braceDepth++
      } else if (char === "}" && braceDepth > 0) {
        braceDepth--
      } else if (char === ">" && braceDepth === 0) {
        end = i + 1
        break
      }
    }

    if (end === -1) continue
    tags.push({ tag: source.slice(start, end), indent })
    routePattern.lastIndex = end
  }

  return tags
}

export function extractRoutesFromSource(source) {
  const paths = new Set([""])
  const parentStack = []

  for (const { tag, indent } of collectRouteOpeningTags(source)) {
    const match = tag.match(/\bpath\s*=\s*["']([^"']+)["']/)
    if (!match) continue

    const rawPath = match[1]
    if (rawPath === "*") continue

    while (parentStack.length > 0 && parentStack[parentStack.length - 1].indent >= indent) {
      parentStack.pop()
    }

    const parentPath = parentStack[parentStack.length - 1]?.path || ""
    const routePath = rawPath === "/"
      ? ""
      : rawPath === ""
        ? parentPath
        : rawPath.includes("/")
          ? rawPath.replace(/^\/+/, "")
          : parentPath
            ? `${parentPath}/${rawPath}`
            : rawPath

    paths.add(routePath)

    if (!/\/\s*>$/.test(tag.trim())) {
      parentStack.push({ indent, path: routePath })
    }
  }

  return Array.from(paths)
}

function extractRoutes() {
  return extractRoutesFromSource(readFileSync(APP_SRC, "utf-8"))
}

export function copyDocsApiAssets(publicApiDir = PUBLIC_API_DIR, buildDir = BUILD_DIR) {
  if (!existsSync(publicApiDir)) return []

  const outDir = resolve(buildDir, "api")
  mkdirSync(outDir, { recursive: true })

  const copied = []
  for (const fileName of readdirSync(publicApiDir).sort()) {
    if (!fileName.endsWith(".json")) continue
    copyFileSync(resolve(publicApiDir, fileName), resolve(outDir, fileName))
    copied.push(`api/${fileName}`)
  }

  return copied
}

// Copy the rendered blog OG cards (docs/public/blog/og/*.png) into the
// static build. Parcel only bundles files referenced by the HTML/JS at
// build time, so these per-entry images otherwise never make it into
// dist — and the og:image meta tags would 404.
export function copyBlogOgCards(publicOgDir = PUBLIC_BLOG_OG_DIR, buildDir = BUILD_DIR) {
  if (!existsSync(publicOgDir)) return []

  const outDir = resolve(buildDir, "blog", "og")
  mkdirSync(outDir, { recursive: true })

  const copied = []
  for (const fileName of readdirSync(publicOgDir).sort()) {
    if (!fileName.endsWith(".png")) continue
    copyFileSync(resolve(publicOgDir, fileName), resolve(outDir, fileName))
    copied.push(`blog/og/${fileName}`)
  }

  return copied
}

// ── Blog metadata loader ───────────────────────────────────────────────
//
// Reads docs/src/blog/entries-meta.js for the slug list + per-entry
// title / description / OG image. The full entries.js can't be
// imported here — it pulls in React + JSX — so the metadata mirror
// is the build-time source of truth.

async function loadBlogEntries() {
  try {
    const metaPath = resolve(__dirname, "../docs/src/blog/entries-meta.js")
    if (!existsSync(metaPath)) return []
    const source = readFileSync(metaPath, "utf8")
    const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)
    return mod.blogEntriesMeta || []
  } catch (err) {
    console.warn("[prerender] could not load blog metadata:", err.message)
    return []
  }
}

// ── Static route content renderer ──────────────────────────────────────────
//
// Parcel gives us the interactive SPA bundle. For machine readers, we also
// render the matching React route in Node, strip visual/interactive chrome, and
// embed the remaining semantic content in each route's <noscript> fallback.
// This keeps the docs app interactive for browsers while making fetched HTML
// useful without running client JavaScript.

const RENDERER_ENTRY = `
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { StaticRouter } from "react-router"

const storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

globalThis.localStorage = globalThis.localStorage || storage
if (!globalThis.navigator?.clipboard) {
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: async () => {} } },
    configurable: true,
  })
}
globalThis.window = globalThis.window || {}
Object.assign(globalThis.window, {
  Prism: globalThis.window.Prism || null,
  localStorage: globalThis.localStorage,
  matchMedia: globalThis.window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
  addEventListener: globalThis.window.addEventListener || (() => {}),
  removeEventListener: globalThis.window.removeEventListener || (() => {}),
  dispatchEvent: globalThis.window.dispatchEvent || (() => true),
  CustomEvent: globalThis.window.CustomEvent || class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  },
  location: globalThis.window.location || { pathname: "/", search: "", hash: "" },
  history: globalThis.window.history || { replaceState() {} },
})

const elementStub = () => ({
  style: {},
  setAttribute() {},
  appendChild() {},
  remove() {},
  select() {},
  getContext: () => ({
    canvas: {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    quadraticCurveTo() {},
    arc() {},
    rect() {},
    fill() {},
    stroke() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    setLineDash() {},
    measureText: (text) => ({ width: String(text || "").length * 7 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
  }),
})

globalThis.document = globalThis.document || {
  documentElement: {
    getAttribute: () => "dark",
    setAttribute() {},
  },
  body: elementStub(),
  head: { appendChild() {} },
  querySelector: () => null,
  createElement: elementStub,
  addEventListener() {},
  removeEventListener() {},
  execCommand: () => false,
}

globalThis.MutationObserver = globalThis.MutationObserver || class MutationObserver {
  observe() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || class ResizeObserver {
  observe() {}
  disconnect() {}
}
globalThis.IntersectionObserver = globalThis.IntersectionObserver || class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const { default: App } = await import("../docs/src/App.js")

const muteStaticRenderWarning = (args) => {
  const message = String(args[0] || "")
  return (
    message.startsWith("[semiotic] ") ||
    message.includes("<Navigate> must not be used on the initial render")
  )
}

export function renderRoute(routePath) {
  const pathname = routePath ? "/" + routePath.replace(/^\\/+/, "") : "/"
  globalThis.window.location = { pathname, search: "", hash: "" }
  const warn = console.warn
  const error = console.error
  console.warn = (...args) => {
    if (!muteStaticRenderWarning(args)) warn(...args)
  }
  console.error = (...args) => {
    if (!muteStaticRenderWarning(args)) error(...args)
  }
  try {
    return renderToStaticMarkup(
      React.createElement(
        StaticRouter,
        { location: pathname },
        React.createElement(App),
      ),
    )
  } finally {
    console.warn = warn
    console.error = error
  }
}
`

async function createStaticRouteRenderer() {
  const { build: esbuild } = await import("esbuild")
  const tempDir = mkdtempSync(resolve(tmpdir(), "semiotic-docs-route-renderer-"))
  const outfile = resolve(tempDir, "renderer.mjs")

  try {
    await esbuild({
      stdin: {
        contents: RENDERER_ENTRY,
        loader: "jsx",
        resolveDir: __dirname,
      },
      bundle: true,
      platform: "node",
      format: "esm",
      outfile,
      loader: {
        ".js": "jsx",
        ".css": "empty",
        ".csv": "text",
        ".gif": "file",
        ".jpeg": "file",
        ".jpg": "file",
        ".png": "file",
      },
      assetNames: "assets/[name]-[hash]",
      external: ["canvas"],
      banner: {
        js: 'import { createRequire as __semioticCreateRequire } from "module"; const require = __semioticCreateRequire(import.meta.url);',
      },
      logLevel: "silent",
    })

    const mod = await import(pathToFileURL(outfile).href)
    return mod.renderRoute
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

export function sanitizeRouteHtml(renderedHtml, routePath) {
  if (!renderedHtml) return null

  const dom = new JSDOM(`<body>${renderedHtml}</body>`)
  const doc = dom.window.document
  const source =
    doc.querySelector(".App--blog article") ||
    doc.querySelector(".container") ||
    doc.querySelector(".App") ||
    doc.body
  const root = source.cloneNode(true)

  root.querySelectorAll([
    "script",
    "style",
    "svg",
    "canvas",
    "img",
    "picture",
    "video",
    "button",
    "input",
    "textarea",
    "select",
    "iframe",
    ".page-toc",
    ".page-breadcrumbs",
    ".page-nav",
    ".sidebar-toggle",
    ".github-links",
    "[aria-hidden='true']",
  ].join(",")).forEach((el) => el.remove())

  root.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const keep =
        name === "href" ||
        name === "datetime" ||
        name === "data-prop" ||
        name === "data-required" ||
        (name === "id" && /^h[1-6]$/i.test(el.tagName))
      if (!keep || name.startsWith("on")) el.removeAttribute(attr.name)
    }
    const href = el.getAttribute("href")
    if (href !== null && shouldRemoveSanitizedHref(href)) {
      el.removeAttribute("href")
    }
  })

  let removedEmpty = true
  while (removedEmpty) {
    removedEmpty = false
    root.querySelectorAll("div, span").forEach((el) => {
      if (el.children.length === 0 && !el.textContent.trim()) {
        el.remove()
        removedEmpty = true
      }
    })
  }

  const html = normalizeMachineHtml(root.innerHTML)
  const text = normalizeText(readableText(root))
  if (!html || !text) return null

  const headings = Array.from(root.querySelectorAll("h1, h2, h3"))
    .map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: normalizeText(el.textContent),
    }))
    .filter((heading) => heading.text)

  const codeBlocks = Array.from(root.querySelectorAll("pre"))
    .map((el) => normalizeCode(el.textContent))
    .filter(Boolean)

  const links = Array.from(root.querySelectorAll("a[href]"))
    .map((el) => ({
      text: normalizeText(el.textContent),
      href: el.getAttribute("href"),
    }))
    .filter((link) => link.text && link.href)

  return {
    route: routePath || "/",
    url: routePath ? `${SITE_URL}/${routePath}` : SITE_URL,
    html,
    text,
    headings,
    codeBlocks,
    links,
  }
}

function normalizeMachineHtml(html) {
  return html
    .replace(/\sdata-discover="[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim()
}

function shouldRemoveSanitizedHref(href) {
  const normalizedHref = href.trim().replace(/[\x00-\x20\x7f]+/g, "").toLowerCase()
  return !normalizedHref || /^(?:file|data|javascript|vbscript):/.test(normalizedHref)
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim()
}

function readableText(node) {
  if (!node) return ""
  if (node.nodeType === 3) return node.nodeValue || ""
  if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return ""

  const tag = node.tagName || ""
  const children = Array.from(node.childNodes).map(readableText).filter(Boolean)
  if (children.length === 0) return ""

  if (tag === "TR") return `\n${children.map(normalizeText).filter(Boolean).join(" | ")}\n`
  if (tag === "LI") return `\n- ${children.join(" ")}\n`
  if (tag === "PRE") return `\n${node.textContent || ""}\n`
  if (/^(H[1-6]|P|DIV|SECTION|ARTICLE|TABLE|THEAD|TBODY|UL|OL|DL|DT|DD|BLOCKQUOTE)$/i.test(tag)) {
    return `\n${children.join(" ")}\n`
  }

  return children.join(" ")
}

function normalizeCode(text) {
  return String(text || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function renderMachineReadableFallback(doc) {
  if (!doc) return ""
  return `
      <section id="machine-readable-page" data-machine-readable-route="${escHtml(doc.route)}" style="max-width:800px;margin:24px auto;padding:20px;font-family:system-ui,sans-serif;line-height:1.55;">
        <h2>Machine-readable page content</h2>
        <p><strong>Canonical:</strong> <a href="${escHtml(doc.url)}">${escHtml(doc.url)}</a></p>
        ${doc.html}
      </section>`
}

function routeDocForScript(doc) {
  if (!doc) return null
  return {
    route: doc.route,
    url: doc.url,
    text: doc.text,
    headings: doc.headings,
    codeBlocks: doc.codeBlocks,
    links: doc.links,
  }
}

function machineDocScript(doc) {
  const payload = routeDocForScript(doc)
  if (!payload) return ""
  const json = JSON.stringify(payload).replace(/</g, "\\u003c")
  return `<script type="application/json" id="semiotic-route-doc">${json}</script>`
}

// ── Generate pre-rendered HTML for a route ──────────────────────────────

const escHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function generatePage(shellHtml, routePath, blogMeta = null, machineDoc = null) {
  const slugTitle = routePath
    .split("/")
    .filter(Boolean)
    .map(s => s.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "))
    .join(" \u2014 ")

  // Three sources of page meta (in priority order):
  //   1. blogMeta \u2014 passed by main() for blog/:slug routes
  //   2. ROUTE_META[routePath] \u2014 hand-curated per-section copy
  //   3. slug-cased fallback title, shell-inherited description
  const routeMeta = !blogMeta && Object.prototype.hasOwnProperty.call(ROUTE_META, routePath)
    ? ROUTE_META[routePath]
    : null

  const fullTitle = blogMeta?.title
    ? `${blogMeta.title} \u2014 Semiotic Blog`
    : routeMeta?.title
      ? routeMeta.title
      : (slugTitle ? `${slugTitle} \u2014 Semiotic` : "Semiotic \u2014 Data Visualization for React")

  const navHtml = `
    <nav style="max-width:800px;margin:0 auto;padding:20px;font-family:system-ui,sans-serif;">
      <h1>${fullTitle}</h1>
      <p><a href="/">Home</a> \u00b7 <a href="/getting-started">Getting Started</a> \u00b7 <a href="/charts">Charts</a> \u00b7 <a href="/features">Features</a> \u00b7 <a href="/playground">Playground</a></p>
      <p>This page requires JavaScript for interactive chart demos.</p>
      <p><strong>AI / Machine-readable docs:</strong> <a href="/llms.txt">llms.txt</a> \u00b7 <a href="/llms-full.txt">llms-full.txt</a> \u00b7 <a href="/CLAUDE.md">CLAUDE.md</a> \u00b7 <a href="/schema.json">schema.json</a> \u00b7 <a href="/api-reference.md">API Reference</a> \u00b7 <a href="/examples.md">Examples</a></p>
      <p><a href="https://github.com/nteract/semiotic">View on GitHub</a> \u00b7 <code>npx semiotic-ai</code> for CLI access</p>
    </nav>${renderMachineReadableFallback(machineDoc)}`

  // JSON-LD injected here (not in source HTML) to avoid Parcel's jsonld transformer
  const llmsAlternate = '<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable documentation index" />'
  // Atom feed alternate — injected here (not in source HTML) so Parcel's
  // HTML packager doesn't try to resolve the absolute `/blog/feed.xml`
  // path during build. Same pattern as the llms.txt alternate above.
  // Absolute path matters so prerendered nested routes (e.g.
  // `/charts/line-chart/`) don't end up pointing at
  // `/charts/line-chart/blog/feed.xml`.
  const blogFeedAlternate = '<link rel="alternate" type="application/atom+xml" title="Semiotic Blog" href="/blog/feed.xml" />'
  const jsonLd = '<script type="application/ld+json" data-jsonld="semiotic">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Semiotic","applicationCategory":"DeveloperApplication","description":"React data visualization library for charts, networks, and streaming data.","url":"https://semiotic3.nteract.io","codeRepository":"https://github.com/nteract/semiotic","programmingLanguage":["TypeScript","React"],"license":"https://opensource.org/licenses/Apache-2.0","author":{"@type":"Person","name":"Elijah Meeks"},"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}<\/script>'
  const canonicalUrl = routePath ? `${SITE_URL}/${routePath}` : SITE_URL
  let normalizedShell = shellHtml
  let previousShell
  do {
    previousShell = normalizedShell
    normalizedShell = normalizedShell
      .replace(/<link\s+rel=["']?alternate["']?[^>]*href=["']?\/llms\.txt[^>]*>/g, "")
      .replace(/<link\s+rel=["']?alternate["']?[^>]*href=["']?\/blog\/feed\.xml[^>]*>/g, "")
      .replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])(?=[^>]*\bdata-jsonld=["']semiotic["'])[^>]*>[\s\S]*?<\/script>/g, "")
  } while (normalizedShell !== previousShell)

  let html = normalizedShell
    .replace(/<title>[^<]*<\/title>/, `${llmsAlternate}${blogFeedAlternate}<title>${fullTitle}</title>${jsonLd}${machineDocScript(machineDoc)}`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${navHtml}</noscript>`)
    .replace(/<meta\b(?=[^>]*\bproperty=["']?og:url["']?)[^>]*>/, `<meta property="og:url" content="${canonicalUrl}" />`)
    .replace(/<link\s+rel=["']?canonical["']?[^>]*>/, `<link rel="canonical" href="${canonicalUrl}" />`)

  // Per-entry / per-section meta enrichment. Both blog entries and
  // ROUTE_META-mapped section pages need the same shape: drop the
  // generic shell tags, then inject page-specific description / og /
  // twitter / JSON-LD markup.
  //
  // Anchor the injection at `<body` (case-insensitive) rather than
  // `</head>` — Parcel's HTML minifier strips the implicit `</head>`
  // closing tag, so a `</head>`-anchored regex silently no-ops on the
  // built shell. `<body>` is always emitted.
  if (blogMeta || routeMeta) {
    let metaTags
    if (blogMeta) {
      const ogImage = `${SITE_URL}/blog/og/${blogMeta.slug}.png`
      const description = blogMeta.subtitle || blogMeta.excerpt || ""
      const blogJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: blogMeta.title,
        description,
        datePublished: blogMeta.date,
        author: { "@type": "Person", name: blogMeta.author },
        keywords: (blogMeta.tags || []).join(", "),
        image: ogImage,
        url: canonicalUrl,
      }).replace(/<\//g, "<\\/")
      const escDescription = escHtml(description)
      const escTitle = escHtml(blogMeta.title)
      metaTags = [
        `<meta name="description" content="${escDescription}" />`,
        `<meta property="og:type" content="article" />`,
        `<meta property="og:title" content="${escTitle}" />`,
        `<meta property="og:description" content="${escDescription}" />`,
        `<meta property="og:image" content="${ogImage}" />`,
        `<meta property="article:published_time" content="${blogMeta.date}" />`,
        `<meta property="article:author" content="${escHtml(blogMeta.author)}" />`,
        ...(blogMeta.tags || []).map((t) => `<meta property="article:tag" content="${escHtml(t)}" />`),
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escTitle}" />`,
        `<meta name="twitter:description" content="${escDescription}" />`,
        `<meta name="twitter:image" content="${ogImage}" />`,
        `<script type="application/ld+json" data-jsonld="blog-entry">${blogJsonLd}</script>`,
      ].join("")
    } else {
      const description = routeMeta.description || ""
      const escDescription = escHtml(description)
      const escTitle = escHtml(routeMeta.title)
      const ogImage = routeMeta.ogImage || DEFAULT_OG_IMAGE
      metaTags = [
        `<meta name="description" content="${escDescription}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${escTitle}" />`,
        `<meta property="og:description" content="${escDescription}" />`,
        `<meta property="og:image" content="${ogImage}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escTitle}" />`,
        `<meta name="twitter:description" content="${escDescription}" />`,
        `<meta name="twitter:image" content="${ogImage}" />`,
      ].join("")
    }

    html = html
      .replace(/<meta\s+name=["']?description["']?[^>]*>\s*/gi, "")
      .replace(/<meta\b[^>]*\bproperty=["']?og:(?:type|title|description|image)["']?[^>]*>\s*/gi, "")
      .replace(/<meta\b[^>]*\bproperty=["']?article:[a-z_]+["']?[^>]*>\s*/gi, "")
      .replace(/<meta\b[^>]*\bname=["']?twitter:[^"' >]+["']?[^>]*>\s*/gi, "")
      .replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])(?=[^>]*\bdata-jsonld=["']blog-entry["'])[^>]*>[\s\S]*?<\/script>\s*/g, "")
      .replace(/<body\b/i, `${metaTags}<body`)
  }

  return html
}

// ── Main ────────────────────────────────────────────────────────────────

export async function prerender() {
  const shellPath = resolve(BUILD_DIR, "index.html")
  if (!existsSync(shellPath)) {
    console.error("docs/build/index.html not found. Run 'npm run website:build' first.")
    process.exit(1)
  }

  const shellHtml = readFileSync(shellPath, "utf-8")
  const routes = extractRoutes()
  const blogEntries = await loadBlogEntries()
  let renderRoute = null
  try {
    renderRoute = await createStaticRouteRenderer()
  } catch (err) {
    console.warn("[prerender] could not initialize static route renderer:", err.message)
  }

  const routeDocs = []
  const machineDocForRoute = (route) => {
    if (!renderRoute) return null
    try {
      const doc = sanitizeRouteHtml(renderRoute(route), route)
      const scriptDoc = routeDocForScript(doc)
      if (scriptDoc) routeDocs.push(scriptDoc)
      return doc
    } catch (err) {
      console.warn(`[prerender] could not render machine-readable content for /${route}: ${err.message}`)
      return null
    }
  }

  console.log(`Pre-rendering ${routes.length} routes (+ ${blogEntries.length} blog entries)...`)

  writeFileSync(shellPath, generatePage(shellHtml, "", null, machineDocForRoute("")))
  let created = 1
  for (const route of routes) {
    if (route === "/" || route === "" || route === "*" || route.includes(":")) continue
    const dir = resolve(BUILD_DIR, route)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, "index.html"), generatePage(shellHtml, route, null, machineDocForRoute(route)))
    created++
  }

  // Expand the `blog/:slug` parameterized route into one static
  // page per registered entry, with entry-specific OG / Twitter /
  // schema.org metadata baked in.
  for (const entry of blogEntries) {
    const route = `blog/${entry.slug}`
    const dir = resolve(BUILD_DIR, route)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, "index.html"), generatePage(shellHtml, route, entry, machineDocForRoute(route)))
    created++
  }

  const routeUrls = routes
    .filter(r => r && r !== "*" && r !== "/" && !r.includes(":"))
    .map(r => `${SITE_URL}/${r}`)
  const blogUrls = blogEntries.map((e) => `${SITE_URL}/blog/${e.slug}`)
  const sitemapPaths = [...routeUrls, ...blogUrls].join("\n")
  writeFileSync(resolve(BUILD_DIR, "sitemap.txt"), `${SITE_URL}/\n${sitemapPaths}\n`)

  // XML sitemap with per-URL lastmod. Crawlers prefer XML over text
  // because lastmod lets them prioritize crawling fresh content \u2014
  // especially useful for the blog where entries.date drives staleness.
  const today = new Date().toISOString().slice(0, 10)
  const xmlEntries = [
    { loc: `${SITE_URL}/`, lastmod: today },
    ...routeUrls.map((url) => ({ loc: url, lastmod: today })),
    ...blogEntries.map((e) => ({
      loc: `${SITE_URL}/blog/${e.slug}`,
      lastmod: e.date || today,
    })),
  ]
  const sitemapXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...xmlEntries.map(
      ({ loc, lastmod }) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
    ),
    `</urlset>`,
    "",
  ].join("\n")
  writeFileSync(resolve(BUILD_DIR, "sitemap.xml"), sitemapXml)

  // robots.txt \u2014 explicit allow + sitemap pointer. Crawlers default to
  // allow-all when no robots.txt exists, but an explicit Sitemap line
  // helps discovery (Google, Bing, and others read it directly).
  const robotsTxt = [
    `User-agent: *`,
    `Allow: /`,
    ``,
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ``,
  ].join("\n")
  writeFileSync(resolve(BUILD_DIR, "robots.txt"), robotsTxt)

  const copiedApiAssets = copyDocsApiAssets()
  const copiedOgCards = copyBlogOgCards()
  writeFileSync(
    resolve(BUILD_DIR, ROUTE_DOCS_MANIFEST),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      site: SITE_URL,
      routes: routeDocs,
    }, null, 2) + "\n",
  )

  console.log(`\u2705 ${created} pages pre-rendered`)
  console.log(`\u2705 sitemap.txt + sitemap.xml + robots.txt written`)
  console.log(`\u2705 ${ROUTE_DOCS_MANIFEST} written (${routeDocs.length} routes)`)
  if (copiedApiAssets.length > 0) {
    console.log(`\u2705 copied API assets: ${copiedApiAssets.join(", ")}`)
  }
  if (copiedOgCards.length > 0) {
    console.log(`\u2705 copied ${copiedOgCards.length} blog OG cards`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prerender().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
