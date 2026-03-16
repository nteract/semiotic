import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { FlowMap } from "./FlowMap"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock StreamGeoFrame to capture props
let lastGeoFrameProps: any = null
vi.mock("../../stream/StreamGeoFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastGeoFrameProps = props
      return <div className="stream-geo-frame"><svg /></div>
    }
  }
})

// Mock useReferenceAreas to return areas directly (skip async loading)
vi.mock("../../geo/useReferenceAreas", () => ({
  useReferenceAreas: (areas: any) => areas
}))

const sampleNodes = [
  { id: "A", lon: -73.7, lat: 40.6 },
  { id: "B", lon: -0.4, lat: 51.5 },
  { id: "C", lon: 139.7, lat: 35.8 },
]

const sampleFlows = [
  { source: "A", target: "B", passengers: 18000 },
  { source: "B", target: "C", passengers: 14000 },
  { source: "A", target: "C", passengers: 9500 },
]

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe("FlowMap", () => {
  beforeEach(() => {
    lastGeoFrameProps = null
  })

  // ── Hooks-before-early-return fix ─────────────────────────────────────

  describe("hooks ordering (no conditional hook errors)", () => {
    it("renders without error when flows is initially empty then populated", () => {
      // This verifies the hooks-before-early-return fix.
      // With the old code, empty flows triggered an early return before hooks,
      // then populating flows called more hooks → "rendered more hooks" error.
      const { rerender, container } = render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={[]} />
        </Wrapper>
      )
      // Empty state should render (no frame)
      expect(container.querySelector(".stream-geo-frame")).toBeFalsy()

      // Re-render with flows — should NOT throw
      rerender(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} valueAccessor="passengers" />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeTruthy()
    })

    it("renders without error when loading transitions to false", () => {
      const { rerender, container } = render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} loading={true} />
        </Wrapper>
      )
      expect(container.querySelector(".semiotic-loading-bar")).toBeTruthy()

      rerender(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} valueAccessor="passengers" loading={false} />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeTruthy()
    })
  })

  // ── Basic prop forwarding ─────────────────────────────────────────────

  describe("prop forwarding", () => {
    it("forwards projection", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} projection="mercator" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projection).toBe("mercator")
    })

    it("defaults projection to equalEarth", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projection).toBe("equalEarth")
    })

    it("forwards areas and areaStyle", () => {
      const areas = [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [] } }]
      const areaStyle = { fill: "#eee", stroke: "#999" }
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} areas={areas as any} areaStyle={areaStyle} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.areas).toBe(areas)
      expect(lastGeoFrameProps.areaStyle).toBe(areaStyle)
    })

    it("forwards size from width and height", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} width={800} height={500} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.size).toEqual([800, 500])
    })

    it("sets enableHover to true", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.enableHover).toBe(true)
    })

    it("forwards title", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} title="Flight Routes" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.title).toBe("Flight Routes")
    })
  })

  // ── Line data resolution ──────────────────────────────────────────────

  describe("line data", () => {
    it("resolves flow coordinates from node lookup", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} valueAccessor="passengers" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lines).toHaveLength(3)
      // Each line should have coordinates array
      for (const line of lastGeoFrameProps.lines) {
        expect(line.coordinates).toHaveLength(2)
        expect(line.coordinates[0]).toHaveProperty("lon")
        expect(line.coordinates[0]).toHaveProperty("lat")
      }
    })

    it("filters out flows with missing nodes", () => {
      const badFlows = [
        ...sampleFlows,
        { source: "A", target: "MISSING", passengers: 100 },
      ]
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={badFlows} valueAccessor="passengers" />
        </Wrapper>
      )
      // Only 3 valid flows should be forwarded
      expect(lastGeoFrameProps.lines).toHaveLength(3)
    })

    it("sets lineDataAccessor to 'coordinates'", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lineDataAccessor).toBe("coordinates")
    })

    it("defaults lineType to 'geo'", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lineType).toBe("geo")
    })

    it("forwards lineType='line' for straight connections", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} lineType="line" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lineType).toBe("line")
    })
  })

  // ── Edge styling ──────────────────────────────────────────────────────

  describe("edge styling", () => {
    it("produces a lineStyle function", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} valueAccessor="passengers" />
        </Wrapper>
      )
      expect(typeof lastGeoFrameProps.lineStyle).toBe("function")
    })

    it("lineStyle uses edgeOpacity", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} valueAccessor="passengers" edgeOpacity={0.3} />
        </Wrapper>
      )
      const style = lastGeoFrameProps.lineStyle(sampleFlows[0])
      expect(style.opacity).toBe(0.3)
    })

    it("lineStyle width scales with value", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} valueAccessor="passengers" />
        </Wrapper>
      )
      const styleHigh = lastGeoFrameProps.lineStyle({ passengers: 18000 })
      const styleLow = lastGeoFrameProps.lineStyle({ passengers: 9500 })
      expect(styleHigh.strokeWidth).toBeGreaterThan(styleLow.strokeWidth)
    })
  })

  // ── Particles ─────────────────────────────────────────────────────────

  describe("particles", () => {
    it("forwards showParticles", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} showParticles />
        </Wrapper>
      )
      expect(lastGeoFrameProps.showParticles).toBe(true)
    })

    it("forwards particleStyle", () => {
      const particleStyle = { radius: 3, color: "source", speedMultiplier: 2 }
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} showParticles particleStyle={particleStyle} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.particleStyle).toEqual(particleStyle)
    })

    it("does not forward showParticles when not set", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.showParticles).toBeUndefined()
    })
  })

  // ── Zoom defaults ─────────────────────────────────────────────────────

  describe("zoom defaults", () => {
    it("defaults zoomable to false without tileURL", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.zoomable).toBeUndefined()
    })

    it("defaults zoomable to true with tileURL", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} tileURL="https://tile/{z}/{x}/{y}.png" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.zoomable).toBe(true)
    })
  })

  // ── Empty/loading states ──────────────────────────────────────────────

  describe("empty and loading states", () => {
    it("renders loading state when loading is true", () => {
      const { container } = render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} loading={true} />
        </Wrapper>
      )
      expect(container.querySelector(".semiotic-loading-bar")).toBeTruthy()
      expect(container.querySelector(".stream-geo-frame")).toBeFalsy()
    })

    it("renders empty state when flows is empty", () => {
      const { container } = render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={[]} />
        </Wrapper>
      )
      expect(container.textContent).toContain("No data available")
    })
  })
})
