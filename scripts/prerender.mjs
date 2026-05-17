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

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath, pathToFileURL } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUILD_DIR = resolve(__dirname, "../docs/build")
const APP_SRC = resolve(__dirname, "../docs/src/App.js")
const PUBLIC_API_DIR = resolve(__dirname, "../docs/public/api")
const SITE_URL = "https://semiotic3.nteract.io"

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
    const mod = await import(pathToFileURL(metaPath).href)
    return mod.blogEntriesMeta || []
  } catch (err) {
    console.warn("[prerender] could not load blog metadata:", err.message)
    return []
  }
}

// ── Generate pre-rendered HTML for a route ──────────────────────────────

export function generatePage(shellHtml, routePath, blogMeta = null) {
  const title = routePath
    .split("/")
    .filter(Boolean)
    .map(s => s.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "))
    .join(" \u2014 ")

  // For blog entry routes, prefer the entry's own title + subtitle
  // over the slug-derived heuristic.
  const fullTitle = blogMeta?.title
    ? `${blogMeta.title} \u2014 Semiotic Blog`
    : (title ? `${title} \u2014 Semiotic` : "Semiotic \u2014 Data Visualization for React")

  const navHtml = `
    <nav style="max-width:800px;margin:0 auto;padding:20px;font-family:system-ui,sans-serif;">
      <h1>${fullTitle}</h1>
      <p><a href="/">Home</a> \u00b7 <a href="/getting-started">Getting Started</a> \u00b7 <a href="/charts">Charts</a> \u00b7 <a href="/features">Features</a> \u00b7 <a href="/playground">Playground</a></p>
      <p>This page requires JavaScript for interactive chart demos.</p>
      <p><strong>AI / Machine-readable docs:</strong> <a href="/llms.txt">llms.txt</a> \u00b7 <a href="/llms-full.txt">llms-full.txt</a> \u00b7 <a href="/CLAUDE.md">CLAUDE.md</a> \u00b7 <a href="/schema.json">schema.json</a> \u00b7 <a href="/api-reference.md">API Reference</a> \u00b7 <a href="/examples.md">Examples</a></p>
      <p><a href="https://github.com/nteract/semiotic">View on GitHub</a> \u00b7 <code>npx semiotic-ai</code> for CLI access</p>
    </nav>`

  // JSON-LD injected here (not in source HTML) to avoid Parcel's jsonld transformer
  const llmsAlternate = '<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable documentation index" />'
  const jsonLd = '<script type="application/ld+json" data-jsonld="semiotic">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Semiotic","applicationCategory":"DeveloperApplication","description":"React data visualization library for charts, networks, and streaming data.","url":"https://semiotic3.nteract.io","codeRepository":"https://github.com/nteract/semiotic","programmingLanguage":["TypeScript","React"],"license":"https://opensource.org/licenses/Apache-2.0","author":{"@type":"Person","name":"Elijah Meeks"},"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}<\/script>'
  const canonicalUrl = routePath ? `${SITE_URL}/${routePath}` : SITE_URL
  let normalizedShell = shellHtml
  let previousShell
  do {
    previousShell = normalizedShell
    normalizedShell = normalizedShell
      .replace(/<link\s+rel=["']?alternate["']?[^>]*href=["']?\/llms\.txt[^>]*>/g, "")
      .replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])(?=[^>]*\bdata-jsonld=["']semiotic["'])[^>]*>[\s\S]*?<\/script>/g, "")
  } while (normalizedShell !== previousShell)

  let html = normalizedShell
    .replace(/<title>[^<]*<\/title>/, `${llmsAlternate}<title>${fullTitle}</title>${jsonLd}`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${navHtml}</noscript>`)
    .replace(/<meta\b(?=[^>]*\bproperty=["']?og:url["']?)[^>]*>/, `<meta property="og:url" content="${canonicalUrl}" />`)
    .replace(/<link\s+rel=["']?canonical["']?[^>]*>/, `<link rel="canonical" href="${canonicalUrl}" />`)

  // Blog-entry enrichment: per-entry OG description / image / type and
  // Twitter summary_large_image markup. Inserted into <head> just
  // before </head>. The Parcel-built shell carries placeholder og:*
  // meta tags pointing at the docs landing — for blog entries we
  // override with the entry's subtitle and the rendered card PNG.
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
    const escDescription = description
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const blogMetaTags = [
      `<meta name="description" content="${escDescription}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:title" content="${blogMeta.title.replace(/"/g, "&quot;")}" />`,
      `<meta property="og:description" content="${escDescription}" />`,
      `<meta property="og:image" content="${ogImage}" />`,
      `<meta property="article:published_time" content="${blogMeta.date}" />`,
      `<meta property="article:author" content="${blogMeta.author}" />`,
      ...(blogMeta.tags || []).map((t) => `<meta property="article:tag" content="${t}" />`),
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${blogMeta.title.replace(/"/g, "&quot;")}" />`,
      `<meta name="twitter:description" content="${escDescription}" />`,
      `<meta name="twitter:image" content="${ogImage}" />`,
      `<script type="application/ld+json" data-jsonld="blog-entry">${blogJsonLd}</script>`,
    ].join("\n    ")
    // Drop any existing description/og:type/og:image/og:title/twitter:* tags
    // first so the entry-specific ones aren't fighting them.
    html = html
      .replace(/<meta\s+name=["']?description["']?[^>]*>\s*/gi, "")
      .replace(/<meta\b[^>]*\bproperty=["']?og:(?:type|title|description|image)["']?[^>]*>\s*/gi, "")
      .replace(/<meta\b[^>]*\bname=["']?twitter:[^"' >]+["']?[^>]*>\s*/gi, "")
      .replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])(?=[^>]*\bdata-jsonld=["']blog-entry["'])[^>]*>[\s\S]*?<\/script>\s*/g, "")
      .replace(/<\/head>/, `    ${blogMetaTags}\n  </head>`)
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

  console.log(`Pre-rendering ${routes.length} routes (+ ${blogEntries.length} blog entries)...`)

  writeFileSync(shellPath, generatePage(shellHtml, ""))
  let created = 1
  for (const route of routes) {
    if (route === "/" || route === "" || route === "*" || route.includes(":")) continue
    const dir = resolve(BUILD_DIR, route)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, "index.html"), generatePage(shellHtml, route))
    created++
  }

  // Expand the `blog/:slug` parameterized route into one static
  // page per registered entry, with entry-specific OG / Twitter /
  // schema.org metadata baked in.
  for (const entry of blogEntries) {
    const route = `blog/${entry.slug}`
    const dir = resolve(BUILD_DIR, route)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, "index.html"), generatePage(shellHtml, route, entry))
    created++
  }

  const routeUrls = routes
    .filter(r => r && r !== "*" && r !== "/" && !r.includes(":"))
    .map(r => `${SITE_URL}/${r}`)
  const blogUrls = blogEntries.map((e) => `${SITE_URL}/blog/${e.slug}`)
  const sitemapPaths = [...routeUrls, ...blogUrls].join("\n")
  writeFileSync(resolve(BUILD_DIR, "sitemap.txt"), `${SITE_URL}/\n${sitemapPaths}\n`)
  const copiedApiAssets = copyDocsApiAssets()

  console.log(`\u2705 ${created} pages pre-rendered`)
  console.log(`\u2705 sitemap.txt written`)
  if (copiedApiAssets.length > 0) {
    console.log(`\u2705 copied API assets: ${copiedApiAssets.join(", ")}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prerender().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
