import { describe, expect, it } from "vitest"
import { fitSvgToBox, renderedSvgDimensions } from "./svgSizing"
import { composeDashboard } from "./renderDashboard"
import {
  findSvgRoot,
  setSvgRootAttributes,
  svgRootAttribute
} from "../shared/svgRoot"

const hostileLabelSvg = `<svg xmlns="http://www.w3.org/2000/svg" aria-label="A > B width='999' height='888' viewBox='decoy' preserveAspectRatio='none'" data-width="900" width = '450' height="500" style="font-family: &quot;A &amp; B&quot;"><path d="M0 0"/></svg>`

describe("exact SVG root attributes", () => {
  it("reads actual dimensions past quoted angle brackets and misleading attribute names", () => {
    expect(
      renderedSvgDimensions(hostileLabelSvg, { width: 10, height: 20 })
    ).toEqual({ width: 450, height: 500 })
    expect(
      renderedSvgDimensions(
        '<svg data-width="999" aria-label="height=\'800\'"></svg>',
        { width: 10, height: 20 }
      )
    ).toEqual({ width: 10, height: 20 })
  })

  it("fits dimensions without modifying attribute-like text inside labels", () => {
    const fitted = fitSvgToBox(hostileLabelSvg, { width: 450, height: 500 })
    const document = new DOMParser().parseFromString(fitted, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    expect(document.documentElement.getAttribute("aria-label")).toBe(
      "A > B width='999' height='888' viewBox='decoy' preserveAspectRatio='none'"
    )
    expect(document.documentElement.getAttribute("width")).toBe("100%")
    expect(document.documentElement.getAttribute("height")).toBe("100%")
    expect(document.documentElement.getAttribute("viewBox")).toBe("0 0 450 500")
    expect(document.documentElement.getAttribute("preserveAspectRatio")).toBe(
      "xMidYMid meet"
    )
    expect(document.documentElement.getAttribute("data-width")).toBe("900")
  })

  it("preserves existing view boxes and empty-element syntax", () => {
    const fitted = fitSvgToBox(
      '<svg viewBox="1 2 3 4" preserveAspectRatio="none"/>',
      { width: 450, height: 500 }
    )
    const document = new DOMParser().parseFromString(fitted, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    expect(document.documentElement.getAttribute("viewBox")).toBe("1 2 3 4")
    expect(document.documentElement.getAttribute("preserveAspectRatio")).toBe(
      "none"
    )
    expect(fitted).toMatch(/\/>$/)
  })

  it("composes a dashboard with the rendered height and intact nested SVG", () => {
    const svg = composeDashboard(
      [{ component: "LineChart", props: { height: 100 } }],
      {},
      {
        chart: () => hostileLabelSvg,
        frame: () => hostileLabelSvg
      }
    )
    const document = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    expect(
      document.querySelector("foreignObject")?.getAttribute("height")
    ).toBe("500")
    expect(document.querySelector("div svg")?.getAttribute("viewBox")).toBe(
      "0 0 450 500"
    )
  })

  it("escapes replacement values and updates styles without duplicating attributes", () => {
    const root = findSvgRoot(hostileLabelSvg)!
    const style = `${svgRootAttribute(root, "style")};background:rgb(1 2 3 / 50%)`
    const svg = setSvgRootAttributes(hostileLabelSvg, {
      style,
      title: 'A > B & "C"'
    })
    const document = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    expect(document.documentElement.getAttribute("style")).toBe(
      'font-family: "A & B";background:rgb(1 2 3 / 50%)'
    )
    expect(document.documentElement.getAttribute("title")).toBe('A > B & "C"')
  })

  it("round-trips numeric entities and whitespace when rewriting an attribute", () => {
    const svg =
      '<svg style="font-family: &#x27;A &amp; B&#39;; --label: &#10;"/>'
    const style = svgRootAttribute(findSvgRoot(svg)!, "style")!
    expect(style).toBe("font-family: 'A & B'; --label: \n")
    const updated = setSvgRootAttributes(svg, { style })
    const document = new DOMParser().parseFromString(updated, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    expect(document.documentElement.getAttribute("style")).toBe(style)
  })
})
