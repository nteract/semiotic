import { describe, expect, it } from "vitest"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  copyDocsApiAssets,
  extractRoutesFromSource,
  generatePage,
  loadExampleDefinitions,
  mergeExampleDefinitionRoutes,
  sanitizeRouteHtml,
} from "../../../scripts/prerender.mjs"

describe("docs prerender helpers", () => {
  it("fails closed when the example manifest is missing or malformed", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "semiotic-example-manifest-"))
    try {
      await expect(loadExampleDefinitions(join(tmpRoot, "missing.js"))).rejects.toThrow(
        /manifest does not exist/,
      )
      const malformed = join(tmpRoot, "malformed.js")
      writeFileSync(malformed, "export const EXAMPLE_DEFINITIONS = []\n")
      await expect(loadExampleDefinitions(malformed)).rejects.toThrow(/non-empty array/)
      const dynamic = join(tmpRoot, "dynamic.js")
      writeFileSync(
        dynamic,
        "export const EXAMPLE_DEFINITIONS = [{ path: '/examples/:slug', title: 'Dynamic' }]\n",
      )
      await expect(loadExampleDefinitions(dynamic)).rejects.toThrow(/valid static path/)
      const duplicate = join(tmpRoot, "duplicate.js")
      writeFileSync(
        duplicate,
        "export const EXAMPLE_DEFINITIONS = [{ path: '/examples/same', title: 'One' }, { path: '/examples/same', title: 'Two' }]\n",
      )
      await expect(loadExampleDefinitions(duplicate)).rejects.toThrow(/duplicate path/)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

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

  it("merges definition-backed example paths omitted by dynamic JSX routes", () => {
    const source = `
      <Routes>
        <Route path="examples" element={<ExamplesOverviewPage />} />
        {EXAMPLE_ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>
    `

    const extracted = extractRoutesFromSource(source)
    const routes = mergeExampleDefinitionRoutes(extracted, [
      { path: "/examples/insight-forge", title: "Insight Forge" },
      { path: "/examples/analyst-adventure/", title: "Analyst Adventure" },
      { path: "/blog/not-an-example", title: "Not an example" },
      { path: "/examples/:slug", title: "Dynamic example" },
    ])

    expect(extracted).toEqual(["", "examples"])
    expect(routes).toEqual([
      "",
      "examples",
      "examples/insight-forge",
      "examples/analyst-adventure",
    ])
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
    expect(html).toContain('property="og:url" content="https://semiotic.nteract.io"')
    expect(html).toContain('rel="canonical" href="https://semiotic.nteract.io"')
    expect(html).toContain('data-jsonld="semiotic"')
    expect(html).toContain("AI / Machine-readable docs")
    expect(html).not.toContain("old fallback")
  })

  it("embeds route-specific machine-readable HTML and JSON when provided", () => {
    const shell = `
      <html>
        <head>
          <title>Semiotic</title>
          <meta property=og:url content=https://example.com/>
          <link rel=canonical href=https://example.com/>
        </head>
        <body><noscript>old fallback</noscript><div id="root"></div></body>
      </html>
    `
    const html = generatePage(shell, "charts/line-chart", null, {
      route: "charts/line-chart",
      url: "https://semiotic.nteract.io/charts/line-chart",
      html: "<article><h1>LineChart</h1><p>LineChart route content for agents.</p></article>",
      text: "LineChart route content for agents.",
      headings: [{ level: 1, text: "LineChart" }],
      codeBlocks: ['import { LineChart } from "semiotic/xy"'],
      links: [{ text: "LineChart", href: "/charts/line-chart" }],
    })

    expect(html).toContain('id="semiotic-route-doc"')
    expect(html).toContain('id="machine-readable-page"')
    expect(html).toContain('data-machine-readable-route="charts/line-chart"')
    expect(html).toContain("<h1>LineChart</h1>")
    expect(html).toContain('"route":"charts/line-chart"')
    expect(html).toContain('"codeBlocks":["import { LineChart } from \\"semiotic/xy\\""]')
  })

  it("removes unsafe link protocols from sanitized route HTML", () => {
    const doc = sanitizeRouteHtml(`
      <main class="App">
        <h1>Links</h1>
        <p>
          <a href="/charts">Charts</a>
          <a href="https://example.com">External</a>
          <a href=" JAVASCRIPT:alert(1)">Script</a>
          <a href="vbscript:alert(1)">VBScript</a>
          <a href="daTa:text/html,evil">Data</a>
          <a href="fi&#10;le:///tmp/secret">File</a>
          <span href="javascript:alert(1)">Span</span>
        </p>
      </main>
    `, "links")

    expect(doc?.links).toEqual([
      { text: "Charts", href: "/charts" },
      { text: "External", href: "https://example.com" },
    ])
    expect(doc?.html).toContain('<a href="/charts">Charts</a>')
    expect(doc?.html).toContain('<a href="https://example.com">External</a>')
    expect(doc?.html).toContain("<a>Script</a>")
    expect(doc?.html).toContain("<a>VBScript</a>")
    expect(doc?.html).toContain("<a>Data</a>")
    expect(doc?.html).toContain("<a>File</a>")
    expect(doc?.html).toContain("<span>Span</span>")
  })

  it("sanitizes links in blog article machine-readable HTML", () => {
    const doc = sanitizeRouteHtml(`
      <div class="App App--blog">
        <nav><a href="javascript:alert(1)">Unsafe chrome</a></nav>
        <article>
          <h1>Blog Post</h1>
          <p>
            <a href="/blog">Blog home</a>
            <a href=" JavaScript:alert(1)">Unsafe blog link</a>
          </p>
        </article>
      </div>
    `, "blog/example-post")

    expect(doc?.route).toBe("blog/example-post")
    expect(doc?.text).toContain("Blog Post")
    expect(doc?.text).not.toContain("Unsafe chrome")
    expect(doc?.links).toEqual([{ text: "Blog home", href: "/blog" }])
    expect(doc?.html).toContain('<a href="/blog">Blog home</a>')
    expect(doc?.html).toContain("<a>Unsafe blog link</a>")
    expect(doc?.html).not.toContain("javascript:")
  })

  it("replaces minified canonical tags for nested routes", () => {
    const html = generatePage(
      '<html><head><title>Shell</title><meta property=og:url content=https://example.com><link rel=canonical href=https://example.com></head><body><noscript>old</noscript></body></html>',
      "theming/styling"
    )

    expect(html).toContain('property="og:url" content="https://semiotic.nteract.io/theming/styling"')
    expect(html).toContain('rel="canonical" href="https://semiotic.nteract.io/theming/styling"')
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
    expect(twice).toContain('property="og:url" content="https://semiotic.nteract.io/theming/styling"')
    expect(twice).toContain('rel="canonical" href="https://semiotic.nteract.io/theming/styling"')
  })

  it("preserves unrelated JSON-LD scripts", () => {
    const unrelatedJsonLd = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Other App"}</script>'
    const shell = `<html><head><title>Shell</title>${unrelatedJsonLd}<meta property=og:url content=https://example.com><link rel=canonical href=https://example.com></head><body><noscript>old</noscript></body></html>`
    const html = generatePage(shell, "")

    expect(html).toContain(unrelatedJsonLd)
    expect(html.match(/data-jsonld="semiotic"/g)).toHaveLength(1)
    expect(html.match(/"@type":"SoftwareApplication"/g)).toHaveLength(2)
  })

  // Regression: HTML minifiers can strip the implicit </head>
  // closing tag, so the prerender's meta injection has to anchor on
  // <body instead. The fixture below
  // deliberately omits </head> to mirror that minified shape and
  // assert the page-specific tags still land in the output.
  it("injects blog-entry meta tags into a minified shell with no </head>", () => {
    const shell = '<html lang=en><head><meta name=description content="generic"><meta property=og:title content="generic"><meta property=og:description content="generic"><meta property=og:image content="generic.png"><meta property=og:url content=https://example.com><meta name=twitter:card content=summary><meta name=twitter:title content="generic"><link rel=canonical href=https://example.com><title>Shell</title><body><noscript>old</noscript></body></html>'

    const html = generatePage(shell, "blog/my-post", {
      slug: "my-post",
      title: "My Post",
      subtitle: "A subtitle with <special> & \"chars\"",
      author: "Jane",
      date: "2026-01-15",
      tags: ["release", "case-study"],
    })

    expect(html).toContain('<title>My Post — Semiotic Blog</title>')
    expect(html).toContain('property="og:type" content="article"')
    expect(html).toContain('property="og:title" content="My Post"')
    expect(html).toContain('property="og:image" content="https://semiotic.nteract.io/blog/og/my-post.png"')
    expect(html).toContain('property="article:published_time" content="2026-01-15"')
    expect(html).toContain('property="article:author" content="Jane"')
    expect(html).toContain('property="article:tag" content="release"')
    expect(html).toContain('property="article:tag" content="case-study"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('data-jsonld="blog-entry"')
    expect(html).toContain('"@type":"BlogPosting"')
    // Subtitle is HTML-escaped in description meta to defang special chars.
    expect(html).toContain('name="description" content="A subtitle with &lt;special&gt; &amp; &quot;chars&quot;"')
    // The shell's generic description/og/twitter tags get stripped so they
    // don't fight the per-entry ones.
    expect(html).not.toContain('content="generic"')
    // Body is preserved — we anchor injection at <body>, not </head>.
    expect(html).toContain('<body')
  })

  it("applies per-route ROUTE_META overrides for non-blog pages", () => {
    const shell = '<html><head><meta name=description content="generic landing description"><meta property=og:title content="Generic"><meta property=og:description content="Generic"><meta property=og:image content="https://semiotic.nteract.io/assets/img/semiotic-social.png"><meta name=twitter:card content=summary><meta property=og:url content=https://example.com><link rel=canonical href=https://example.com><title>Shell</title></head><body><noscript>old</noscript></body></html>'

    const html = generatePage(shell, "charts")
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || ""
    const afterHeadBeforeBody = html.slice(html.indexOf("</head>"), html.indexOf("<body"))

    expect(html).toContain('<title>Charts — Semiotic</title>')
    // Section description comes from the ROUTE_META map.
    expect(html).toContain('name="description" content="The Semiotic chart catalog')
    expect(html).toContain('property="og:title" content="Charts — Semiotic"')
    expect(html).toContain('property="og:type" content="website"')
    expect(head).toContain('property="og:image"')
    expect(head).toContain('name="twitter:image"')
    expect(afterHeadBeforeBody).not.toContain('property="og:image"')
    // Generic shell description is gone.
    expect(html).not.toContain('generic landing description')
  })

  it("falls back to slug-cased title and shell meta for routes with no ROUTE_META", () => {
    const shell = '<html><head><meta name=description content="generic shell description"><meta property=og:url content=https://example.com><link rel=canonical href=https://example.com><title>Shell</title></head><body><noscript>old</noscript></body></html>'

    const html = generatePage(shell, "cookbook/homerun-map")

    expect(html).toContain('<title>Cookbook — Homerun Map — Semiotic</title>')
    // No ROUTE_META entry → shell description is inherited unchanged.
    expect(html).toContain('name=description content="generic shell description"')
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
