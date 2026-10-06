// @vitest-environment node
import * as React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { MotifBraidChart } from "./MotifBraidChart"
import { DependencyForestChart } from "./DependencyForestChart"
import { FlowCircuitChart } from "./FlowCircuitChart"
import { prepareNetworkAtlas } from "./prepare"
import { prepareMotifBraid } from "./braid"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"
import { flowCircuitStory } from "../../../../scripts/network-atlas/stories/flowCircuitStories"
import { readCircuitEdition } from "./flowCircuitTape"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { auditAccessibility } from "../../charts/shared/auditAccessibility"
import { diagnoseConfig } from "../../charts/shared/diagnoseConfig"

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../../scripts/network-atlas/fixtures/checkout-ab-v1.json",
      import.meta.url
    ),
    "utf8"
  )
)
const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
if (!prepared.ok) throw new Error("Invalid fixture")
const firstBraidGroup = prepareMotifBraid(prepared.atlas).groups[0]
const { circuit, observed } = flowCircuitStory("etl")
const circuitProps = {
  circuit,
  edition: observed,
  reading: readCircuitEdition(observed, "observed-snapshot", 60)
}
const common = {
  width: 1280,
  height: 1200,
  title: "Projected atlas",
  description: "A projected view of the same admitted graph.",
  summary: "Counts and identities are unchanged.",
  accessibleTable: true
}

describe("atlas perspective readers", () => {
  it.each(["flat", "isometric"] as const)(
    "preserves body-anchored Flow Circuit annotations in the %s view",
    (perspective) => {
      const bodyId = circuit.modules[0].nodeId
      for (const type of ["text", "label", "widget"]) {
        const annotation = Object.freeze({
          type,
          bodyId,
          label: "QueueAnnotation",
          ...(type === "widget" && { content: <span>QueueAnnotation</span> }),
          dx: 12,
          dy: -12
        })
        const props = { ...circuitProps, ...common, perspective }
        const expectedAnnotations = [{ ...annotation, pointId: bodyId }]
        const expected = renderChartWithEvidence("FlowCircuitChart", {
          ...props,
          annotations: expectedAnnotations
        })
        const expectedHtml = renderToStaticMarkup(
          <FlowCircuitChart {...props} annotations={expectedAnnotations} />
        )
        expect(expected.svg).toContain("QueueAnnotation")
        expect(expectedHtml).toContain("QueueAnnotation")
        for (const annotations of [
          [annotation],
          [{ ...annotation, bodyId: "missing-body", pointId: bodyId }]
        ]) {
          const actual = renderChartWithEvidence("FlowCircuitChart", {
            ...props,
            annotations
          })
          expect(actual.evidence.annotationCount).toBe(1)
          expect(actual.evidence.unrenderedAnnotationCount).toBe(0)
          expect(actual.svg).toBe(expected.svg)
          expect(
            renderToStaticMarkup(
              <FlowCircuitChart {...props} annotations={annotations} />
            )
          ).toBe(expectedHtml)
        }
        expect(annotation).not.toHaveProperty("pointId")
      }
    }
  )

  it.each([
    ["MotifBraidChart", { atlas: prepared.atlas }, MotifBraidChart],
    [
      "DependencyForestChart",
      { forest: supplierStory().projection },
      DependencyForestChart
    ],
    ["FlowCircuitChart", circuitProps, FlowCircuitChart]
  ] as const)(
    "projects %s in React and static SVG with semantic evidence",
    (name, data, Component) => {
      const props = { ...data, ...common, perspective: "isometric" as const }
      const pointId =
        name === "MotifBraidChart"
          ? `vertex:${firstBraidGroup.partition ?? "all"}:${firstBraidGroup.signature.split(">")[0]}`
          : name === "DependencyForestChart"
            ? "X"
            : circuit.modules[0].nodeId
      const overridden = {
        ...props,
        annotations: [{ type: "text", pointId, label: "TopLevelNote" }],
        [name === "FlowCircuitChart" ? "networkFrameProps" : "frameProps"]: {
          annotations: [{ type: "text", pointId, label: "FrameNote" }]
        }
      }
      for (const markup of [
        renderChartWithEvidence(name, overridden).svg,
        renderToStaticMarkup(
          React.createElement(
            Component as React.ComponentType<typeof overridden>,
            overridden
          )
        )
      ]) {
        expect(markup).toContain("FrameNote")
        expect(markup).not.toContain("TopLevelNote")
      }
      const projected = renderChartWithEvidence(name, props)
      const flat = renderChartWithEvidence(name, {
        ...props,
        perspective: "flat"
      })
      expect(projected.svg).toContain('data-perspective-part="edge-shadow"')
      if (name === "FlowCircuitChart")
        expect(projected.svg).toContain('data-perspective-part="slab-top"')
      expect(projected.svg).not.toBe(flat.svg)
      if (name === "FlowCircuitChart") {
        const background = renderChartWithEvidence(name, {
          ...props,
          frameProps: { background: "#dbf7e0" }
        })
        expect(background.svg).toContain('fill="#dbf7e0"')
        expect(projected.evidence.edgeCount).toBe(
          circuit.atlas.source.edges.length
        )
        const camera = renderChartWithEvidence(name, {
          ...props,
          networkFrameProps: { viewTransform: { x: 7, y: 11, k: 1.2 } }
        })
        expect(camera.svg).toContain("translate(7,11) scale(1.2)")
      }
      expect(projected.evidence.frameType).toBe("network")
      expect(projected.evidence.nodeCount).toBeGreaterThan(0)
      expect(projected.svg).toContain("Projected atlas")
      expect(
        auditAccessibility(name, props).findings.filter(
          (f) => f.status === "fail"
        )
      ).toEqual([])
      expect(
        diagnoseConfig(name, props).diagnoses.filter(
          (w) => w.code === "UNKNOWN_PROP"
        )
      ).toEqual([])
      const html = renderToStaticMarkup(
        React.createElement(
          Component as React.ComponentType<typeof props>,
          props
        )
      )
      expect(html).toContain('data-perspective-part="edge-shadow"')
      expect(html).toContain("Projected atlas")
      expect(renderChartWithEvidence(name, props).svg).toBe(projected.svg)
    }
  )
})
