import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  fireEvent,
  render
} from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import type { LegendGroup } from "../types/legendTypes"
import type { AnnotationContext } from "../realtime/types"
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
  it("keeps Geo chrome, annotations, and legend while using geographic accessible text", () => {
    const geo = renderToStaticMarkup(geoOverlay())
    const legacy = renderToStaticMarkup(legacyOverlay())
    expect(geo).toContain(">Geo overlay</title>")
    expect(geo).toContain(">Geo overlay (geographic data visualization)</desc>")
    expect(legacy).toContain(">Geo overlay (XY data visualization)</desc>")
    expect(geo).toContain("Pinned annotation")
    expect(geo).toContain("data-testid=\"foreground-overlay\"")
    expect(geo).toContain("Alpha")
  })

  it("matches the prior Geo subset of SVGOverlay in CSR markup", () => {
    const legacy = render(legacyOverlay())
    const geo = render(geoOverlay())

    expect(geo.container.querySelector("svg[role='img'] title")?.textContent).toBe(
      "Geo overlay"
    )
    expect(geo.container.querySelector("svg[role='img'] desc")?.textContent).toBe(
      "Geo overlay (geographic data visualization)"
    )
    expect(legacy.container.querySelector("svg[role='img'] desc")?.textContent).toBe(
      "Geo overlay (XY data visualization)"
    )
    expect(geo.container.textContent).toContain("Pinned annotation")
    expect(
      geo.container.querySelector('[data-testid="foreground-overlay"]')
    ).not.toBeNull()
  })

  it("uses the chart title typography variables", () => {
    const { container } = render(geoOverlay())
    const title = container.querySelector(".semiotic-chart-title")
    expect(title?.getAttribute("style")).toContain("--semiotic-title-font-family")
    expect(title?.getAttribute("style")).toContain("--semiotic-title-font-weight")
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
    expect(geoShell).toContain(">Geographic chart</title>")
    expect(geoShell).toContain(">geographic data visualization</desc>")
    expect(legacyShell).toContain(">XY Chart</title>")
    expect(legacyShell).toContain(">XY data visualization</desc>")
  })

  it("uses description for <desc> instead of the title suffix", () => {
    const svg = renderToStaticMarkup(
      <GeoSVGOverlay
        width={220}
        height={120}
        totalWidth={276}
        totalHeight={160}
        margin={margin}
        title="Rainfall"
        description="Monthly precipitation by station."
      />
    )
    expect(svg).toContain(">Rainfall</title>")
    expect(svg).toContain(">Monthly precipitation by station.</desc>")
    expect(svg).not.toContain("XY data visualization")
  })

  it("scopes title and desc ids to idPrefix", () => {
    const svg = renderToStaticMarkup(
      <GeoSVGOverlay
        width={220}
        height={120}
        totalWidth={276}
        totalHeight={160}
        margin={margin}
        idPrefix="map-a"
        title="Rainfall"
        description="Monthly precipitation by station."
      />
    )
    expect(svg).toContain('id="map-a-semiotic-title"')
    expect(svg).toContain('id="map-a-semiotic-desc"')
    expect(svg).toContain('aria-labelledby="map-a-semiotic-title map-a-semiotic-desc"')
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

  it("projects geographic-coordinate annotations before applying callout rules", () => {
    const { container } = render(
      <GeoSVGOverlay
        width={220}
        height={120}
        totalWidth={276}
        totalHeight={160}
        margin={margin}
        annotations={[{ type: "callout", coordinates: [20, 55], label: "Projected" }]}
        geoProjection={(lon, lat) => [lon * 2, lat]}
      />
    )

    expect(container.textContent).toContain("Projected")
  })

  it("runs custom svgAnnotationRules after projecting coordinates", () => {
    const rule = vi.fn((
      ann: Datum,
      _i: number,
      context: AnnotationContext,
    ) => {
      if (ann.type !== "geo-pin") return null
      // After projection, x/y are pixels and scales are identity — use both
      // channels so the test documents the real GeoSVGOverlay contract.
      const cx = context.scales?.x?.(ann.x)
      const cy = context.scales?.y?.(ann.y)
      if (cx == null || cy == null || Number.isNaN(cx) || Number.isNaN(cy)) return null
      return (
        <g key="geo-pin" className="geo-custom-pin" data-testid="geo-custom-pin">
          <circle cx={cx} cy={cy} r={7} fill="#DB2777" />
        </g>
      )
    })

    const { container } = render(
      <GeoSVGOverlay
        width={220}
        height={120}
        totalWidth={276}
        totalHeight={160}
        margin={margin}
        annotations={[{ type: "geo-pin", coordinates: [20, 55], label: "Pin" }]}
        geoProjection={(lon, lat) => [lon * 2, lat]}
        svgAnnotationRules={rule}
      />
    )

    expect(rule).toHaveBeenCalled()
    // Projected: lon 20 → x 40, lat 55 → y 55
    const calledAnn = rule.mock.calls[0][0] as Datum
    expect(calledAnn.x).toBe(40)
    expect(calledAnn.y).toBe(55)
    const pin = container.querySelector('[data-testid="geo-custom-pin"] circle')
    expect(pin).not.toBeNull()
    expect(pin?.getAttribute("cx")).toBe("40")
    expect(pin?.getAttribute("cy")).toBe("55")
    expect(pin?.getAttribute("fill")).toBe("#DB2777")
  })
})
