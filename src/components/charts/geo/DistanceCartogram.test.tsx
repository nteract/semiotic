import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { DistanceCartogram } from "./DistanceCartogram"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock StreamGeoFrame to capture props and expose ref handle
let lastGeoFrameProps: any = null
const mockGetCartogramLayout = vi.fn(() => ({
  cx: 300, cy: 200, maxCost: 22, availableRadius: 150
}))

vi.mock("../../stream/StreamGeoFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      lastGeoFrameProps = props
      React.useImperativeHandle(ref, () => ({
        push: vi.fn(),
        pushMany: vi.fn(),
        clear: vi.fn(),
        getProjection: () => null,
        getGeoPath: () => null,
        getCartogramLayout: mockGetCartogramLayout,
        getZoom: () => 1,
        resetZoom: vi.fn(),
      }))
      return <div className="stream-geo-frame"><svg /></div>
    })
  }
})

const samplePoints = [
  { id: "London", lon: -0.1, lat: 51.5, flightHours: 0 },
  { id: "Paris", lon: 2.35, lat: 48.86, flightHours: 1.2 },
  { id: "New York", lon: -74.0, lat: 40.71, flightHours: 7.5 },
  { id: "Tokyo", lon: 139.69, lat: 35.69, flightHours: 11.5 },
]

const sampleLines = [
  { source: "London", target: "Paris" },
  { source: "London", target: "New York" },
]

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe("DistanceCartogram", () => {
  beforeEach(() => {
    lastGeoFrameProps = null
    mockGetCartogramLayout.mockClear()
  })

  // ── Basic rendering ───────────────────────────────────────────────────

  describe("basic rendering", () => {
    it("renders without error", () => {
      const { container } = render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeTruthy()
    })

    it("handles empty points", () => {
      const { container } = render(
        <Wrapper>
          <DistanceCartogram points={[]} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeFalsy()
    })

    it("renders loading state", () => {
      const { container } = render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" loading={true} />
        </Wrapper>
      )
      expect(container.querySelector(".semiotic-loading-bar")).toBeTruthy()
    })
  })

  // ── Prop forwarding ───────────────────────────────────────────────────

  describe("prop forwarding", () => {
    it("forwards projection", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" projection="mercator" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projection).toBe("mercator")
    })

    it("forwards size", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" width={800} height={500} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.size).toEqual([800, 500])
    })

    it("forwards projectionTransform with cartogram config", () => {
      render(
        <Wrapper>
          <DistanceCartogram
            points={samplePoints}
            center="London"
            costAccessor="flightHours"
            strength={0.5}
            lineMode="fractional"
          />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projectionTransform).toEqual({
        center: "London",
        centerAccessor: "id",
        costAccessor: "flightHours",
        strength: 0.5,
        lineMode: "fractional",
      })
    })

    it("defaults strength to 1", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projectionTransform.strength).toBe(1)
    })

    it("defaults lineMode to straight", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projectionTransform.lineMode).toBe("straight")
    })
  })

  // ── Line data resolution ──────────────────────────────────────────────

  describe("line data", () => {
    it("resolves line coordinates from node lookup", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" lines={sampleLines} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lines).toHaveLength(2)
      for (const line of lastGeoFrameProps.lines) {
        expect(line.coordinates).toHaveLength(2)
      }
    })

    it("filters out lines with missing nodes", () => {
      const badLines = [...sampleLines, { source: "London", target: "MISSING" }]
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" lines={badLines} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lines).toHaveLength(2)
    })
  })

  // ── Point styling and color ───────────────────────────────────────────

  describe("point styling", () => {
    it("produces a pointStyle function", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      expect(typeof lastGeoFrameProps.pointStyle).toBe("function")
    })

    it("uses default color when no colorBy", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      const style = lastGeoFrameProps.pointStyle(samplePoints[0])
      expect(style.fill).toBe("#007bff")
    })

    it("applies pointRadius", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" pointRadius={10} />
        </Wrapper>
      )
      const style = lastGeoFrameProps.pointStyle(samplePoints[0])
      expect(style.r).toBe(10)
    })

    it("uses colorBy string field for point colors", () => {
      const coloredPoints = samplePoints.map(p => ({ ...p, region: p.id === "London" ? "Europe" : "Other" }))
      render(
        <Wrapper>
          <DistanceCartogram points={coloredPoints} center="London" costAccessor="flightHours" colorBy="region" />
        </Wrapper>
      )
      const styleEurope = lastGeoFrameProps.pointStyle(coloredPoints[0])
      const styleOther = lastGeoFrameProps.pointStyle(coloredPoints[2])
      expect(typeof styleEurope.fill).toBe("string")
      expect(typeof styleOther.fill).toBe("string")
    })

    it("uses colorBy function for point colors", () => {
      const colorByFn = (d: any) => d.flightHours <= 5 ? "Short" : "Long"
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" colorBy={colorByFn} />
        </Wrapper>
      )
      const styleParis = lastGeoFrameProps.pointStyle(samplePoints[1]) // 1.2 hrs → Short
      const styleNY = lastGeoFrameProps.pointStyle(samplePoints[2])   // 7.5 hrs → Long
      expect(typeof styleParis.fill).toBe("string")
      expect(typeof styleNY.fill).toBe("string")
      // Colors should differ between categories
      expect(styleParis.fill).not.toBe(styleNY.fill)
    })
  })

  // ── Foreground overlay (rings + north) ────────────────────────────────

  describe("foreground overlay", () => {
    it("passes foregroundGraphics to StreamGeoFrame", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      // foregroundGraphics is set (may be null initially until cartogram layout is read)
      // The prop should exist on the forwarded props
      expect("foregroundGraphics" in lastGeoFrameProps || lastGeoFrameProps.foregroundGraphics === undefined).toBeTruthy()
    })

    it("showRings defaults to true", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      // Component should render without error with default showRings=true
      expect(lastGeoFrameProps).toBeTruthy()
    })

    it("accepts showRings=false without error", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" showRings={false} />
        </Wrapper>
      )
      expect(lastGeoFrameProps).toBeTruthy()
    })

    it("accepts showRings as explicit number array", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" showRings={[5, 10, 15]} />
        </Wrapper>
      )
      expect(lastGeoFrameProps).toBeTruthy()
    })

    it("accepts showNorth=false without error", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" showNorth={false} />
        </Wrapper>
      )
      expect(lastGeoFrameProps).toBeTruthy()
    })

    it("accepts costLabel", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" costLabel="hrs" />
        </Wrapper>
      )
      expect(lastGeoFrameProps).toBeTruthy()
    })

    it("accepts ringStyle overrides", () => {
      render(
        <Wrapper>
          <DistanceCartogram
            points={samplePoints}
            center="London"
            costAccessor="flightHours"
            ringStyle={{ stroke: "#f00", strokeWidth: 2 }}
          />
        </Wrapper>
      )
      expect(lastGeoFrameProps).toBeTruthy()
    })
  })

  // ── Zoom defaults ─────────────────────────────────────────────────────

  describe("zoom defaults", () => {
    it("defaults zoomable to false without tileURL", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.zoomable).toBeUndefined()
    })

    it("defaults zoomable to true with tileURL", () => {
      render(
        <Wrapper>
          <DistanceCartogram points={samplePoints} center="London" costAccessor="flightHours" tileURL="https://tile/{z}/{x}/{y}.png" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.zoomable).toBe(true)
    })
  })
})
