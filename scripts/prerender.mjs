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
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUILD_DIR = resolve(__dirname, "../docs/build")
const APP_SRC = resolve(__dirname, "../docs/src/App.js")

// ── Extract routes from App.js ──────────────────────────────────────────

function extractRoutes() {
  const source = readFileSync(APP_SRC, "utf-8")
  const PARENTS = ["charts", "features", "cookbook", "frames", "playground", "recipes", "api"]
  const routePattern = /path="([^"]+)"/g
  const rawPaths = []
  let match
  while ((match = routePattern.exec(source)) !== null) {
    rawPaths.push(match[1])
  }

  const paths = new Set([""])
  let currentParent = ""
  for (const p of rawPaths) {
    if (p === "*") continue
    if (PARENTS.includes(p)) {
      currentParent = p
      paths.add(p)
    } else if (!p.includes("/")) {
      paths.add(currentParent ? `${currentParent}/${p}` : p)
    } else {
      paths.add(p)
    }
  }
  return Array.from(paths)
}

// ── Generate pre-rendered HTML for a route ──────────────────────────────

function generatePage(shellHtml, routePath) {
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

  return shellHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${fullTitle}</title>`)
    .replace(/<noscript>.*?<\/noscript>/, `<noscript>${navHtml}</noscript>`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="https://semiotic3.nteract.io/${routePath}" />`)
}

// ── Main ────────────────────────────────────────────────────────────────

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

main()
