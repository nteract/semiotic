import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  renderChart,
  renderChartWithEvidence,
  renderXYToStaticSVG,
  renderDashboard
} from "./renderToStaticSVG"
import { scopeSvgIdentifiers } from "../shared/svgIdentifiers"
import { SvgIdentifierScope } from "../shared/SvgIdentifierScope"
import { unstable_fromGofishIR } from "../recipes/gofishIR"
import { bottleIR } from "../recipes/gofishIRExamples"
import { NetworkCustomChart } from "../charts/custom/NetworkCustomChart"
import { processChrome } from "../recipes/processChrome"
import { renderedSceneHash } from "../evidence/renderedSceneHash"
import { applySvgTheme } from "../../../ai/svg-theme"

function checkReferences(svg: SVGElement) {
  const ids = new Set([...svg.querySelectorAll("[id]")].map((node) => node.id))
  expect(ids.size).toBe(svg.querySelectorAll("[id]").length)
  for (const node of svg.querySelectorAll("*")) {
    for (const attribute of node.attributes) {
      for (const match of attribute.value.matchAll(/url\(#([^)]+)\)/g))
        expect(ids.has(match[1])).toBe(true)
      if (attribute.name === "href" && attribute.value.startsWith("#"))
        expect(ids.has(attribute.value.slice(1))).toBe(true)
      if (/^aria-(labelledby|describedby)$/.test(attribute.name)) {
        for (const id of attribute.value.split(/\s+/))
          expect(ids.has(id)).toBe(true)
      }
    }
  }
  return ids
}

const line = {
  data: [
    { x: 0, y: 2 },
    { x: 1, y: 5 }
  ],
  title: "Sales",
  description: "Revenue",
  gradientFill: true
}
const bars = {
  data: [{ category: "A", value: 3 }],
  categoryAccessor: "category",
  valueAccessor: "value",
  frameProps: {
    pieceStyle: () => ({
      fill: { type: "hatch", stroke: "#00f", background: "#fff" }
    })
  }
}

describe("instance-local SVG identifiers", () => {
  it("keeps default evidence deterministic while allocating distinct document IDs", () => {
    const first = renderChartWithEvidence("AreaChart", line)
    renderChart("BarChart", bars)
    const second = renderChartWithEvidence("AreaChart", line)
    expect(first.svg).not.toBe(second.svg)
    expect(first.evidence.sceneHash).toBe(second.evidence.sceneHash)
    const theme = { "--semiotic-primary": "#008800" }
    expect(
      renderedSceneHash(applySvgTheme(first.svg, theme), first.evidence)
    ).toBe(renderedSceneHash(applySvgTheme(second.svg, theme), second.evidence))
    expect(
      renderedSceneHash(applySvgTheme(first.svg, theme), first.evidence)
    ).not.toBe(first.evidence.sceneHash)
  })

  it("preserves HTML IDREF relationships inside foreignObject", () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><form id="form"/><label for="field">Name</label><input id="field" list="choices" form="form"/><datalist id="choices"/><table><tr><th id="column">Name</th><td headers="column outside">Ada</td></tr></table></div></foreignObject></svg>'
    const scoped = scopeSvgIdentifiers(source, "local")
    const doc = new DOMParser().parseFromString(scoped, "image/svg+xml")
    expect(doc.querySelector("parsererror")).toBeNull()
    expect((doc.querySelector("label") as HTMLLabelElement).control).toBe(
      doc.querySelector("input")
    )
    expect(doc.querySelector("input")?.getAttribute("list")).toBe(
      "local-choices"
    )
    expect(doc.querySelector("input")?.getAttribute("form")).toBe("local-form")
    expect(doc.querySelector("td")?.getAttribute("headers")).toBe(
      "local-column outside"
    )
  })

  it("scopes CSS selectors and local paint URLs without changing colors, comments, strings or external URLs", () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><style><![CDATA[/* #shape url(#paint) */ @media all { #shape, :is(#fff) { fill: url("#paint"); color: #fff; content: "#shape url(#paint)"; background: url(other.svg#paint); } }]]></style><defs><linearGradient id="paint"/></defs><rect id="shape"/><rect id="fff"/></svg>'
    const scoped = scopeSvgIdentifiers(source, "local")
    const doc = new DOMParser().parseFromString(scoped, "image/svg+xml")
    expect(doc.querySelector("parsererror")).toBeNull()
    const css = doc.querySelector("style")?.textContent
    expect(css).toContain(
      '#local-shape, :is(#local-fff) { fill: url("#local-paint")'
    )
    expect(css).toContain('color: #fff; content: "#shape url(#paint)"')
    expect(css).toContain("/* #shape url(#paint) */")
    expect(css).toContain("url(other.svg#paint)")
    expect(
      scopeSvgIdentifiers(
        '<svg><!-- <style>#shape{}</style> --><text title="&lt;style&gt;#shape{}&lt;/style&gt;">#shape</text><rect id="shape"/></svg>',
        "local"
      )
    ).toContain("<!-- <style>#shape{}</style> -->")
  })

  it("preserves HTML and paint references in React overlays", () => {
    const { container } = render(
      <SvgIdentifierScope>
        <svg>
          <defs>
            <linearGradient id="paint" />
          </defs>
          <rect id="shape" fill="url(#paint)" />
          <foreignObject>
            <div>
              <label htmlFor="field">Name</label>
              <input id="field" />
            </div>
          </foreignObject>
        </svg>
      </SvgIdentifierScope>
    )
    const paint = container.querySelector("linearGradient")!.id
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe(
      `url(#${paint})`
    )
    expect(container.querySelector("label")!.control).toBe(
      container.querySelector("input")
    )
  })

  it.each([
    ["AreaChart", line],
    ["BarChart", bars],
    [
      "ForceDirectedGraph",
      {
        nodes: [{ id: "A" }, { id: "B" }],
        edges: [{ source: "A", target: "B" }],
        nodeStyle: () => ({ fill: bars.frameProps.pieceStyle().fill })
      }
    ],
    [
      "ProportionalSymbolMap",
      {
        points: [{ lon: 0, lat: 0, value: 3 }],
        pointStyle: () => ({ fill: bars.frameProps.pieceStyle().fill })
      }
    ],
    ["MinimapChart", line]
  ])(
    "scopes every ID and local reference in two identical %s renders",
    (component, props) => {
      const svgs = [
        renderChart(component, props),
        renderChart(component, props)
      ]
      const doc = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${svgs.join("")}</svg>`,
        "image/svg+xml"
      )
      expect(doc.querySelector("parsererror")).toBeNull()
      const [first, second] = [...doc.documentElement.children] as SVGElement[]
      expect(
        first.querySelector("linearGradient, pattern, clipPath")
      ).not.toBeNull()
      const a = checkReferences(first)
      const b = checkReferences(second)
      expect([...a].filter((id) => b.has(id))).toEqual([])
    }
  )

  it("supports stable caller prefixes, including frame helpers and render evidence", () => {
    const props = { ...line, chartId: "stable-chart" }
    expect(renderChart("AreaChart", props)).toBe(
      renderChartWithEvidence("AreaChart", props).svg
    )
    const frame = renderXYToStaticSVG({
      data: line.data,
      chartType: "area",
      _idPrefix: "stable-frame"
    })
    expect(frame).toContain('id="stable-frame-data-area"')
    expect(frame).not.toContain('id="data-area"')
  })

  it("keeps dashboard prefixes distinct across repeated compositions", () => {
    const a = renderDashboard([
      { component: "BarChart", props: { ...bars, _idPrefix: "authored" } }
    ])
    const b = renderDashboard([
      { component: "BarChart", props: { ...bars, _idPrefix: "authored" } }
    ])
    const doc = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${a}${b}</svg>`,
      "image/svg+xml"
    )
    const ids = [...doc.querySelectorAll("[id]")].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.some((id) => id.includes("authored"))).toBe(true)
  })

  it("rewrites real references while preserving text, external URLs and unknown targets", () => {
    const source =
      '<svg aria-labelledby="label" aria-describedby="label   outside" aria-label="url(#paint)"><title id="label">url(#paint)</title><defs><linearGradient id="paint"/></defs><path fill="url(\'&#35;paint\')" style="filter:url(#paint)"/><use href="#paint"/><use href="other.svg#paint"/><use href="#external"/></svg>'
    const scoped = scopeSvgIdentifiers(source, "local")
    expect(scoped).toContain('aria-labelledby="local-label"')
    expect(scoped).toContain('aria-describedby="local-label   outside"')
    expect(scoped).toContain('aria-label="url(#paint)"')
    expect(scoped).toContain("fill=\"url('#local-paint')\"")
    expect(scoped).toContain('style="filter:url(#local-paint)"')
    expect(scoped).toContain('href="#local-paint"')
    expect(scoped).toContain('href="other.svg#paint"')
    expect(scoped).toContain('href="#external"')
    expect(scoped).toContain(">url(#paint)</title>")
  })

  it("scopes a shared recipe overlay independently at each mount and preserves rerenders", () => {
    const overlay = (
      <SvgIdentifierScope>
        <svg>
          <defs>
            <linearGradient id="paint" />
          </defs>
          <rect width={10} height={10} fill="url(#paint)" />
          <rect
            width={10}
            height={10}
            fill="var(--paint)"
            style={{ "--paint": "url(#paint)" } as React.CSSProperties}
          />
        </svg>
      </SvgIdentifierScope>
    )
    const { container, rerender } = render(
      <>
        {overlay}
        {overlay}
      </>
    )
    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id)
    expect(new Set(ids).size).toBe(2)
    for (const svg of container.querySelectorAll("svg")) {
      checkReferences(svg)
      expect(svg.querySelector("[style]")?.getAttribute("style")).toContain(
        `url(#${svg.querySelector("linearGradient")!.id})`
      )
    }
    rerender(
      <>
        {overlay}
        {overlay}
      </>
    )
    expect(
      [...container.querySelectorAll("[id]")].map((node) => node.id)
    ).toEqual(ids)
  })

  it("scopes GoFish masks and process gradients per chart", () => {
    const cfg = unstable_fromGofishIR(bottleIR)
    const markup = renderToStaticMarkup(
      <>
        <NetworkCustomChart {...cfg} layout={cfg.networkLayout} />
        <NetworkCustomChart {...cfg} layout={cfg.networkLayout} />
      </>
    )
    const doc = new DOMParser().parseFromString(markup, "text/html")
    const ids = [...doc.querySelectorAll("[id]")].map((node) => node.id)
    expect(doc.querySelectorAll("mask").length).toBeGreaterThan(1)
    expect(new Set(ids).size).toBe(ids.length)
    for (const overlay of doc.querySelectorAll<SVGElement>(
      ".semiotic-gofish-displaylist"
    ))
      checkReferences(overlay)
    const layout = {
      width: 200,
      height: 160,
      left: 10,
      right: 190,
      topY: 40,
      bottomY: 140,
      midY: 90,
      stages: []
    }
    const { container } = render(
      <>
        {processChrome(layout)}
        {processChrome(layout)}
      </>
    )
    const gradients = [...container.querySelectorAll("linearGradient")].map(
      (node) => node.id
    )
    expect(new Set(gradients).size).toBe(2)
    for (const svg of container.querySelectorAll("svg")) checkReferences(svg)
  })
})
