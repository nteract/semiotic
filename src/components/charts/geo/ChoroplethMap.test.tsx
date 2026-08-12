import type { CapturedGeoFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamGeoFrameHandle } from "../../stream/geoTypes"
import { vi } from "vitest"
import React from "react"
import { act, render } from "@testing-library/react"
import { ChoroplethMap } from "./ChoroplethMap"
import { TooltipProvider } from "../../store/TooltipStore"
import type { Datum } from "../shared/datumTypes"
import type { AreasProp } from "../../geo/useReferenceAreas"

// Mock StreamGeoFrame to capture props
let lastGeoFrameProps = {} as CapturedGeoFrameProps
vi.mock("../../stream/StreamGeoFrame", () => ({
  __esModule: true,
  default: React.forwardRef<Partial<StreamGeoFrameHandle>, CapturedGeoFrameProps>((props, _ref) => {
    lastGeoFrameProps = props
    return <div className="stream-geo-frame"><svg /></div>
  })
}))

// Mock useReferenceAreas — simulate async load by returning null then areas
let mockResolvedAreas: AreasProp | null = null
vi.mock("../../geo/useReferenceAreas", () => ({
  useReferenceAreas: () => mockResolvedAreas
}))

const sampleAreas: AreasProp = [
  { type: "Feature", properties: { name: "CountryA", gdp: 100 }, geometry: { type: "Polygon", coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } },
  { type: "Feature", properties: { name: "CountryB", gdp: 200 }, geometry: { type: "Polygon", coordinates: [[[2,0],[3,0],[3,1],[2,1],[2,0]]] } },
  { type: "Feature", properties: { name: "CountryC", gdp: 50 }, geometry: { type: "Polygon", coordinates: [[[4,0],[5,0],[5,1],[4,1],[4,0]]] } },
]

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

