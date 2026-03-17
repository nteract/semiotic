import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { ProportionalSymbolMap } from "./ProportionalSymbolMap"
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

// Mock useReferenceAreas to return areas directly
vi.mock("../../geo/useReferenceAreas", () => ({
  useReferenceAreas: (areas: any) => areas
}))

const samplePoints = [
  { id: "London", lon: -0.1, lat: 51.5, population: 9000000, region: "Europe" },
  { id: "Tokyo", lon: 139.69, lat: 35.69, population: 14000000, region: "Asia" },
  { id: "New York", lon: -74.0, lat: 40.71, population: 8300000, region: "Americas" },
  { id: "Sydney", lon: 151.21, lat: -33.87, population: 5300000, region: "Oceania" },
]

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe("ProportionalSymbolMap", () => {
  beforeEach(() => {
    lastGeoFrameProps = null
  })

  // ── Hooks-before-early-return fix ─────────────────────────────────────

  describe("hooks ordering (no conditional hook errors)", () => {
    it("renders without error when loading transitions to false", () => {
      const { rerender, container } = render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" loading={true} />
        </Wrapper>
      )
      expect(container.querySelector(".semiotic-loading-bar")).toBeTruthy()

      rerender(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" loading={false} />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeTruthy()
    })

    it("renders without error when points transitions from empty to populated", () => {
      const { rerender, container } = render(
        <Wrapper>
          <ProportionalSymbolMap points={[]} sizeBy="population" />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeFalsy()

      rerender(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
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
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" projection="mercator" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projection).toBe("mercator")
    })

    it("defaults projection to equalEarth", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projection).toBe("equalEarth")
    })

    it("forwards size from width and height", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" width={800} height={500} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.size).toEqual([800, 500])
    })

    it("forwards title", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" title="Cities" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.title).toBe("Cities")
    })

    it("forwards points data", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.points).toBe(samplePoints)
    })

    it("forwards xAccessor and yAccessor defaults", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.xAccessor).toBe("lon")
      expect(lastGeoFrameProps.yAccessor).toBe("lat")
    })

    it("forwards custom xAccessor and yAccessor", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" xAccessor="longitude" yAccessor="latitude" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.xAccessor).toBe("longitude")
      expect(lastGeoFrameProps.yAccessor).toBe("latitude")
    })
  })

  // ── Point styling and sizing ──────────────────────────────────────────

  describe("point styling", () => {
    it("produces a pointStyle function", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      expect(typeof lastGeoFrameProps.pointStyle).toBe("function")
    })

    it("pointStyle returns sized radius based on sizeBy", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      const styleLarge = lastGeoFrameProps.pointStyle(samplePoints[1]) // Tokyo: 14M
      const styleSmall = lastGeoFrameProps.pointStyle(samplePoints[3]) // Sydney: 5.3M
      expect(styleLarge.r).toBeGreaterThan(styleSmall.r)
    })

    it("pointStyle returns different colors when colorBy is set", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" colorBy="region" />
        </Wrapper>
      )
      const styleEurope = lastGeoFrameProps.pointStyle(samplePoints[0]) // Europe
      const styleAsia = lastGeoFrameProps.pointStyle(samplePoints[1]) // Asia
      expect(typeof styleEurope.fill).toBe("string")
      expect(typeof styleAsia.fill).toBe("string")
      expect(styleEurope.fill).not.toBe(styleAsia.fill)
    })

    it("pointStyle uses default color when no colorBy", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      const style = lastGeoFrameProps.pointStyle(samplePoints[0])
      expect(style.fill).toBe("#007bff")
    })

    it("applies fillOpacity and stroke defaults", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      const style = lastGeoFrameProps.pointStyle(samplePoints[0])
      expect(style.fillOpacity).toBe(0.7)
      expect(style.stroke).toBe("#fff")
    })
  })

  // ── Background areas ──────────────────────────────────────────────────

  describe("background areas", () => {
    it("forwards areas and areaStyle", () => {
      const bgAreas = [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [] } }]
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" areas={bgAreas as any} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.areas).toBe(bgAreas)
      expect(lastGeoFrameProps.areaStyle).toEqual({ fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 })
    })

    it("forwards custom areaStyle", () => {
      const bgAreas = [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [] } }]
      const customStyle = { fill: "#eef", stroke: "#999" }
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" areas={bgAreas as any} areaStyle={customStyle} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.areaStyle).toBe(customStyle)
    })
  })

  // ── Zoom defaults ─────────────────────────────────────────────────────

  describe("zoom defaults", () => {
    it("defaults zoomable to false without tileURL", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.zoomable).toBeUndefined()
    })

    it("defaults zoomable to true with tileURL", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" tileURL="https://tile/{z}/{x}/{y}.png" />
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
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" loading={true} />
        </Wrapper>
      )
      expect(container.querySelector(".semiotic-loading-bar")).toBeTruthy()
      expect(container.querySelector(".stream-geo-frame")).toBeFalsy()
    })

    it("renders empty state when points is empty", () => {
      const { container } = render(
        <Wrapper>
          <ProportionalSymbolMap points={[]} sizeBy="population" />
        </Wrapper>
      )
      expect(container.textContent).toContain("No data available")
    })
  })

  // ── enableHover default ───────────────────────────────────────────────

  describe("enableHover", () => {
    it("sets enableHover to true by default", () => {
      render(
        <Wrapper>
          <ProportionalSymbolMap points={samplePoints} sizeBy="population" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.enableHover).toBe(true)
    })
  })
})
