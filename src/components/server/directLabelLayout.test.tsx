import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import { LineChart } from "../charts/xy/LineChart"
import { renderDirectLabels } from "../charts/shared/DirectLabelLayer"
import {
  directLabelAnnotations,
  expandDirectLabelRequests
} from "../charts/shared/directLabels"
import { renderStaticAnnotations } from "./staticAnnotations"
import { LIGHT_THEME } from "../store/themeCore"
import { useLabelMeasurer } from "../text/useLabelMeasurer"
import { SVGOverlay } from "../stream/SVGOverlay"
import { scaleLinear } from "d3-scale"

vi.mock("../text/useLabelMeasurer", () => ({ useLabelMeasurer: vi.fn() }))

const rows = (magnitude = 1, count = 6) =>
  Array.from({ length: count }, (_, i) => [
    { x: 0, y: magnitude * 0.2, series: `Series ${i}` },
    { x: 1, y: magnitude * (0.93 + i * 0.01), series: `Series ${i}` }
  ]).flat()
const props = (magnitude = 1, count = 6) => ({
  data: rows(magnitude, count),
  width: 500,
  height: 280,
  xAccessor: "x" as const,
  yAccessor: "y" as const,
  lineBy: "series" as const,
  colorBy: "series" as const,
  directLabel: true,
  xExtent: [0, 1] as [number, number],
  yExtent: [0, magnitude] as [number, number],
  margin: { top: 20, bottom: 40, left: 50, right: 90 },
  title: "Endpoint comparison",
  showAxes: false
})
const coordinates = (svg: string) => {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  return [...doc.querySelectorAll("[data-direct-label-id] text")]
    .map((text) => ({
      label: text.textContent,
      x: Number(text.getAttribute("x")),
      y: Number(text.getAttribute("y"))
    }))
    .sort((a, b) => a.label!.localeCompare(b.label!))
}

