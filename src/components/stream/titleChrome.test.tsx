import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GeoSVGOverlay } from "./GeoSVGOverlay"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { OrdinalSVGOverlay } from "./OrdinalSVGOverlay"
import { SVGOverlay } from "./SVGOverlay"

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
    ]

    for (const { container } of overlays) {
      expect(
        container.querySelector("foreignObject [data-testid='custom-chart-title']"),
      ).not.toBeNull()
      expect(container.querySelector(".semiotic-chart-title")).toBeNull()
    }
  })
})
