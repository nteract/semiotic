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

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath, pathToFileURL } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUILD_DIR = resolve(__dirname, "../docs/build")
const APP_SRC = resolve(__dirname, "../docs/src/App.js")
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

// ── Generate pre-rendered HTML for a route ──────────────────────────────

export function generatePage(shellHtml, routePath) {
  const title = routePath
    .split("/")
    .filter(Boolean)
    .map(s => s.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "))
    .join(" \u2014 ")

  const fullTitle = title ? `${title} \u2014 Semiotic` : "Semiotic \u2014 Data Visualization for React"

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

  return normalizedShell
    .replace(/<title>[^<]*<\/title>/, `${llmsAlternate}<title>${fullTitle}</title>${jsonLd}`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${navHtml}</noscript>`)
    .replace(/<meta\b(?=[^>]*\bproperty=["']?og:url["']?)[^>]*>/, `<meta property="og:url" content="${canonicalUrl}" />`)
    .replace(/<link\s+rel=["']?canonical["']?[^>]*>/, `<link rel="canonical" href="${canonicalUrl}" />`)
}

// ── Main ────────────────────────────────────────────────────────────────

export function prerender() {
  const shellPath = resolve(BUILD_DIR, "index.html")
  if (!existsSync(shellPath)) {
    console.error("docs/build/index.html not found. Run 'npm run website:build' first.")
    process.exit(1)
  }

  const shellHtml = readFileSync(shellPath, "utf-8")
  const routes = extractRoutes()

  console.log(`Pre-rendering ${routes.length} routes...`)

  writeFileSync(shellPath, generatePage(shellHtml, ""))
  let created = 1
  for (const route of routes) {
    if (route === "/" || route === "" || route === "*" || route.includes(":")) continue
    const dir = resolve(BUILD_DIR, route)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, "index.html"), generatePage(shellHtml, route))
    created++
  }

  const sitemapPaths = routes
    .filter(r => r && r !== "*" && r !== "/" && !r.includes(":"))
    .map(r => `https://semiotic3.nteract.io/${r}`)
    .join("\n")
  writeFileSync(resolve(BUILD_DIR, "sitemap.txt"), `https://semiotic3.nteract.io/\n${sitemapPaths}\n`)

  console.log(`\u2705 ${created} pages pre-rendered`)
  console.log(`\u2705 sitemap.txt written`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prerender()
}