describe("ChoroplethMap", () => {
  beforeEach(() => {
    lastGeoFrameProps = {} as CapturedGeoFrameProps
    mockResolvedAreas = sampleAreas
  })

  // ── Hooks-before-early-return fix ─────────────────────────────────────

  describe("hooks ordering (no conditional hook errors)", () => {
    it("renders without error when areas loads asynchronously (null → data)", () => {
      // Simulate async load: first render has null areas, second has data
      mockResolvedAreas = null

      const { rerender, container } = render(
        <Wrapper>
          <ChoroplethMap areas="world-110m" valueAccessor="gdp" />
        </Wrapper>
      )
      // Should show loading state, not crash
      expect(container.querySelector(".stream-geo-frame")).toBeFalsy()

      // Now areas resolve
      mockResolvedAreas = sampleAreas
      rerender(
        <Wrapper>
          <ChoroplethMap areas="world-110m" valueAccessor="gdp" />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeTruthy()
    })

    it("renders without error when loading transitions to false", () => {
      const { rerender, container } = render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" loading={true} />
        </Wrapper>
      )
      expect(container.querySelector(".semiotic-loading-bar")).toBeTruthy()

      rerender(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" loading={false} />
        </Wrapper>
      )
      expect(container.querySelector(".stream-geo-frame")).toBeTruthy()
    })
  })

  // ── areaOpacity prop ──────────────────────────────────────────────────

  describe("areaOpacity", () => {
    it("defaults fillOpacity to 1", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" />
        </Wrapper>
      )
      const styleFn = lastGeoFrameProps.areaStyle
      expect(typeof styleFn).toBe("function")
      const style = styleFn(sampleAreas[0])
      expect(style.fillOpacity).toBe(1)
    })

    it("applies custom areaOpacity to fillOpacity", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" areaOpacity={0.55} />
        </Wrapper>
      )
      const style = lastGeoFrameProps.areaStyle(sampleAreas[0])
      expect(style.fillOpacity).toBe(0.55)
    })
  })

  // ── Basic prop forwarding ─────────────────────────────────────────────

  describe("prop forwarding", () => {
    it("forwards projection", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" projection="mercator" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projection).toBe("mercator")
    })

    it("defaults projection to equalEarth", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.projection).toBe("equalEarth")
    })

    it("forwards size from width and height", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" width={800} height={500} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.size).toEqual([800, 500])
    })

    it("uses compact margins in sparkline mode", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" mode="sparkline" width={118} height={36} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.margin).toEqual({ top: 2, bottom: 2, left: 0, right: 0 })
      expect(lastGeoFrameProps.enableHover).toBe(false)
    })

    it("forwards title", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" title="GDP Map" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.title).toBe("GDP Map")
    })

    it("forwards responsive dimensions", () => {
      render(
        <Wrapper>
          <ChoroplethMap
            areas={sampleAreas}
            valueAccessor="gdp"
            responsiveWidth
            responsiveHeight
          />
        </Wrapper>
      )
      expect(lastGeoFrameProps.responsiveWidth).toBe(true)
      expect(lastGeoFrameProps.responsiveHeight).toBe(true)
    })
  })

  // ── Color encoding ────────────────────────────────────────────────────

  describe("color encoding", () => {
    it("areaStyle returns fill color based on value", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" />
        </Wrapper>
      )
      const styleA = lastGeoFrameProps.areaStyle(sampleAreas[0]) // gdp: 100
      const styleB = lastGeoFrameProps.areaStyle(sampleAreas[1]) // gdp: 200
      // Different values should produce different fills
      expect(styleA.fill).not.toBe(styleB.fill)
      expect(typeof styleA.fill).toBe("string")
    })

    it("returns #ccc fill for features with null value", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" />
        </Wrapper>
      )
      const nullFeature = { type: "Feature", properties: { name: "NoData" }, geometry: {} }
      const style = lastGeoFrameProps.areaStyle(nullFeature)
      expect(style.fill).toBe("#ccc")
    })

    it("supports function valueAccessor", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor={(d: Datum) => d.properties.gdp * 2} />
        </Wrapper>
      )
      const style = lastGeoFrameProps.areaStyle(sampleAreas[0])
      expect(typeof style.fill).toBe("string")
      expect(style.fill).not.toBe("#ccc")
    })

    it("builds a matching continuous legend by default", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" />
        </Wrapper>
      )
      const legend = lastGeoFrameProps.legend as unknown as {
        gradient: { domain: [number, number]; label: string; colorFn: (v: number) => string }
      }
      expect(legend.gradient.domain).toEqual([50, 200])
      expect(legend.gradient.label).toBe("gdp")
      expect(legend.gradient.colorFn(50)).toBe(lastGeoFrameProps.areaStyle(sampleAreas[2]).fill)
    })

    it.each([
      ["right", "right", 110],
      ["left", "left", 110],
      ["top", "top", 56],
      ["bottom", "bottom", 80],
    ] as const)(
      "reserves a labeled gradient legend at %s",
      (legendPosition, marginSide, expectedMargin) => {
        render(
          <Wrapper>
            <ChoroplethMap
              areas={sampleAreas}
              valueAccessor="gdp"
              legendPosition={legendPosition}
            />
          </Wrapper>
        )

        expect(lastGeoFrameProps.legendPosition).toBe(legendPosition)
        expect(lastGeoFrameProps.margin[marginSide]).toBe(expectedMargin)
      }
    )

    it.each(["right", "left", "top", "bottom"] as const)(
      "preserves an explicitly owned %s gradient-legend margin",
      (legendPosition) => {
        render(
          <Wrapper>
            <ChoroplethMap
              areas={sampleAreas}
              valueAccessor="gdp"
              legendPosition={legendPosition}
              margin={{ [legendPosition]: 19 }}
            />
          </Wrapper>
        )

        expect(lastGeoFrameProps.margin[legendPosition]).toBe(19)
      }
    )

    it("uses gradient legend isolation to dim values outside the selected range", () => {
      render(
        <Wrapper>
          <ChoroplethMap
            areas={sampleAreas}
            valueAccessor="gdp"
            legendInteraction="isolate"
          />
        </Wrapper>
      )
      act(() => {
        lastGeoFrameProps.legendClickBehavior({
          label: "50 – 100",
          valueRange: [50, 100],
        })
      })
      expect(lastGeoFrameProps.areaStyle(sampleAreas[0]).opacity).toBeUndefined()
      expect(lastGeoFrameProps.areaStyle(sampleAreas[1]).opacity).toBeLessThan(1)
    })
  })

  // ── Zoom defaults ─────────────────────────────────────────────────────

  describe("zoom defaults", () => {
    it("defaults zoomable to false without tileURL", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.zoomable).toBeUndefined()
    })

    it("defaults zoomable to true with tileURL", () => {
      render(
        <Wrapper>
          <ChoroplethMap areas={sampleAreas} valueAccessor="gdp" tileURL="https://tile/{z}/{x}/{y}.png" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.zoomable).toBe(true)
    })
  })
})
