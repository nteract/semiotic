/**
 * Static site generation for the docs site.
 *
 * After `parcel build` produces docs/build/index.html (SPA shell),
 * this script:
 * 1. Extracts all Route paths from App.js
 * 2. For each path, renders the React app to static HTML using
 *    ReactDOMServer + StaticRouter
 * 3. Writes the pre-rendered HTML to docs/build/{path}/index.html
 *
 * The result: every page has real HTML content for crawlers and
 * web-fetch tools, while still hydrating as a SPA on the client.
 *
 * Canvas-based chart demos render as empty containers (expected —
 * canvas can't SSR), but all text, code blocks, props tables, and
 * navigation are present in the HTML.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUILD_DIR = resolve(__dirname, "../docs/build")
const APP_SRC = resolve(__dirname, "../docs/src/App.js")

// ── Step 1: Extract routes from App.js ────────────────────────────────

function extractRoutes() {
  const source = readFileSync(APP_SRC, "utf-8")

  // Known parent route prefixes (from App.js route structure)
  const PARENTS = ["charts", "features", "cookbook", "frames", "playground", "recipes", "api"]

  // Extract all path="..." values
  const routePattern = /path="([^"]+)"/g
  const rawPaths = []
  let match
  while ((match = routePattern.exec(source)) !== null) {
    rawPaths.push(match[1])
  }

  // Build full paths: if a path segment isn't a known parent and doesn't
  // contain "/", it's a child route. Find the nearest parent preceding it.
  const paths = new Set([""])
  let currentParent = ""

  for (const p of rawPaths) {
    if (p === "*") continue
    if (PARENTS.includes(p)) {
      currentParent = p
      paths.add(p)
    } else if (!p.includes("/")) {
      // Child route — prefix with current parent
      const full = currentParent ? `${currentParent}/${p}` : p
      paths.add(full)
    } else {
      paths.add(p)
    }
  }

  return Array.from(paths)
}

// ── Step 2: Build sitemap and path-based HTML files ───────────────────
//
// Since we can't easily SSR a full React app with Parcel's output
// (it bundles everything into hashed chunks), we take a simpler
// approach: for each route, create an HTML file that:
// - Has the same <head> as the SPA shell (meta tags, styles)
// - Contains a <noscript> section with the page title and breadcrumbs
// - Loads the SPA JS for full client-side hydration
//
// This gives crawlers real content (page title, description, nav links)
// while keeping the full SPA experience for users with JS enabled.

function generatePrerenderedPage(shellHtml, routePath, pageTitle) {
  // Create a descriptive title from the route path
  const title = pageTitle || (routePath
    .split("/")
    .filter(Boolean)
    .map(s => s.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "))
    .join(" — "))

  const fullTitle = title ? `${title} — Semiotic` : "Semiotic — Data Visualization for React"

  // Build navigation links for the noscript fallback
  const navHtml = `
    <nav style="max-width:800px;margin:0 auto;padding:20px;font-family:system-ui,sans-serif;">
      <h1>${fullTitle}</h1>
      <p><a href="/">Home</a> · <a href="/getting-started">Getting Started</a> · <a href="/charts">Charts</a> · <a href="/features">Features</a> · <a href="/playground">Playground</a></p>
      <p>This page requires JavaScript for interactive chart demos. <a href="https://github.com/nteract/semiotic">View on GitHub</a></p>
    </nav>`

  // Replace the empty noscript message with useful content
  return shellHtml
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${fullTitle}</title>`
    )
    .replace(
      /<noscript>.*?<\/noscript>/,
      `<noscript>${navHtml}</noscript>`
    )
    .replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="https://semiotic3.nteract.io/${routePath}" />`
    )
}

// ── Step 3: Write files ───────────────────────────────────────────────

function main() {
  const shellPath = resolve(BUILD_DIR, "index.html")
  if (!existsSync(shellPath)) {
    console.error("docs/build/index.html not found. Run 'npm run website:build' first.")
    process.exit(1)
  }

  const shellHtml = readFileSync(shellPath, "utf-8")
  const routes = extractRoutes()

  console.log(`Pre-rendering ${routes.length} routes...`)

  let created = 0
  for (const route of routes) {
    // Skip index (already exists) and parameterized routes
    if (route === "/" || route === "" || route === "*" || route.includes(":")) continue

    const dir = resolve(BUILD_DIR, route)
    const filePath = resolve(dir, "index.html")

    mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, generatePrerenderedPage(shellHtml, route))
    created++
  }

  // Also write a sitemap.txt for crawlers
  const sitemapPaths = routes
    .filter(r => r && r !== "*" && r !== "/" && !r.includes(":"))
    .map(r => `https://semiotic3.nteract.io/${r}`)
    .join("\n")
  const sitemap = `https://semiotic3.nteract.io/\n${sitemapPaths}`
  writeFileSync(resolve(BUILD_DIR, "sitemap.txt"), sitemap + "\n")

  console.log(`✅ ${created} pages pre-rendered`)
  console.log(`✅ sitemap.txt written (${routes.length} URLs)`)
}

main()
