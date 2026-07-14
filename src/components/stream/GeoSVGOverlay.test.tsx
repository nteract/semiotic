import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  fireEvent,
  render
} from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import type { LegendGroup } from "../types/legendTypes"
import { GeoSVGOverlay } from "./GeoSVGOverlay"
import { SVGOverlay } from "./SVGOverlay"

const margin = { top: 18, right: 26, bottom: 22, left: 30 }
const pointNodes = [{ pointId: "alpha", x: 184, y: 58, r: 6 }]
const annotations: Datum[] = [
  {
    type: "text",
    pointId: "alpha",
    label: "Pinned annotation",
    dx: 14,
    dy: -8
  }
]
const legendGroups: LegendGroup[] = [
  {
    label: "Status",
    type: "fill",
    styleFn: (item) => ({ fill: item.color }),
    items: [
      { label: "Alpha", color: "#4e79a7" },
      { label: "Beta", color: "#f28e2b" }
    ]
  }
]

const sharedProps = {
  width: 220,
  height: 120,
  totalWidth: 276,
  totalHeight: 160,
  margin,
  showAxes: false,
  title: "Geo overlay",
  legend: { legendGroups },
  legendPosition: "bottom" as const,
  legendLayout: { align: "center" as const, swatchSize: 11, itemGap: 9 },
  legendHighlightedCategory: "Alpha",
  legendIsolatedCategories: new Set(["Alpha"]),
  foregroundGraphics: (
    <g data-testid="foreground-overlay">
      <circle cx={12} cy={16} r={4} fill="purple" />
    </g>
  ),
  annotations,
  autoPlaceAnnotations: true,
  pointNodes
}

function legacyOverlay() {
  return (
    <SVGOverlay
      {...sharedProps}
      scales={null}
      xValues={[]}
      yValues={[]}
    />
  )
}

function geoOverlay() {
  return <GeoSVGOverlay {...sharedProps} />
}

describe("GeoSVGOverlay parity", () => {
  it("matches the prior Geo subset of SVGOverlay in SSR markup", () => {
    expect(renderToStaticMarkup(geoOverlay())).toBe(
      renderToStaticMarkup(legacyOverlay())
    )
  })

  it("matches the prior Geo subset of SVGOverlay in CSR markup", () => {
    const legacy = render(legacyOverlay())
    const geo = render(geoOverlay())

    expect(geo.container.innerHTML).toBe(legacy.container.innerHTML)
    expect(geo.container.textContent).toContain("Pinned annotation")
    expect(
      geo.container.querySelector('[data-testid="foreground-overlay"]')
    ).not.toBeNull()
  })

  it("preserves empty and showAxes-only overlay behavior", () => {
    const dimensions = {
      width: 220,
      height: 120,
      totalWidth: 276,
      totalHeight: 160,
      margin
    }
    const legacyEmpty = renderToStaticMarkup(
      <SVGOverlay
        {...dimensions}
        scales={null}
        showAxes={false}
        xValues={[]}
        yValues={[]}
      />
    )
    const geoEmpty = renderToStaticMarkup(
      <GeoSVGOverlay {...dimensions} showAxes={false} />
    )
    expect(geoEmpty).toBe(legacyEmpty)
    expect(geoEmpty).toBe("")

    const legacyShell = renderToStaticMarkup(
      <SVGOverlay
        {...dimensions}
        scales={null}
        showAxes
        xValues={[]}
        yValues={[]}
      />
    )
    const geoShell = renderToStaticMarkup(
      <GeoSVGOverlay {...dimensions} showAxes />
    )
    expect(geoShell).toBe(legacyShell)
    expect(geoShell).toContain("<title>XY Chart</title>")
    expect(geoShell).toContain("<desc>XY data visualization</desc>")
  })

  it("keeps legend hover and click behavior", () => {
    const legendHoverBehavior = vi.fn()
    const legendClickBehavior = vi.fn()
    const { container } = render(
      <GeoSVGOverlay
        {...sharedProps}
        legendHoverBehavior={legendHoverBehavior}
        legendClickBehavior={legendClickBehavior}
      />
    )
    const alpha = container.querySelector('[aria-label="Alpha"]')
    expect(alpha).not.toBeNull()

    fireEvent.mouseEnter(alpha!)
    expect(legendHoverBehavior).toHaveBeenLastCalledWith(
      expect.objectContaining({ label: "Alpha" })
    )

    fireEvent.click(alpha!)
    expect(legendClickBehavior).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Alpha" })
    )

    fireEvent.mouseLeave(alpha!)
    expect(legendHoverBehavior).toHaveBeenLastCalledWith(null)
  })
})
