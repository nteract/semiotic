import { describe, expect, it } from "vitest"
import { sanitizeSvgForWidget } from "./svg-sanitize"
import { applySvgTheme } from "./svg-theme"
import { renderChartWithEvidence } from "../src/components/server/renderToStaticSVG"

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${body}</svg>`

async function sanitize(body: string) {
  const svg = await sanitizeSvgForWidget(wrap(body))
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  expect(doc.querySelector("parsererror")).toBeNull()
  return doc
}

describe("widget SVG allowlist", () => {
  it("emits valid XML and retains accessible labels and local references", async () => {
    const doc = await sanitize(`<title id="title">Revenue &amp; cost</title>
      <defs><linearGradient id="paint" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="red"/></linearGradient>
      <path id="mark" d="M0 0L10 10"/><clipPath id="clip"><rect width="10" height="10"/></clipPath></defs>
      <g aria-labelledby="title" data-semiotic-mark="bar" clip-path="url(#clip)">
        <use xlink:href="#mark" fill="url(#paint)" stroke-dasharray="2 3"/>
        <text xml:space="preserve">A &gt; B</text>
      </g>`)
    expect(doc.querySelector("title")?.textContent).toBe("Revenue & cost")
    expect(doc.querySelector("g")?.getAttribute("aria-labelledby")).toBe(
      "title"
    )
    expect(doc.querySelector("use")?.getAttribute("href")).toBe("#mark")
    expect(doc.querySelector("use")?.getAttribute("fill")).toBe("url(#paint)")
    expect(doc.querySelector("use")?.getAttribute("stroke-dasharray")).toBe(
      "2 3"
    )
    expect(
      doc.querySelector("linearGradient")?.getAttribute("gradientUnits")
    ).toBe("userSpaceOnUse")
    expect(doc.querySelector("stop")?.getAttribute("stop-color")).toBe("red")
    expect(
      doc
        .querySelector("text")
        ?.getAttributeNS("http://www.w3.org/XML/1998/namespace", "space")
    ).toBe("preserve")
  })

  it("drops unknown attributes, active elements and foreign namespaces", async () => {
    const doc =
      await sanitize(`<rect width="10" foo="y" formaction="x" to="x" attributeName="x" xlink:actuate="onLoad" onload="alert(1)"/>
      <script>alert(1)</script><foreignObject><p xmlns="http://www.w3.org/1999/xhtml">HTML</p></foreignObject>
      <animate attributeName="href" to="https://evil.test"/><rect xmlns="https://evil.test"/>`)
    expect(doc.querySelectorAll("rect")).toHaveLength(1)
    expect(
      Array.from(doc.querySelector("rect")!.attributes).map((a) => a.name)
    ).toEqual(["width"])
    expect(doc.querySelector("script, foreignObject, animate")).toBeNull()
  })

  it.each([
    "https://evil.test/paint.svg#x",
    "//evil.test/paint.svg#x",
    "/paint.svg#x",
    "./paint.svg#x",
    "../paint.svg#x",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "javascript:alert(1)",
    "file:///paint.svg#x"
  ])(
    "removes resource references to %s from attributes and CSS",
    async (url) => {
      const doc = await sanitize(`<use href="${url}"/><image href="${url}"/>
      <rect fill="url('${url}')" stroke="url(${url})" style="fill:url('${url}');opacity:0.5"/>
      <style>rect {fill:url('${url}');opacity:0.75}</style>`)
      expect(doc.querySelector("use")?.hasAttribute("href")).toBe(false)
      expect(doc.querySelector("image")?.hasAttribute("href")).toBe(false)
      expect(doc.querySelector("rect")?.hasAttribute("fill")).toBe(false)
      expect(doc.querySelector("rect")?.hasAttribute("stroke")).toBe(false)
      expect(doc.querySelector("rect")?.getAttribute("style")).toContain(
        "opacity: 0.5"
      )
      expect(doc.querySelector("style")?.textContent).toContain("opacity: 0.75")
      expect(doc.documentElement.outerHTML).not.toContain("evil.test")
      expect(doc.querySelector("style")?.textContent).not.toContain("url(")
    }
  )

  it("rejects imports, escaped URLs, remote font faces and styles targeting the widget shell", async () => {
    const doc = await sanitize(String.raw`<style>
      @import url(https://evil.test/import);
      @\69mport "https://evil.test/escape";
      @font-face {font-family:evil;src:url(https://evil.test/font)}
      body {position:fixed;background:url(https://evil.test/bg)}
      rect {fill:u\72l(https://evil.test/fill);stroke:\75 rl(https://evil.test/stroke);opacity:0.5}
      @import "https://evil.test/no-semicolon"
    </style><rect style="fill:u\72l(https://evil.test/inline);opacity:0.75"/>`)
    expect(doc.documentElement.outerHTML).not.toContain("evil.test")
    expect(doc.querySelector("style")?.textContent).not.toContain("@import")
    expect(doc.querySelector("style")?.textContent).not.toContain("@font-face")
    expect(doc.querySelector("rect")?.getAttribute("style")).toContain(
      "opacity: 0.75"
    )
  })

  it("preserves safe quoted fonts, modern colors and theme media rules", async () => {
    const font = '"ACME; Sans } /* Text */ ]]>", serif'
    const input = applySvgTheme(
      wrap(`<style>
      [data-semiotic-auto="chart"] {--semiotic-primary:oklch(50% 0.1 30)}
      @media (prefers-color-scheme:dark) { [data-semiotic-auto="chart"] {--semiotic-primary:var(--semiotic-secondary, red)} }
      .annotation-deferred {opacity:0;pointer-events:none;transition:opacity .12s ease}
      .stream-ordinal-frame:hover .annotation-deferred {opacity:1;pointer-events:auto}
    </style><text fill="var(--semiotic-primary, red)">A</text>`),
      {
        "--semiotic-font-family": font,
        "--semiotic-bg": String.raw`\75 rl(https://evil.test/theme)`
      }
    )
    const output = await sanitizeSvgForWidget(input)
    const doc = new DOMParser().parseFromString(output, "image/svg+xml")
    expect(doc.querySelector("parsererror")).toBeNull()
    const css = Array.from(doc.querySelectorAll("style"))
      .map((s) => s.textContent)
      .join("\n")
    expect(css).toContain(font)
    expect(css).toContain("prefers-color-scheme:dark")
    expect(css).toContain("oklch(")
    expect(css).toContain("--semiotic-secondary")
    expect(css).toContain(".stream-ordinal-frame:hover .annotation-deferred")
    expect(css).toContain("opacity: 1")
    expect(output).not.toContain("evil.test")
  })

  it("keeps raster data images while removing SVG data images and xml:base", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1sAAAAASUVORK5CYII="
    const doc = await sanitize(`<g xml:base="https://evil.test/">
      <image id="raster" href="${png}" width="1" height="1"/>
      <image id="vector" href="data:image/svg+xml;base64,PHN2Zy8+"/>
    </g>`)
    expect(doc.querySelector("#raster")?.getAttribute("href")).toBe(png)
    expect(doc.querySelector("#vector")?.hasAttribute("href")).toBe(false)
    expect(doc.querySelector("g")?.hasAttribute("xml:base")).toBe(false)
  })

  it.each([
    [
      "AreaChart",
      {
        data: [
          { x: 0, y: 2 },
          { x: 1, y: 5 }
        ],
        gradientFill: true
      }
    ],
    [
      "BarChart",
      {
        data: [{ category: "A", value: 3 }],
        categoryAccessor: "category",
        valueAccessor: "value"
      }
    ],
    [
      "ForceDirectedGraph",
      { edges: [{ source: "A", target: "B" }], iterations: 1 }
    ],
    ["ProportionalSymbolMap", { points: [{ lon: 0, lat: 0, value: 1 }] }],
    ["UnitPileChart", { data: [{ category: "A", value: 1 }] }],
    ["BigNumber", { value: 42 }]
  ] as const)(
    "preserves %s geometry, accessible text and adaptive palettes",
    async (component, props) => {
      const rendered = renderChartWithEvidence(component, {
        ...props,
        title: "Measurements",
        theme: { mode: "auto" }
      })
      const parse = (svg: string) =>
        new DOMParser().parseFromString(svg, "image/svg+xml")
      const before = parse(rendered.svg)
      const after = parse(await sanitizeSvgForWidget(rendered.svg))
      expect(after.querySelector("parsererror")).toBeNull()
      expect(rendered.evidence.markCount).toBeGreaterThan(0)
      const geometry = (doc: Document) =>
        Array.from(
          doc.querySelectorAll(
            "path,rect,circle,ellipse,line,polyline,polygon,text"
          )
        ).map((node) => ({
          tag: node.localName,
          attributes: [
            "d",
            "x",
            "y",
            "x1",
            "y1",
            "x2",
            "y2",
            "cx",
            "cy",
            "r",
            "width",
            "height",
            "points",
            "fill",
            "stroke",
            "aria-label"
          ].map((name) => node.getAttribute(name)),
          text: node.textContent
        }))
      expect(geometry(after)).toEqual(geometry(before))
      expect(after.documentElement.getAttribute("aria-label")).toBe(
        before.documentElement.getAttribute("aria-label")
      )
      expect(after.querySelector("style")?.textContent).toContain(
        "prefers-color-scheme:dark"
      )
      expect(after.querySelector("style")?.textContent).toContain(
        "--semiotic-bg: #1a1a2e"
      )
    }
  )

  it.each([
    "",
    "<svg>",
    "<html/>",
    '<svg xmlns="https://evil.test"/>',
    '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>'
  ])("rejects invalid or non-SVG documents: %s", async (input) => {
    await expect(sanitizeSvgForWidget(input)).rejects.toThrow()
  })
})
