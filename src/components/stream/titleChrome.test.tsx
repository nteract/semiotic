import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GeoSVGOverlay } from "./GeoSVGOverlay"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { OrdinalSVGOverlay } from "./OrdinalSVGOverlay"
import { SVGOverlay } from "./SVGOverlay"
import { PhysicsSVGOverlay } from "./physics/PhysicsSVGOverlay"

const dimensions = {
  width: 200,
  height: 120,
  totalWidth: 240,
  totalHeight: 160,
  margin: { top: 36, right: 20, bottom: 20, left: 20 },
}

describe("frame title chrome", () => {
  it("renders ReactNode titles in every core frame overlay", () => {
    const title = <span data-testid="custom-chart-title">Custom title</span>

    const overlays = [
      render(
        <SVGOverlay
          {...dimensions}
          scales={null}
          xValues={[]}
          yValues={[]}
          title={title}
        />,
      ),
      render(
        <OrdinalSVGOverlay
          {...dimensions}
          scales={null}
          title={title}
        />,
      ),
      render(<GeoSVGOverlay {...dimensions} title={title} />),
      render(<NetworkSVGOverlay {...dimensions} labels={[]} title={title} />),
      render(<PhysicsSVGOverlay {...dimensions} title={title} />),
    ]

    for (const { container } of overlays) {
      expect(
        container.querySelector("foreignObject [data-testid='custom-chart-title']"),
      ).not.toBeNull()
      expect(container.querySelector(".semiotic-chart-title")).toBeNull()
    }
  })

  it("uses one themed title contract in every core frame overlay", () => {
    const overlays = [
      render(<SVGOverlay {...dimensions} scales={null} xValues={[]} yValues={[]} title="Shared title" />),
      render(<OrdinalSVGOverlay {...dimensions} scales={null} title="Shared title" />),
      render(<GeoSVGOverlay {...dimensions} title="Shared title" />),
      render(<NetworkSVGOverlay {...dimensions} labels={[]} title="Shared title" />),
      render(<PhysicsSVGOverlay {...dimensions} title="Shared title" />),
    ]

    for (const { container } of overlays) {
      const title = container.querySelector(".semiotic-chart-title")
      expect(title?.getAttribute("y")).toBe("22")
      expect(title?.getAttribute("fill")).toBe("var(--semiotic-text, #333)")
      expect(title?.getAttribute("style")).toContain(
        "font-weight: var(--semiotic-title-font-weight, bold)"
      )
    }
  })
})
