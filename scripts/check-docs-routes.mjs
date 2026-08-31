#!/usr/bin/env node
/**
 * Smoke-checks the generated docs site after `website:build`.
 *
 * This intentionally checks files in docs/build rather than React components:
 * the failures we care about here are broken prerender output, missing route
 * HTML, or generated API JSON not making it into the static deployment.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { loadExampleDefinitions } from "./prerender.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_BUILD_DIR = resolve(__dirname, "../docs/build")
const SITE_URL = "https://semiotic.nteract.io"
const EXAMPLE_DEFINITIONS = await loadExampleDefinitions()
const REQUIRED_EXAMPLE_DOCS_ROUTES = EXAMPLE_DEFINITIONS.map((definition) => ({
  routePath: definition.path.replace(/^\/+/, ""),
  title: `${definition.title} \u2014 Semiotic`,
  canonicalUrl: `${SITE_URL}${definition.path}`,
}))

export const REQUIRED_DOCS_ROUTES = [
  {
    routePath: "",
    title: "Semiotic \u2014 Data Visualization for React",
    canonicalUrl: SITE_URL,
  },
  {
    routePath: "api",
    // ROUTE_META in scripts/prerender.mjs supplies curated section
    // titles for top-level routes; expected strings here track those
    // values rather than the slug-case fallback.
    title: "API Reference \u2014 Semiotic",
    canonicalUrl: `${SITE_URL}/api`,
  },
  {
    routePath: "api/charts",
    title: "Chart Components API \u2014 Semiotic",
    canonicalUrl: `${SITE_URL}/api/charts`,
  },
  {
    routePath: "api/typedoc",
    title: "TypeDoc \u2014 Semiotic API Reference",
    canonicalUrl: `${SITE_URL}/api/typedoc`,
  },
  {
    routePath: "examples",
    title: "Examples \u2014 Semiotic",
    canonicalUrl: `${SITE_URL}/examples`,
  },
  {
    routePath: "custom-charts/intelligence",
    title: "Custom Charts \u2014 Intelligence \u2014 Semiotic",
    canonicalUrl: `${SITE_URL}/custom-charts/intelligence`,
  },
  ...REQUIRED_EXAMPLE_DOCS_ROUTES,
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

export const REQUIRED_MACHINE_READABLE_ROUTES = [
  {
    routePath: "",
    keyword: "Streaming-First Visualization for React",
  },
  {
    routePath: "getting-started",
    keyword: "streaming-first visualization library",
  },
  {
    routePath: "charts/line-chart",
    keyword: "LineChart",
  },
  {
    routePath: "blog/release-3-7-0",
    keyword: "receivability release",
  },
  ...EXAMPLE_DEFINITIONS.map((definition) => ({
    routePath: definition.path.replace(/^\/+/, ""),
    keyword: definition.title,
  })),
]

export function routeHtmlPath(buildDir, routePath) {
  return routePath ? resolve(buildDir, routePath, "index.html") : resolve(buildDir, "index.html")
}

export function validateDocsBuild({
  buildDir = DEFAULT_BUILD_DIR,
  routes = REQUIRED_DOCS_ROUTES,
  apiAssets = REQUIRED_API_ASSETS,
  machineReadableRoutes = REQUIRED_MACHINE_READABLE_ROUTES,
} = {}) {
  const failures = validateEagerDocsMount(buildDir)

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
    expectRootRelativeShellAssets(failures, html, route.routePath)
  }

  const manifestPath = resolve(buildDir, "llms-routes.json")
  let routeDocs = []
  if (!existsSync(manifestPath)) {
    failures.push(`Missing machine-readable route manifest at ${manifestPath}`)
  } else {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
      routeDocs = Array.isArray(manifest.routes) ? manifest.routes : []
      if (routeDocs.length === 0) {
        failures.push(`Machine-readable route manifest has no routes at ${manifestPath}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push(`Could not parse machine-readable route manifest at ${manifestPath}: ${message}`)
    }
  }

  for (const route of machineReadableRoutes) {
    const filePath = routeHtmlPath(buildDir, route.routePath)
    if (!existsSync(filePath)) {
      failures.push(`Missing machine-readable route HTML ${route.routePath || "/"} at ${filePath}`)
      continue
    }

    const html = readFileSync(filePath, "utf8")
    expectIncludes(failures, html, 'id="semiotic-route-doc"', route.routePath, "route JSON doc")
    expectIncludes(failures, html, 'id="machine-readable-page"', route.routePath, "machine-readable noscript content")
    expectIncludes(failures, html, route.keyword, route.routePath, "machine-readable keyword")

    const routeKey = route.routePath || "/"
    const routeDoc = routeDocs.find((doc) => doc?.route === routeKey)
    if (!routeDoc) {
      failures.push(`Missing ${routeKey} in llms-routes.json`)
      continue
    }
    if (typeof routeDoc.text !== "string" || routeDoc.text.length < 200) {
      failures.push(`Machine-readable text for ${routeKey} is too short in llms-routes.json`)
    }
    if (!routeDoc.text?.includes(route.keyword)) {
      failures.push(`Machine-readable text for ${routeKey} is missing keyword: ${route.keyword}`)
    }
    if (!Array.isArray(routeDoc.headings) || routeDoc.headings.length === 0) {
      failures.push(`Machine-readable headings for ${routeKey} are missing in llms-routes.json`)
    }
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

export function validateEagerDocsMount(buildDir = DEFAULT_BUILD_DIR) {
  const failures = []
  const htmlPath = resolve(buildDir, "index.html")

  if (!existsSync(htmlPath)) {
    return [`Missing docs root HTML at ${htmlPath}`]
  }

  const html = readFileSync(htmlPath, "utf8")
  const moduleEntries = [...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>/gi)]
    .map(([tag]) => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter(Boolean)

  if (moduleEntries.length === 0) {
    return [`Docs root HTML has no external module entry at ${htmlPath}`]
  }

  const pending = moduleEntries
    .map((specifier) => resolveBuiltModule(buildDir, htmlPath, specifier))
    .filter(Boolean)
  const eagerModules = new Map()

  while (pending.length > 0) {
    const modulePath = pending.pop()
    if (eagerModules.has(modulePath)) continue
    if (!existsSync(modulePath)) {
      failures.push(`Missing eager docs module at ${modulePath}`)
      continue
    }

    const source = readFileSync(modulePath, "utf8")
    eagerModules.set(modulePath, source)
    for (const specifier of staticModuleSpecifiers(source)) {
      const dependencyPath = resolveBuiltModule(buildDir, modulePath, specifier)
      if (dependencyPath && !eagerModules.has(dependencyPath)) {
        pending.push(dependencyPath)
      }
    }
  }

  const hasEagerReactMount = [...eagerModules.values()].some((source) =>
    /\bcreateRoot\b[\s\S]{0,240}\bgetElementById\(\s*["'`]root["'`]\s*\)/.test(source),
  )

  if (!hasEagerReactMount) {
    failures.push(
      "Docs root module graph has no eager React mount; do not defer the app entry with import(), because Vite preload helpers can create a silent circular evaluation deadlock",
    )
  }

  return failures
}

function staticModuleSpecifiers(source) {
  const specifiers = []
  const patterns = [
    /\bimport\s*["'`]([^"'`]+)["'`]/g,
    /\b(?:import|export)(?!\s*\()[^"'`;]*?\bfrom\s*["'`]([^"'`]+)["'`]/g,
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1])
    }
  }

  return specifiers
}

function resolveBuiltModule(buildDir, importerPath, specifier) {
  const cleanSpecifier = specifier.split(/[?#]/, 1)[0]
  if (!cleanSpecifier.endsWith(".js") || /^(?:[a-z]+:)?\/\//i.test(cleanSpecifier)) return null

  const modulePath = cleanSpecifier.startsWith("/")
    ? resolve(buildDir, `.${cleanSpecifier}`)
    : resolve(dirname(importerPath), cleanSpecifier)
  const relativePath = relative(buildDir, modulePath)
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) return null
  return modulePath
}

function expectIncludes(failures, text, expected, routePath, label) {
  if (!text.includes(expected)) {
    failures.push(`Missing ${label} for ${routePath || "/"}: ${expected}`)
  }
}

function expectRootRelativeShellAssets(failures, html, routePath) {
  const brokenRefs = html.match(/\b(?:src|href)=["']\.\/(?:assets\/|prism\.(?:js|css)|semiotic\.css)/g) || []
  if (brokenRefs.length > 0) {
    failures.push(
      `Route ${routePath || "/"} has relative shell asset references that break deep links: ${[...new Set(brokenRefs)].join(", ")}`
    )
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

  console.log(
    `✅ docs route smoke check passed (${REQUIRED_DOCS_ROUTES.length} routes, ${REQUIRED_API_ASSETS.length} API assets, ${REQUIRED_MACHINE_READABLE_ROUTES.length} machine-readable routes)`
  )
}
