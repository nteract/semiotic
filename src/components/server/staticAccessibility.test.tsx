import * as React from "react"
import { describe, expect, it } from "vitest"
import { renderChartWithEvidence, renderChart } from "./renderToStaticSVG"

const props = {
  data: [
    { x: 0, y: 2 },
    { x: 1, y: 5 }
  ],
  width: 400,
  height: 240
}

function parse(svg: string) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  expect(doc.querySelector("parsererror")).toBeNull()
  return doc
}

describe("static chart accessible titles", () => {
  it("preserves SVG spans and rich title text in markup and evidence", () => {
    const { svg, evidence } = renderChartWithEvidence("LineChart", {
      ...props,
      margin: 0,
      title: (
        <>
          Sales <tspan fontWeight={800}>grew</tspan>
        </>
      )
    })
    const doc = parse(svg)
    expect(doc.querySelector("title")?.textContent).toBe("Sales grew")
    expect(doc.querySelector("text tspan")?.textContent).toBe("grew")
    expect(doc.querySelector("text tspan")?.getAttribute("font-weight")).toBe(
      "800"
    )
    expect(evidence.ariaLabel).toBe("Sales grew")
    expect(evidence.margin?.top).toBeGreaterThanOrEqual(36)
  })

  it("exports HTML titles as readable native SVG text", () => {
    const doc = parse(
      renderChart("LineChart", {
        ...props,
        title: <strong>Sales & growth</strong>
      })
    )
    expect(doc.querySelector("title")?.textContent).toBe("Sales & growth")
    expect(doc.querySelector("strong")).toBeNull()
    expect(
      [...doc.querySelectorAll("text")].some(
        (node) => node.textContent === "Sales & growth"
      )
    ).toBe(true)
  })

  it("resolves a component title through React's server renderer", () => {
    const Title = () => <strong title={"A > B"}>Sales & growth</strong>
    const { svg, evidence } = renderChartWithEvidence("LineChart", {
      ...props,
      title: <Title />
    })
    expect(parse(svg).querySelector("title")?.textContent).toBe(
      "Sales & growth"
    )
    expect(evidence.ariaLabel).toBe("Sales & growth")
  })

  it("names untitled charts with their rendered family and mark count", () => {
    const { svg, evidence } = renderChartWithEvidence("LineChart", props)
    const root = parse(svg).documentElement
    expect(root.getAttribute("aria-label")).toBe(evidence.ariaLabel)
    expect(root.getAttribute("aria-label")).toMatch(/xy chart, \d+ marks/)
    expect(root.getAttribute("role")).toBe("img")
  })
})
