import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { NetworkSVGOverlay, nodeCenter } from "./NetworkSVGOverlay"
import { glyphHitGeometry } from "./glyphDef"
import { symbolRadius } from "./symbolPath"

describe("nodeCenter — glyph anchoring", () => {
  const glyph = {
    viewBox: [40, 40] as [number, number],
    anchor: [0.5, 1] as [number, number], // feet-anchored → center offset from cy
    parts: [{ d: "M0 0 H40 V40 H0 Z" }],
  }

  it("uses the glyph's drawn-bounds center and hit radius, not symbolRadius(size)", () => {
    const center = nodeCenter({ type: "glyph", cx: 100, cy: 200, size: 30, glyph, datum: { id: "g1" } })
    const geometry = glyphHitGeometry(glyph, 30)
    expect(center).not.toBeNull()
    expect(center!.x).toBe(100 + geometry.centerDx)
    expect(center!.y).toBe(200 + geometry.centerDy)
    expect(center!.r).toBe(Math.max(1, geometry.radius))
    // The old code treated size as a d3-symbol area — this must NOT match.
    expect(center!.r).not.toBe(Math.max(1, symbolRadius(30)))
  })

  it("returns null when a glyph node lacks a resolvable center", () => {
    expect(nodeCenter({ type: "glyph", size: 30, glyph, datum: null })).toBeNull()
  })
})

describe("NetworkSVGOverlay", () => {
  it("auto-places annotations before custom svgAnnotationRules run", () => {
    const { container } = render(
      <NetworkSVGOverlay
        width={200}
        height={120}
        totalWidth={240}
        totalHeight={160}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        labels={[]}
        sceneNodes={[
          { type: "node", id: "node-a", cx: 192, cy: 60, w: 12, h: 12, datum: { id: "node-a" } },
        ]}
        annotations={[{ type: "label", nodeId: "node-a", label: "Edge label needs room" }]}
        autoPlaceAnnotations
        svgAnnotationRules={(annotation) => (
          <g
            data-testid="network-laid-out-ann"
            data-dx={String(annotation.dx)}
            data-dy={String(annotation.dy)}
          />
        )}
      />
    )

    const node = container.querySelector('[data-testid="network-laid-out-ann"]')
    expect(node).not.toBeNull()
    expect(Number(node!.getAttribute("data-dx"))).toBeLessThan(0)
  })

  it("renders a pointId-anchored annotation via the default network rules (no svgAnnotationRules)", () => {
    // Regression: NetworkSVGOverlay previously rendered nothing unless a custom
    // svgAnnotationRules was supplied, so the documented pointId anchoring on
    // network (incl. custom) charts silently failed. It now builds the default
    // "network" rules like the XY/ordinal overlays do.
    const { container, getByText } = render(
      <NetworkSVGOverlay
        width={200}
        height={120}
        totalWidth={240}
        totalHeight={160}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        labels={[]}
        sceneNodes={[
          { type: "circle", id: "perfecta", cx: 100, cy: 60, r: 10, datum: { id: "perfecta" } },
        ]}
        annotations={[
          { type: "callout", pointId: "perfecta", label: "Healthful sign", dx: 20, dy: -18 },
        ]}
      />
    )
    expect(getByText("Healthful sign")).toBeTruthy()
    // The note resolved to the node center rather than the origin.
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("hides density-deferred HTML widgets with the shared disclosure CSS", () => {
    const { container } = render(
      <NetworkSVGOverlay
        width={200}
        height={120}
        totalWidth={240}
        totalHeight={160}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        labels={[]}
        sceneNodes={[
          { type: "node", id: "node-a", cx: 60, cy: 60, datum: { id: "node-a" } },
          { type: "node", id: "node-b", cx: 140, cy: 60, datum: { id: "node-b" } },
        ]}
        annotations={[
          { type: "widget", nodeId: "node-a", emphasis: "primary", content: "Keep" },
          { type: "widget", nodeId: "node-b", emphasis: "secondary", content: "Reveal" },
        ]}
        autoPlaceAnnotations={{
          responsive: { minWidth: 240 },
          progressiveDisclosure: true,
        }}
      />
    )

    const deferred = container.querySelector(".annotation-deferred")
    expect(deferred).not.toBeNull()
    expect(deferred?.getAttribute("data-annotation-disclosure")).toBe("deferred")
    expect((deferred as HTMLElement | null)?.style.pointerEvents).toBe("")
    const css = container.querySelector("style")?.textContent ?? ""
    expect(css).toContain(".stream-network-frame")
    expect(css).toContain("pointer-events:none")
    expect(css).toContain("pointer-events:auto")
  })
})