describe("direct-label rendered evidence", () => {
  it("produces unit-invariant SVG and matching live/static coordinates with the same estimate metrics", () => {
    const results = [1e-6, 1, 1e9].map((magnitude) => {
      const config = props(magnitude)
      const rendered = renderChartWithEvidence("LineChart", config)
      const live = renderToStaticMarkup(<LineChart {...config} />)
      const actual = coordinates(rendered.svg)
      const liveCoords = coordinates(live)
      expect(actual).toHaveLength(6)
      expect(liveCoords).toHaveLength(6)
      actual.forEach((p, i) => {
        expect(Math.abs(p.x - liveCoords[i].x)).toBeLessThanOrEqual(1)
        expect(Math.abs(p.y - liveCoords[i].y)).toBeLessThanOrEqual(1)
      })
      expect(rendered.evidence.layout).toMatchObject({
        requested: 6,
        rendered: 6,
        omitted: 0,
        status: "incomplete",
        measurement: { estimated: 6 }
      })
      expect(rendered.evidence.annotationCount).toBe(actual.length)
      return actual
    })
    results.forEach((result) =>
      result.forEach((p, i) => expect(p.y).toBeCloseTo(results[0][i].y, 6))
    )
  })

  it("accounts for loss, preserves mark status and exposes every series in the root accessible description", () => {
    const result = renderChartWithEvidence("LineChart", {
      ...props(1, 30),
      height: 100,
      showLegend: false
    })
    const layout = result.evidence.layout!
    expect(layout.omitted).toBeGreaterThan(0)
    expect(result.evidence.status).toBe("ok")
    expect(layout.requested).toBe(layout.rendered + layout.omitted)
    expect(coordinates(result.svg)).toHaveLength(layout.rendered)
    expect(result.evidence.annotationCount).toBe(layout.rendered)
    expect(layout.findings.map((f) => f.code)).toContain("INSUFFICIENT_SPACE")
    expect(layout.findings.map((f) => f.code)).toContain("LABEL_OMITTED")
    const doc = new DOMParser().parseFromString(result.svg, "image/svg+xml")
    expect(
      doc.querySelectorAll('[data-direct-label-fallback] [role="listitem"]')
    ).toHaveLength(30)
    expect(doc.querySelector("svg > desc")!.textContent).toContain("Series 29:")
    expect(JSON.parse(JSON.stringify(result.evidence)).layout).toEqual(layout)
  })

  it("leaves author offsets and custom formatter output intact and does no label work without labels", () => {
    const annotation = {
      type: "text",
      x: 0.5,
      y: 0.5,
      dx: 17,
      dy: -23,
      label: "Authored"
    }
    const result = renderChartWithEvidence("LineChart", {
      ...props(),
      directLabel: false,
      annotations: [annotation],
      showAxes: true,
      xFormat: (n: number) => `custom:${n}`
    })
    expect(result.evidence.layout).toBeUndefined()
    expect(result.svg).toContain("custom:")
    expect(annotation).toMatchObject({ dx: 17, dy: -23 })
    expect(result.svg).toContain("Authored")
    const measure = vi.fn()
    expect(
      renderDirectLabels([annotation], {
        width: 200,
        height: 100,
        scales: null,
        measure
      }).node
    ).toBeNull()
    expect(measure).not.toHaveBeenCalled()
  })

  it("uses semantic endpoint selection across unsorted gap segments and falsy groups", () => {
    const labels = directLabelAnnotations(
      [
        { x: 5, y: 30, series: 0 },
        { x: 1, y: 10, series: 0 },
        { x: 2, y: 20, series: false },
        { x: 8, y: 40, series: false }
      ],
      { position: "end", fontSize: 11, colorBy: "series", color: () => "red" }
    )
    expect(labels.map((l) => [l.label, l.x])).toEqual([
      ["0", 5],
      ["false", 8]
    ])
  })

  it("never converts missing scales or invalid projections to zero and retains fallback on total render loss", () => {
    const annotations = directLabelAnnotations(rows(), {
      position: "end",
      fontSize: 11,
      colorBy: "series",
      color: () => "red"
    })
    const { node, evidence } = renderDirectLabels(annotations, {
      width: 300,
      height: 200,
      scales: null
    })
    expect(evidence).toMatchObject({ rendered: 0, omitted: 6 })
    expect(evidence!.findings.map((f) => f.code)).toContain(
      "INVALID_PROJECTION"
    )
    expect(renderToStaticMarkup(<>{node}</>)).not.toContain("NaN")
    expect(renderToStaticMarkup(<>{node}</>)).toContain("Series 5")
  })

  it("expands push requests from the current snapshot even when scales stay fixed", () => {
    const request = [
      {
        type: "text",
        _directLabelRequest: {
          position: "end",
          fontSize: 11,
          colorBy: "series",
          color: () => "red"
        }
      }
    ]
    const before = expandDirectLabelRequests(request, rows())
    const after = expandDirectLabelRequests(request, [
      ...rows(),
      { x: 2, y: 0.3, series: "Series 0" }
    ])
    expect(before[0].x).toBe(1)
    expect(after[0]).toMatchObject({ x: 2, y: 0.3 })
  })

  it("reconciles evidence after a custom annotation renderer drops a placed label", () => {
    const result = renderChartWithEvidence("LineChart", {
      ...props(),
      svgAnnotationRules: (annotation: { label?: string }) =>
        annotation.label === "Series 0" ? false : null
    })
    expect(result.evidence.layout).toMatchObject({
      requested: 6,
      rendered: 5,
      omitted: 1
    })
    expect(coordinates(result.svg)).toHaveLength(5)
    expect(result.evidence.annotationCount).toBe(5)
    expect(
      result.evidence.layout!.findings.find((f) => f.code === "RENDER_FAILURE")!
        .labelIds
    ).toEqual(["Series 0"])
    expect(result.evidence.layout!.displacedIds).not.toContain("Series 0")
    expect(result.svg).toContain("Series 0: x 1")
  })

  it("shares the exact placement and painter with an equivalent measured renderer input", () => {
    const annotations = directLabelAnnotations(rows(), {
      position: "end",
      fontSize: 11,
      colorBy: "series",
      color: () => "red"
    })
    const context = {
      width: 300,
      height: 200,
      margin: { left: 80, right: 80 },
      scales: {
        x: scaleLinear().domain([0, 1]).range([0, 300]),
        y: scaleLinear().domain([0, 1]).range([200, 0])
      }
    }
    const measure = () => ({
      width: 40,
      height: 12,
      ascent: 9,
      source: "measured" as const
    })
    const first = renderDirectLabels(annotations, { ...context, measure })
    expect(first.evidence!.status).toBe("complete")
    vi.mocked(useLabelMeasurer).mockReturnValueOnce(measure)
    const live = renderToStaticMarkup(
      <SVGOverlay
        {...context}
        totalWidth={460}
        totalHeight={260}
        margin={{ ...context.margin, top: 20, bottom: 40 }}
        annotations={annotations}
      />
    )
    const staticNode = renderStaticAnnotations({
      annotations,
      layout: context,
      margin: context.margin,
      scales: context.scales,
      theme: LIGHT_THEME,
      labelMeasurer: measure
    })
    const svg = renderToStaticMarkup(<svg>{staticNode}</svg>)
    expect(coordinates(svg)).toHaveLength(6)
    expect(coordinates(live)).toEqual(coordinates(svg))
  })
})
