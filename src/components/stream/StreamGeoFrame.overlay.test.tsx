import * as React from "react"
import { renderToString } from "react-dom/server"
import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { StreamGeoFrameProps } from "./geoTypes"
import StreamGeoFrame from "./StreamGeoFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"

const frameProps: StreamGeoFrameProps = {
  projection: "equirectangular",
  size: [280, 180],
  points: [{ id: "alpha", lon: 0, lat: 0 }],
  xAccessor: "lon",
  yAccessor: "lat",
  pointIdAccessor: "id",
  accessibleTable: false,
  title: "Geo chrome",
  foregroundGraphics: (
    <rect
      data-geo-foreground="yes"
      x={4}
      y={5}
      width={6}
      height={7}
    />
  ),
  legend: {
    legendGroups: [
      {
        label: "Status",
        type: "fill",
        styleFn: (item) => ({ fill: item.color }),
        items: [{ label: "Alpha", color: "#4e79a7" }]
      }
    ]
  },
  annotations: [
    {
      type: "text",
      pointId: "alpha",
      label: "Geo point annotation",
      dx: 8,
      dy: -6
    }
  ],
  customLayout: (context) => ({
    nodes: [
      {
        type: "point",
        x: 90,
        y: 65,
        r: 7,
        style: { fill: "#4e79a7" },
        datum: context.points[0]!,
        pointId: "alpha"
      }
    ],
    overlays: (
      <text data-geo-custom-overlay="yes" x={90} y={82}>
        Custom overlay
      </text>
    )
  })
}

describe("StreamGeoFrame GeoSVGOverlay integration", () => {
  let restoreCanvas: (() => void) | null = null

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    restoreCanvas?.()
    restoreCanvas = null
  })

  it("preserves Geo chrome in SSR output", () => {
    const html = renderToString(<StreamGeoFrame {...frameProps} />)

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<title>Geo chrome</title>")
    expect(html).toContain(
      "<desc>Geo chrome (XY data visualization)</desc>"
    )
    expect(html).toContain("Alpha")
    expect(html).toContain("Geo point annotation")
    expect(html).toContain('data-geo-foreground="yes"')
    expect(html).toContain('data-geo-custom-overlay="yes"')
  })

  it("preserves Geo chrome after the client canvas takeover", () => {
    const { container, getByRole } = render(
      <StreamGeoFrame {...frameProps} />
    )

    expect(getByRole("group", { name: "Geo chrome" })).toHaveAttribute(
      "tabindex",
      "0"
    )
    expect(container.querySelector("svg[role='img'] title")?.textContent).toBe(
      "Geo chrome"
    )
    expect(container.querySelector("svg[role='img'] desc")?.textContent).toBe(
      "Geo chrome (XY data visualization)"
    )
    expect(container.textContent).toContain("Alpha")
    expect(container.textContent).toContain("Geo point annotation")
    expect(
      container.querySelector('[data-geo-foreground="yes"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-geo-custom-overlay="yes"]')
    ).not.toBeNull()
  })
})
