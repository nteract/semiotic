import { describe, expect, it } from "vitest"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { extractRoutesFromSource, generatePage, copyDocsApiAssets } from "../../../scripts/prerender.mjs"

describe("docs prerender helpers", () => {
  it("extracts nested docs routes without leaking the previous parent", () => {
    const source = `
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="api" element={<Outlet />}>
          <Route
            path=""
            element={
              <>
                <h1>API</h1>
                <ApiIndex />
              </>
            }
          />
          <Route path="charts" element={<ChartsApi />} />
          <Route
            path="typedoc"
            element={<ApiDocs />}
          />
        </Route>
        <Route path="charts" element={<Outlet />}>
          <Route path="line-chart" element={<LineChart />} />
        </Route>
        <Route path="theming" element={<Outlet />}>
          <Route path="styling" element={<Styling />} />
          <Route path="theme-provider" element={<ThemeProviderDocs />} />
        </Route>
        <Route path="features/styling" element={<Redirect />} />
        <Route
          path="cookbook"
          element={<Outlet />}
        >
          <Route
            path="timeline"
            element={<Timeline />}
          />
        </Route>
      </Routes>
    `

    const routes = extractRoutesFromSource(source)

    expect(routes).toContain("")
    expect(routes).toContain("api")
    expect(routes).toContain("api/charts")
    expect(routes).toContain("api/typedoc")
    expect(routes).toContain("charts")
    expect(routes).toContain("charts/line-chart")
    expect(routes).toContain("theming/styling")
    expect(routes).toContain("theming/theme-provider")
    expect(routes).toContain("features/styling")
    expect(routes).toContain("cookbook/timeline")
    expect(routes).not.toContain("api/styling")
  })

  it("generates SEO metadata and a noscript fallback for the homepage", () => {
    const shell = `
      <html>
        <head>
          <title>Semiotic</title>
          <meta property=og:url content=https://example.com/>
          <link rel=canonical href=https://example.com/>
        </head>
        <body><noscript>
          old fallback
        </noscript><div id="root"></div></body>
      </html>
    `

    const html = generatePage(shell, "")

    expect(html).toContain("<title>Semiotic \u2014 Data Visualization for React</title>")
    expect(html).toContain('property="og:url" content="https://semiotic3.nteract.io"')
    expect(html).toContain('rel="canonical" href="https://semiotic3.nteract.io"')
    expect(html).toContain('data-jsonld="semiotic"')
    expect(html).toContain("AI / Machine-readable docs")
    expect(html).not.toContain("old fallback")
  })

  it("replaces minified canonical tags for nested routes", () => {
    const html = generatePage(
      '<html><head><title>Shell</title><meta property=og:url content=https://example.com><link rel=canonical href=https://example.com></head><body><noscript>old</noscript></body></html>',
      "theming/styling"
    )

    expect(html).toContain('property="og:url" content="https://semiotic3.nteract.io/theming/styling"')
    expect(html).toContain('rel="canonical" href="https://semiotic3.nteract.io/theming/styling"')
    expect(html).not.toContain("https://example.com")
  })

  it("does not duplicate injected metadata when rerun", () => {
    const shell = '<html><head><title>Shell</title><meta property=og:url content=https://example.com><link rel=canonical href=https://example.com></head><body><noscript>old</noscript></body></html>'
    const once = generatePage(shell, "")
    const twice = generatePage(once, "theming/styling")

    expect(twice.match(/<link rel="alternate" type="text\/plain" href="\/llms\.txt"/g)).toHaveLength(1)
    expect(twice.match(/"@type":"SoftwareApplication"/g)).toHaveLength(1)
    expect(twice.match(/data-jsonld="semiotic"/g)).toHaveLength(1)
    expect(twice.match(/property="og:url"/g)).toHaveLength(1)
    expect(twice).toContain('property="og:url" content="https://semiotic3.nteract.io/theming/styling"')
    expect(twice).toContain('rel="canonical" href="https://semiotic3.nteract.io/theming/styling"')
  })

  it("preserves unrelated JSON-LD scripts", () => {
    const unrelatedJsonLd = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Other App"}</script>'
    const shell = `<html><head><title>Shell</title>${unrelatedJsonLd}<meta property=og:url content=https://example.com><link rel=canonical href=https://example.com></head><body><noscript>old</noscript></body></html>`
    const html = generatePage(shell, "")

    expect(html).toContain(unrelatedJsonLd)
    expect(html.match(/data-jsonld="semiotic"/g)).toHaveLength(1)
    expect(html.match(/"@type":"SoftwareApplication"/g)).toHaveLength(2)
  })

  it("copies generated API JSON assets into the static build", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "semiotic-docs-prerender-"))
    try {
      const publicApiDir = join(tmpRoot, "public", "api")
      const buildDir = join(tmpRoot, "build")
      mkdirSync(publicApiDir, { recursive: true })

      writeFileSync(join(publicApiDir, "api.json"), '{"name":"Semiotic API Reference","children":[]}\n')
      writeFileSync(join(publicApiDir, "component-descriptions.json"), '{"LineChart":"Line chart"}\n')
      writeFileSync(join(publicApiDir, "notes.txt"), "not copied\n")

      const copied = copyDocsApiAssets(publicApiDir, buildDir)

      expect(copied).toEqual(["api/api.json", "api/component-descriptions.json"])
      expect(readFileSync(join(buildDir, "api", "api.json"), "utf8")).toContain("Semiotic API Reference")
      expect(readFileSync(join(buildDir, "api", "component-descriptions.json"), "utf8")).toContain("LineChart")
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})
