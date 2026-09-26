import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import type { StreamGeoFrameProps } from "../stream/geoTypes"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import type { EvidenceSink } from "./renderEvidence"
import { renderGeoFrame } from "./staticGeo"

const suppressMarks: StreamGeoFrameProps["renderMode"] = {
  id: "suppress-marks",
  cacheKey: () => "suppress-marks",
  drawCanvas: () => true,
  renderStaticSVG: () => false
}

describe("static geo scene composition", () => {
  it.each([
    { name: "empty", points: [], renderMode: undefined, markCount: 0 },
    {
      name: "populated",
      points: [{ lon: 5, lat: 5 }],
      renderMode: undefined,
      markCount: 1
    },
    {
      name: "suppressed",
      points: [{ lon: 5, lat: 5 }],
      renderMode: suppressMarks,
      markCount: 0
    }
  ])(
    "retains chrome, annotations, overlays and evidence for a $name scene",
    ({ points, renderMode, markCount }) => {
      const sink: EvidenceSink = {}
      let projected: [number, number] | null = null
      const annotationRule = vi.fn((annotation) => (
        <text
          key="pin"
          data-layer="annotation"
          x={annotation.x}
          y={annotation.y}
        >
          Pinned
        </text>
      ))
      const svg = renderGeoFrame(
        {
          size: [400, 300],
          projection: "equalEarth",
          margin: { top: 40, right: 20, bottom: 30, left: 25 },
          title: "Map title",
          description: "Map description",
          className: "custom-map",
          _idPrefix: "map",
          xAccessor: "lon",
          yAccessor: "lat",
          projectionExtent: [
            [0, 0],
            [10, 10]
          ],
          areas: [],
          lines: [],
          points,
          renderMode,
          annotations: [{ type: "custom", coordinates: [5, 5] }],
          svgAnnotationRules: annotationRule,
          backgroundGraphics: <text data-layer="background">Behind</text>,
          foregroundGraphics: <text data-layer="foreground">Above</text>,
          legend: <text>Map legend</text>,
          customLayout: (ctx) => {
            projected = ctx.scales.projectedPoint(5, 5)
            return {
              nodes: ctx.points.map((datum) => ({
                type: "geoarea",
                pathData: "M0,0h10v10h-10Z",
                centroid: [5, 5],
                bounds: [
                  [0, 0],
                  [10, 10]
                ],
                screenArea: 100,
                datum,
                style: { fill: "#125678" }
              })),
              overlays: <text data-layer="overlay">Layout overlay</text>
            }
          }
        },
        sink
      )
      const document = new DOMParser().parseFromString(svg, "image/svg+xml")
      expect(document.querySelector("parsererror")).toBeNull()
      expect(document.querySelector("svg")?.getAttribute("class")).toBe(
        "stream-geo-frame custom-map"
      )
      expect(document.querySelector("title")?.textContent).toBe("Map title")
      expect(document.querySelector("desc")?.textContent).toBe(
        "Map description"
      )
      expect(document.getElementById("map-legend")?.textContent).toBe(
        "Map legend"
      )
      const plot = document.getElementById("map-data-area")!
      expect(plot.getAttribute("transform")).toBe("translate(25,40)")
      expect(
        Array.from(plot.querySelectorAll("*"))
          .filter(
            (node) =>
              node.hasAttribute("data-layer") ||
              node.getAttribute("fill") === "#125678"
          )
          .map((node) => node.getAttribute("data-layer") ?? "mark")
      ).toEqual([
        "background",
        ...(markCount ? ["mark"] : []),
        "annotation",
        "foreground",
        "overlay"
      ])
      expect(annotationRule).toHaveBeenCalledTimes(1)
      expect(projected).not.toBeNull()
      const annotation = plot.querySelector('[data-layer="annotation"]')!
      const annotationCoordinates = [
        Number(annotation.getAttribute("x")),
        Number(annotation.getAttribute("y"))
      ]
      expect(annotationCoordinates.every(Number.isFinite)).toBe(true)
      expect(annotationCoordinates).toEqual(projected)
      expect(sink.evidence).toMatchObject({
        frameType: "geo",
        width: 400,
        height: 300,
        markCount,
        empty: markCount === 0,
        status: markCount ? "ok" : "empty",
        annotationCount: 1,
        annotationInputCount: 1,
        unrenderedAnnotationCount: 0,
        legendItems: 1,
        ariaLabel: "Map description",
        margin: { top: 40, right: 113, bottom: 30, left: 25 }
      })
    }
  )

  it.each([false, true])(
    "only paints cartogram chrome when marks are emitted (suppressed: %s)",
    (suppressed) => {
      const { svg, evidence } = renderChartWithEvidence("DistanceCartogram", {
        points: [
          { id: "London", lon: 0, lat: 51, cost: 0 },
          { id: "Paris", lon: 2, lat: 49, cost: 2 }
        ],
        center: "London",
        costAccessor: "cost",
        costLabel: "hours",
        showRings: [1, 2],
        showNorth: false,
        frameProps: { renderMode: suppressed ? suppressMarks : undefined }
      })
      const document = new DOMParser().parseFromString(svg, "image/svg+xml")
      expect(document.querySelectorAll('circle[fill="none"]')).toHaveLength(
        suppressed ? 0 : 2
      )
      expect(svg.includes("hours")).toBe(!suppressed)
      expect(evidence.markCount).toBe(suppressed ? 0 : 2)
      expect(evidence.empty).toBe(suppressed)
    }
  )
})
