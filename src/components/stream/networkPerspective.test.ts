import { describe, expect, it, vi } from "vitest"
import {
  blendNetworkPerspectiveFrames,
  FLAT_NETWORK_PERSPECTIVE_FRAME,
  resolveNetworkPerspective
} from "./networkPerspective"
import { networkPerspectiveKey } from "./networkPerspectiveKey"
import { createNetworkPerspectiveFrame, readPerspectiveAccessor } from "./networkPerspectiveFit"

/** Screen height/width of a projected ground square (the diamond aspect). */
function diamondRatio(name: Parameters<typeof resolveNetworkPerspective>[0]) {
  const frame = createNetworkPerspectiveFrame(
    typeof name === "string" ? { type: name, fit: "none" } : { ...name, fit: "none" },
    [100, 100]
  )
  const corners = [
    frame.project(0, 0),
    frame.project(10, 0),
    frame.project(10, 10),
    frame.project(0, 10)
  ]
  const xs = corners.map((p) => p[0])
  const ys = corners.map((p) => p[1])
  return (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs))
}

describe("resolveNetworkPerspective", () => {
  it("returns null for flat, absent and unknown perspectives", () => {
    expect(resolveNetworkPerspective(undefined)).toBeNull()
    expect(resolveNetworkPerspective("flat")).toBeNull()
    expect(resolveNetworkPerspective({ type: "flat" })).toBeNull()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(resolveNetworkPerspective("hexagonal" as never)).toBeNull()
    expect(resolveNetworkPerspective("hexagonal" as never)).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('Unknown perspective "hexagonal"')
    warn.mockRestore()
  })

  it("defaults an object config to isometric", () => {
    expect(resolveNetworkPerspective({})?.type).toBe("isometric")
  })

  it("pins the preset projections", () => {
    // True isometric: diamond aspect tan(30°); pixel art: exactly 2:1.
    expect(diamondRatio("isometric")).toBeCloseTo(Math.tan(Math.PI / 6), 6)
    expect(diamondRatio("pixel")).toBeCloseTo(0.5, 6)
    expect(diamondRatio("dimetric")).toBeCloseTo(Math.sin((20 * Math.PI) / 180), 6)
    expect(diamondRatio("military")).toBeCloseTo(1, 6)
    const iso = resolveNetworkPerspective("isometric")!
    expect(iso.verticalScale).toBeCloseTo(Math.sqrt(2 / 3), 6)
    expect(resolveNetworkPerspective("military")!.verticalScale).toBe(1)
    const cabinet = resolveNetworkPerspective("cabinet")!
    // The front axis is preserved; depth recedes up-right at half scale.
    expect(cabinet.linear[0]).toBe(1)
    expect(cabinet.linear[1]).toBe(0)
    expect(cabinet.linear[2]).toBeCloseTo(-Math.SQRT1_2 / 2, 6)
    expect(cabinet.linear[3]).toBeCloseTo(Math.SQRT1_2 / 2, 6)
  })

  it("lets rotation and tilt override the preset", () => {
    const plan = resolveNetworkPerspective({ type: "isometric", rotation: 0, tilt: 90 })!
    expect(plan.linear.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([1, 0, -0, 1])
    expect(plan.verticalScale).toBeCloseTo(0, 6)
  })
})

describe("NetworkPerspectiveFrame", () => {
  it("inverts its projection on any elevation plane", () => {
    const frame = createNetworkPerspectiveFrame("isometric", [400, 300], [[0, 0], [400, 300]])
    for (const [x, y, z] of [[10, 20, 0], [200, 50, 30], [390, 290, 5]]) {
      const [sx, sy] = frame.project(x, y, z)
      const [ux, uy] = frame.unproject(sx, sy, z)
      expect(ux).toBeCloseTo(x, 6)
      expect(uy).toBeCloseTo(y, 6)
    }
  })

  it("lifts elevation straight up on screen", () => {
    const frame = createNetworkPerspectiveFrame({ type: "isometric", fit: "none" }, [100, 100])
    const [gx, gy] = frame.project(20, 20, 0)
    const [lx, ly] = frame.project(20, 20, 10)
    expect(lx).toBeCloseTo(gx, 9)
    expect(gy - ly).toBeCloseTo(10 * Math.sqrt(2 / 3), 6)
  })

  it("orders depth so nearer ground points are larger", () => {
    const frame = createNetworkPerspectiveFrame("isometric", [100, 100], [[0, 0], [100, 100]])
    expect(frame.depth(90, 90)).toBeGreaterThan(frame.depth(10, 10))
  })

  it("contains the projected content without enlarging it", () => {
    const points: Array<[number, number]> = [[0, 0], [600, 0], [600, 400], [0, 400]]
    const frame = createNetworkPerspectiveFrame("isometric", [600, 400], points)
    expect(frame.scale).toBeLessThanOrEqual(1)
    for (const [x, y] of points) {
      const [sx, sy] = frame.project(x, y)
      expect(sx).toBeGreaterThanOrEqual(12 - 1e-6)
      expect(sx).toBeLessThanOrEqual(600 - 12 + 1e-6)
      expect(sy).toBeGreaterThanOrEqual(12 - 1e-6)
      expect(sy).toBeLessThanOrEqual(400 - 12 + 1e-6)
    }
    const small = createNetworkPerspectiveFrame("isometric", [600, 400], [[290, 190], [310, 210]])
    expect(small.scale).toBe(1)
    expect(small.bounds).not.toBeNull()
  })

  it("exposes SVG transforms that agree with project()", () => {
    const frame = createNetworkPerspectiveFrame({ type: "pixel", fit: "none" }, [200, 200])
    const [a, b, c, d, e, f] = frame.matrix
    expect(frame.groundTransform.startsWith("matrix(")).toBe(true)
    expect(a * 30 + c * 40 + e).toBeCloseTo(frame.project(30, 40)[0], 9)
    expect(b * 30 + d * 40 + f).toBeCloseTo(frame.project(30, 40)[1], 9)
    expect(frame.billboardTransform(0, 0)).toMatch(/^translate\(/)
  })

  it("blends frames linearly with exact endpoints", () => {
    const iso = createNetworkPerspectiveFrame("isometric", [100, 100], [[0, 0], [100, 100]])
    expect(blendNetworkPerspectiveFrames(FLAT_NETWORK_PERSPECTIVE_FRAME, iso, 0)).toBe(
      FLAT_NETWORK_PERSPECTIVE_FRAME
    )
    expect(blendNetworkPerspectiveFrames(FLAT_NETWORK_PERSPECTIVE_FRAME, iso, 1)).toBe(iso)
    const mid = blendNetworkPerspectiveFrames(FLAT_NETWORK_PERSPECTIVE_FRAME, iso, 0.5)
    const [fx, fy] = FLAT_NETWORK_PERSPECTIVE_FRAME.project(40, 60)
    const [ix, iy] = iso.project(40, 60)
    const [mx, my] = mid.project(40, 60)
    expect(mx).toBeCloseTo((fx + ix) / 2, 9)
    expect(my).toBeCloseTo((fy + iy) / 2, 9)
  })
})

describe("perspective helpers", () => {
  it("reads accessors from the raw datum first", () => {
    expect(readPerspectiveAccessor("tier", { id: "a", data: { tier: 2 } })).toBe(2)
    expect(readPerspectiveAccessor("value", { value: 5, data: {} })).toBe(5)
    expect(readPerspectiveAccessor((d) => Number(d.tier) * 10, { data: { tier: 3 } })).toBe(30)
    expect(readPerspectiveAccessor(12, null)).toBe(12)
    expect(Number.isNaN(readPerspectiveAccessor("missing", { data: {} }))).toBe(true)
  })

  it("keys configs by value and callbacks by identity", () => {
    const fn = () => 1
    expect(networkPerspectiveKey({ type: "pixel", elevation: fn })).toBe(
      networkPerspectiveKey({ type: "pixel", elevation: fn })
    )
    expect(networkPerspectiveKey({ type: "pixel", elevation: fn })).not.toBe(
      networkPerspectiveKey({ type: "pixel", elevation: () => 1 })
    )
    expect(networkPerspectiveKey("isometric")).toBe("isometric")
    expect(networkPerspectiveKey(undefined)).toBe("")
  })
})
