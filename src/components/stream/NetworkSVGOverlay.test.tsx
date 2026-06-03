import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"

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
})
