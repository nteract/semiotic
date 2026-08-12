import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GeoScales, StreamGeoFrameProps } from "./geoTypes"
import type { FrameGraphicsContext } from "./types"
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

  it("hydrates scale-aware graphics without changing the server markup", () => {
    const graphics = ({ scales }: FrameGraphicsContext<GeoScales>) => (
      <text data-geo-scale="yes">
        {scales?.projection.scale().toFixed(3) ?? "pending"}
      </text>
    )
    const props: StreamGeoFrameProps = {
      projection: "mercator",
      size: [280, 180],
      points: [{ lon: 0, lat: 0 }],
      xAccessor: "lon",
      yAccessor: "lat",
      accessibleTable: false,
      backgroundGraphics: graphics,
      foregroundGraphics: graphics
    }
    const container = document.createElement("div")
    container.innerHTML = renderToString(<StreamGeoFrame {...props} />)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    let root: ReturnType<typeof hydrateRoot> | null = null

    act(() => {
      root = hydrateRoot(container, <StreamGeoFrame {...props} />)
    })

    expect(errorSpy.mock.calls.filter((call) =>
      /did not match|hydration failed|hydration error/i.test(String(call[0] ?? ""))
    )).toEqual([])
    expect(container.querySelectorAll('[data-geo-scale="yes"]')).toHaveLength(2)
    act(() => root?.unmount())
    errorSpy.mockRestore()
  })
})
