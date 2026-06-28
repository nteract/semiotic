import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { GeoCustomChart } from "./GeoCustomChart"
import type { GeoCustomLayout } from "../../stream/geoCustomLayout"
import type { StreamGeoFrameProps } from "../../stream/geoTypes"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

let lastGeoFrameProps: StreamGeoFrameProps | null = null
vi.mock("../../stream/StreamGeoFrame", () => ({
  __esModule: true,
  default: React.forwardRef((props: StreamGeoFrameProps, _ref: unknown) => {
    lastGeoFrameProps = props
    return <div className="stream-geo-frame"><canvas /><svg /></div>
  }),
}))

describe("GeoCustomChart", () => {
  let cleanup: () => void

  beforeEach(() => {
    lastGeoFrameProps = null
    cleanup = setupCanvasMock()
  })

  afterEach(() => cleanup())

  const layout: GeoCustomLayout = (ctx) => ({
    nodes: [{
      type: "geoarea",
      pathData: "M0,5L5,0L10,5L5,10Z",
      centroid: [5, 5],
      bounds: [[0, 0], [10, 10]],
      screenArea: 50,
      style: { fill: ctx.resolveColor("tile") },
      datum: ctx.points[0] ?? null,
    }],
  })

  it("forwards the custom layout, projection, and data", () => {
    const points = [{ id: "paris", lon: 2.35, lat: 48.86 }]
    render(
      <TooltipProvider>
        <GeoCustomChart
          points={points}
          layout={layout}
          projection="mercator"
          width={420}
          height={280}
        />
      </TooltipProvider>
    )

    expect(lastGeoFrameProps?.customLayout).toBe(layout)
    expect(lastGeoFrameProps?.projection).toBe("mercator")
    expect(lastGeoFrameProps?.points).toBe(points)
    expect(lastGeoFrameProps?.size).toEqual([420, 280])
  })

  it("forwards layoutConfig and coordinate accessors", () => {
    render(
      <TooltipProvider>
        <GeoCustomChart
          points={[{ longitude: 2.35, latitude: 48.86 }]}
          layout={layout}
          layoutConfig={{ columns: 5 }}
          xAccessor="longitude"
          yAccessor="latitude"
        />
      </TooltipProvider>
    )

    expect(lastGeoFrameProps?.layoutConfig).toEqual({ columns: 5 })
    expect(lastGeoFrameProps?.xAccessor).toBe("longitude")
    expect(lastGeoFrameProps?.yAccessor).toBe("latitude")
  })
})
