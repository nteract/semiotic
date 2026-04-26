#!/usr/bin/env node
/**
 * Smoke-checks the generated docs site after `website:build`.
 *
 * This intentionally checks files in docs/build rather than React components:
 * the failures we care about here are broken prerender output, missing route
 * HTML, or generated API JSON not making it into the static deployment.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_BUILD_DIR = resolve(__dirname, "../docs/build")
const SITE_URL = "https://semiotic3.nteract.io"

export const REQUIRED_DOCS_ROUTES = [
  {
    routePath: "",
    title: "Semiotic \u2014 Data Visualization for React",
    canonicalUrl: SITE_URL,
  },
  {
    routePath: "api",
    title: "Api \u2014 Semiotic",
    canonicalUrl: `${SITE_URL}/api`,
  },
  {
    routePath: "api/charts",
    title: "Api \u2014 Charts \u2014 Semiotic",
    canonicalUrl: `${SITE_URL}/api/charts`,
  },
  {
    routePath: "api/typedoc",
    title: "Api \u2014 Typedoc \u2014 Semiotic",
    canonicalUrl: `${SITE_URL}/api/typedoc`,
  },
]

export const REQUIRED_API_ASSETS = [
  {
    path: "api/api.json",
    validate: (value) => value?.name === "Semiotic API Reference" && Array.isArray(value.children),
    description: "TypeDoc API JSON",
  },
  {
    path: "api/component-descriptions.json",
    validate: (value) => typeof value?.LineChart === "string" && typeof value?.BarChart === "string",
    description: "component description JSON",
  },
]

export function routeHtmlPath(buildDir, routePath) {
  return routePath ? resolve(buildDir, routePath, "index.html") : resolve(buildDir, "index.html")
}

export function validateDocsBuild({
  buildDir = DEFAULT_BUILD_DIR,
  routes = REQUIRED_DOCS_ROUTES,
  apiAssets = REQUIRED_API_ASSETS,
} = {}) {
  const failures = []

  for (const route of routes) {
    const filePath = routeHtmlPath(buildDir, route.routePath)
    if (!existsSync(filePath)) {
      failures.push(`Missing prerendered route ${route.routePath || "/"} at ${filePath}`)
      continue
    }

    const html = readFileSync(filePath, "utf8")
    expectIncludes(failures, html, `<title>${route.title}</title>`, route.routePath, "title")
    expectIncludes(failures, html, `rel="canonical" href="${route.canonicalUrl}"`, route.routePath, "canonical URL")
    expectIncludes(failures, html, `property="og:url" content="${route.canonicalUrl}"`, route.routePath, "OpenGraph URL")
    expectIncludes(failures, html, 'rel="alternate" type="text/plain" href="/llms.txt"', route.routePath, "LLM alternate")
    expectIncludes(failures, html, 'data-jsonld="semiotic"', route.routePath, "Semiotic JSON-LD")
    expectIncludes(failures, html, "AI / Machine-readable docs", route.routePath, "noscript AI docs fallback")
  }

  for (const asset of apiAssets) {
    const filePath = resolve(buildDir, asset.path)
    if (!existsSync(filePath)) {
      failures.push(`Missing ${asset.description} at ${filePath}`)
      continue
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8"))
      if (!asset.validate(parsed)) {
        failures.push(`Invalid ${asset.description} shape at ${filePath}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push(`Could not parse ${asset.description} at ${filePath}: ${message}`)
    }
  }

  const sitemapPath = resolve(buildDir, "sitemap.txt")
  if (!existsSync(sitemapPath)) {
    failures.push(`Missing sitemap at ${sitemapPath}`)
  } else {
    const sitemap = readFileSync(sitemapPath, "utf8")
    for (const route of routes) {
      expectIncludes(failures, sitemap, route.canonicalUrl, route.routePath, "sitemap entry")
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  }
}

function expectIncludes(failures, text, expected, routePath, label) {
  if (!text.includes(expected)) {
    failures.push(`Missing ${label} for ${routePath || "/"}: ${expected}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateDocsBuild()
  if (!result.ok) {
    console.error("Docs route smoke check failed:")
    for (const failure of result.failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log(`✅ docs route smoke check passed (${REQUIRED_DOCS_ROUTES.length} routes, ${REQUIRED_API_ASSETS.length} API assets)`)
}
