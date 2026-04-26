import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { REQUIRED_DOCS_ROUTES, validateDocsBuild } from "../../../scripts/check-docs-routes.mjs"
import { generatePage } from "../../../scripts/prerender.mjs"

const shell = '<html><head><title>Semiotic</title><meta property=og:url content=https://example.com><link rel=canonical href=https://example.com></head><body><noscript>old</noscript><div id="root"></div></body></html>'

// Track every temp dir created in this file so afterEach can clean them up.
// Without this, repeated CI/local runs leave a stack of semiotic-docs-routes-*
// directories in the OS temp folder.
const createdDirs: string[] = []

describe("docs route smoke check", () => {
  afterEach(() => {
    while (createdDirs.length > 0) {
      const dir = createdDirs.pop()!
      try { rmSync(dir, { recursive: true, force: true }) } catch { /* best-effort */ }
    }
  })

  it("passes when prerendered API routes and generated API assets exist", () => {
    const buildDir = makeBuildDir()
    writeDocsBuildFixture(buildDir)

    expect(validateDocsBuild({ buildDir })).toEqual({
      ok: true,
      failures: [],
    })
  })

  it("reports missing API data needed by the TypeDoc route", () => {
    const buildDir = makeBuildDir()
    writeRouteFiles(buildDir)
    writeFileSync(join(buildDir, "sitemap.txt"), REQUIRED_DOCS_ROUTES.map(route => route.canonicalUrl).join("\n"))

    const result = validateDocsBuild({ buildDir })

    expect(result.ok).toBe(false)
    expect(result.failures).toEqual(expect.arrayContaining([
      expect.stringContaining("Missing TypeDoc API JSON"),
      expect.stringContaining("Missing component description JSON"),
    ]))
  })

  it("reports stale route metadata", () => {
    const buildDir = makeBuildDir()
    writeDocsBuildFixture(buildDir)
    writeFileSync(join(buildDir, "api", "typedoc", "index.html"), generatePage(shell, "api/charts"))

    const result = validateDocsBuild({ buildDir })

    expect(result.ok).toBe(false)
    expect(result.failures).toEqual(expect.arrayContaining([
      expect.stringContaining("Missing title for api/typedoc"),
      expect.stringContaining("Missing canonical URL for api/typedoc"),
    ]))
  })
})

function makeBuildDir() {
  const dir = mkdtempSync(join(tmpdir(), "semiotic-docs-routes-"))
  createdDirs.push(dir)
  return dir
}

function writeDocsBuildFixture(buildDir: string) {
  writeRouteFiles(buildDir)
  writeApiAssets(buildDir)
  writeFileSync(join(buildDir, "sitemap.txt"), `${REQUIRED_DOCS_ROUTES.map(route => route.canonicalUrl).join("\n")}\n`)
}

function writeRouteFiles(buildDir: string) {
  for (const route of REQUIRED_DOCS_ROUTES) {
    const dir = route.routePath ? join(buildDir, route.routePath) : buildDir
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "index.html"), generatePage(shell, route.routePath))
  }
}

function writeApiAssets(buildDir: string) {
  const apiDir = join(buildDir, "api")
  mkdirSync(apiDir, { recursive: true })
  writeFileSync(join(apiDir, "api.json"), JSON.stringify({
    name: "Semiotic API Reference",
    children: [],
  }))
  writeFileSync(join(apiDir, "component-descriptions.json"), JSON.stringify({
    LineChart: "Line chart",
    BarChart: "Bar chart",
  }))
}
