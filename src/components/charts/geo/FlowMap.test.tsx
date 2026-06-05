import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { FlowMap } from "./FlowMap"
import { TooltipProvider } from "../../store/TooltipStore"
import type { AreasProp } from "../../geo/useReferenceAreas"

// Mock StreamGeoFrame to capture props AND expose a fake imperative
// handle so push-API tests can spy on `pushLine`/`pushManyLines`/etc.
let lastGeoFrameProps: any = null
const fakeFrameHandle = {
  push: vi.fn(),
  pushMany: vi.fn(),
  removePoint: vi.fn(() => []),
  pushLine: vi.fn(),
  pushManyLines: vi.fn(),
  removeLine: vi.fn(() => []),
  getLines: vi.fn(() => []),
  clear: vi.fn(),
  getProjection: vi.fn(() => null),
  getGeoPath: vi.fn(() => null),
  getCartogramLayout: vi.fn(() => null),
  getZoom: vi.fn(() => 1),
  resetZoom: vi.fn(),
  getData: vi.fn(() => []),
}
vi.mock("../../stream/StreamGeoFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      lastGeoFrameProps = props
      // Wire the forwarded ref to the fake handle so `useFrameImperativeHandle`
      // routes through it.
      if (typeof ref === "function") ref(fakeFrameHandle)
      else if (ref) ref.current = fakeFrameHandle
      return <div className="stream-geo-frame"><svg /></div>
    })
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
    Object.values(fakeFrameHandle).forEach((fn) => {
      fn.mockClear()
    })
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
      expect(lastGeoFrameProps.lines).toHaveLength(sampleFlows.length)
      expect(lastGeoFrameProps.lineStyle(sampleFlows[0])).toEqual(
        expect.objectContaining({ opacity: expect.any(Number) })
      )
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

    it("survives the loading→data transition without a hooks-count error", () => {
      // Regression guard for the misplaced `setup.earlyReturn` return: mounting
      // empty (loading skeleton) then streaming flows in must not change the
      // hook count between renders, or React throws "Rendered more hooks than
      // during the previous render".
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      try {
        const { rerender, container } = render(
          <Wrapper>
            <FlowMap nodes={sampleNodes} loading />
          </Wrapper>
        )
        expect(() =>
          rerender(
            <Wrapper>
              <FlowMap nodes={sampleNodes} flows={sampleFlows} valueAccessor="passengers" />
            </Wrapper>
          )
        ).not.toThrow()
        expect(lastGeoFrameProps.lines).toHaveLength(sampleFlows.length)
        expect(lastGeoFrameProps.lineType).toBe("geo")
        const hookErr = errSpy.mock.calls.some((c) =>
          String(c[0]).includes("Rendered more hooks") ||
          String(c[0]).includes("change in the order of Hooks")
        )
        expect(hookErr).toBe(false)
      } finally {
        errSpy.mockRestore()
      }
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
      const areas: AreasProp = [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [] } }]
      const areaStyle = { fill: "#eee", stroke: "#999" }
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} areas={areas} areaStyle={areaStyle} />
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
      // Each line should have coordinates array. Synthesized coords
      // carry stable internal keys (__semiotic_x / __semiotic_y);
      // the frame reads them via FlowMap's hybrid xAccessor /
      // yAccessor so the user-facing lon/lat is preserved at read
      // time. See "hybrid xAccessor reads…" tests below.
      for (const line of lastGeoFrameProps.lines) {
        expect(line.coordinates).toHaveLength(2)
        expect(line.coordinates[0]).toHaveProperty("__semiotic_x")
        expect(line.coordinates[0]).toHaveProperty("__semiotic_y")
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

  // ── Push API ──────────────────────────────────────────────────────────
  //
  // FlowMap pushes raw flows (`{ source, target, value }`); the HOC
  // resolves source/target through `nodeLookup` HOC-side, then forwards
  // a `{ ...flow, coordinates: [...] }` line entry to the frame's
  // `pushLine`/`pushManyLines`. See `useFrameImperativeHandle` `geo-lines`
  // variant.

  describe("push API", () => {
    it("translates a pushed flow into a coordinate-resolved line", () => {
      const ref = React.createRef<any>()
      render(
        <Wrapper>
          <FlowMap ref={ref} nodes={sampleNodes} />
        </Wrapper>
      )
      ref.current?.push({ source: "A", target: "B", passengers: 100 })

      expect(fakeFrameHandle.pushLine).toHaveBeenCalledTimes(1)
      const line = fakeFrameHandle.pushLine.mock.calls[0][0]
      expect(line.source).toBe("A")
      expect(line.target).toBe("B")
      expect(line.passengers).toBe(100)
      expect(line.coordinates).toHaveLength(2)
      // Synthesized coords carry stable internal keys
      // (`__semiotic_x` / `__semiotic_y`); the frame reads them via
      // FlowMap's hybrid xReader/yReader (verified separately by
      // checking lastGeoFrameProps.xAccessor returns the value when
      // called on a synthesized coord).
      expect(line.coordinates[0].__semiotic_x).toBe(-73.7)
      expect(line.coordinates[1].__semiotic_x).toBe(-0.4)
    })

    it("hybrid xAccessor reads synthesized coords AND user nodes", () => {
      // String-form user accessor: nodes use { lon, lat } keys, synthesized
      // coords use the stable internal keys. Both must work through the
      // single accessor passed to the frame.
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} />
        </Wrapper>
      )
      const xAcc = lastGeoFrameProps.xAccessor as (d: any) => number
      // Reads from a node (user shape).
      expect(xAcc({ lon: 100, lat: 50 })).toBe(100)
      // Reads from a synthesized coord (stable key).
      expect(xAcc({ __semiotic_x: 7, __semiotic_y: 8 })).toBe(7)
    })

    it("hybrid xAccessor works with function user accessors", () => {
      // Function accessor: would have silently failed with the old
      // [xAccessor as string] coord-key pattern.
      const lonFn = (d: any) => d.lon * 2
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} xAccessor={lonFn} />
        </Wrapper>
      )
      const xAcc = lastGeoFrameProps.xAccessor as (d: any) => number
      // Node shape — falls back to the user function.
      expect(xAcc({ lon: 5 })).toBe(10)
      // Synthesized coord — stable key wins (the user function would
      // have returned NaN here because synthesized coords don't carry
      // the user's expected shape).
      expect(xAcc({ __semiotic_x: 99 })).toBe(99)
    })

    it("drops a pushed flow whose endpoints aren't in nodeLookup", () => {
      const ref = React.createRef<any>()
      render(
        <Wrapper>
          <FlowMap ref={ref} nodes={sampleNodes} />
        </Wrapper>
      )
      ref.current?.push({ source: "A", target: "MISSING", value: 1 })
      expect(fakeFrameHandle.pushLine).not.toHaveBeenCalled()
    })

    it("batches pushMany into a single pushManyLines call", () => {
      const ref = React.createRef<any>()
      render(
        <Wrapper>
          <FlowMap ref={ref} nodes={sampleNodes} />
        </Wrapper>
      )
      ref.current?.pushMany([
        { source: "A", target: "B", value: 1 },
        { source: "B", target: "C", value: 2 },
        { source: "A", target: "MISSING", value: 99 }, // dropped
      ])

      expect(fakeFrameHandle.pushManyLines).toHaveBeenCalledTimes(1)
      const lines = fakeFrameHandle.pushManyLines.mock.calls[0][0]
      expect(lines).toHaveLength(2)
    })

    it("forwards remove(id) to the frame's removeLine", () => {
      const ref = React.createRef<any>()
      render(
        <Wrapper>
          <FlowMap ref={ref} nodes={sampleNodes} lineIdAccessor="id" />
        </Wrapper>
      )
      ref.current?.remove("flow-1")
      expect(fakeFrameHandle.removeLine).toHaveBeenCalledWith("flow-1")
    })

    it("forwards lineIdAccessor through to streamProps", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} flows={sampleFlows} lineIdAccessor="id" />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lineIdAccessor).toBe("id")
    })

    it("omits `lines` from streamProps when flows prop is undefined (push mode)", () => {
      render(
        <Wrapper>
          <FlowMap nodes={sampleNodes} />
        </Wrapper>
      )
      expect(lastGeoFrameProps.lines).toBeUndefined()
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
