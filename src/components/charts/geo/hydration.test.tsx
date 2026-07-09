/**
 * Phase 3.5 — hydration parity across the geo HOC catalog.
 *
 * The boundary lives in `StreamGeoFrame`. Every geo HOC funnels
 * through it, so this matrix proves the four shipped HOCs all
 * round-trip cleanly through the SSR → hydrate → canvas swap. Geo
 * SVG primitives include projected feature paths (Choropleth), point
 * symbols (ProportionalSymbol), flow arcs / particles (FlowMap), and
 * cartogram offsets (DistanceCartogram) — different from the other
 * three frame families, hence the dedicated test file.
 */
import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"

import { ChoroplethMap } from "./ChoroplethMap"
import { ProportionalSymbolMap } from "./ProportionalSymbolMap"
import { FlowMap } from "./FlowMap"
import { DistanceCartogram } from "./DistanceCartogram"

// Synthetic GeoJSON Feature[] — two simple polygons so the Choropleth
// pipeline has something to project, fit, and color-encode without
// depending on the bundled `world-110m` reference geography (which
// loads async via fetch and would muddle the SSR-pure assertion).
const syntheticAreas = [
  {
    type: "Feature" as const,
    properties: { id: "A", value: 10 },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    },
  },
  {
    type: "Feature" as const,
    properties: { id: "B", value: 25 },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[[15, 0], [25, 0], [25, 10], [15, 10], [15, 0]]],
    },
  },
]

const syntheticPoints = [
  { id: "p1", lon: 5, lat: 5, value: 10 },
  { id: "p2", lon: 20, lat: 5, value: 25 },
  { id: "p3", lon: 12, lat: 8, value: 15 },
]

const syntheticFlows = [
  { source: "p1", target: "p2", value: 8 },
  { source: "p2", target: "p3", value: 5 },
]

interface HydrationCase {
  name: string
  render: () => React.ReactElement
}

const cases: HydrationCase[] = [
  { name: "ChoroplethMap", render: () => (
    <ChoroplethMap
      areas={syntheticAreas}
      valueAccessor={(d: { properties?: { value: number } }) => d.properties?.value ?? 0}
      width={400}
      height={300}
    />
  ) },
  { name: "ProportionalSymbolMap", render: () => (
    <ProportionalSymbolMap
      points={syntheticPoints}
      xAccessor="lon"
      yAccessor="lat"
      sizeBy="value"
      width={400}
      height={300}
    />
  ) },
  { name: "FlowMap", render: () => (
    <FlowMap
      flows={syntheticFlows}
      nodes={syntheticPoints}
      nodeIdAccessor="id"
      valueAccessor="value"
      xAccessor="lon"
      yAccessor="lat"
      width={400}
      height={300}
    />
  ) },
  { name: "DistanceCartogram", render: () => (
    <DistanceCartogram
      points={syntheticPoints}
      center={syntheticPoints[0]!.id}
      xAccessor="lon"
      yAccessor="lat"
      costAccessor="value"
      width={400}
      height={300}
    />
  ) },
]

describe("Geo HOC catalog — hydration parity", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  for (const c of cases) {
    describe(c.name, () => {
      it("renderToString produces SVG markup, no <canvas>", () => {
        const html = renderToString(c.render())
        expect(html).not.toContain("<canvas")
        expect(html).toContain("<svg")
      })

      it("hydrates from server-rendered HTML without React mismatch warnings", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        const html = renderToString(c.render())
        container.innerHTML = html

        const rootBox: { current: ReturnType<typeof hydrateRoot> | null } = { current: null }
        act(() => {
          rootBox.current = hydrateRoot(container, c.render())
        })

        const mismatchWarnings = errorSpy.mock.calls.filter((call) => {
          const msg = String(call[0] ?? "")
          return /did not match|hydration failed|hydration error/i.test(msg)
        })
        expect(mismatchWarnings).toEqual([])

        rootBox.current?.unmount()
        errorSpy.mockRestore()
      })

      it("upgrades to interactive canvas after hydration", () => {
        const html = renderToString(c.render())
        container.innerHTML = html

        const rootBox: { current: ReturnType<typeof hydrateRoot> | null } = { current: null }
        act(() => {
          rootBox.current = hydrateRoot(container, c.render())
        })

        const canvases = container.querySelectorAll("canvas")
        expect(canvases.length).toBeGreaterThanOrEqual(1)

        rootBox.current?.unmount()
      })
    })
  }
})
