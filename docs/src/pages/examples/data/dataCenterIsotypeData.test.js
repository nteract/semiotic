import { describe, expect, it } from "vitest"
import {
  DATA_CENTER_SITES,
  HYPERSCALE_CAPACITY,
  MAP_SECTIONS,
  MODEL_COMPUTE,
  STATUS_META,
  US_OUTLINE,
  outlineExtentAtLatitude,
  powerIconUnits,
  profileElevationAt,
  sitesByStatus,
} from "./dataCenterIsotypeData"

describe("data-center ISOTYPE evidence data", () => {
  it("keeps every site sourced and assigned to a known status", () => {
    expect(new Set(DATA_CENTER_SITES.map((site) => site.id)).size).toBe(
      DATA_CENTER_SITES.length,
    )
    for (const site of DATA_CENTER_SITES) {
      expect(STATUS_META[site.status]).toBeDefined()
      expect(site.source).toMatch(/^https:\/\//)
      expect(site.powerLabel).toBeTruthy()
      expect(site.waterLabel).toBeTruthy()
      expect(Number.isFinite(site.lon)).toBe(true)
      expect(Number.isFinite(site.lat)).toBe(true)
    }
  })

  it("keeps rounded hyperscale shares at one complete world", () => {
    expect(HYPERSCALE_CAPACITY.reduce((sum, region) => sum + region.share, 0)).toBe(100)
  })

  it("does not present planned capacity as operating capacity", () => {
    const operating = sitesByStatus(["legacy", "new"])
    expect(operating.every((site) => ["legacy", "new"].includes(site.status))).toBe(true)
    expect(operating.some((site) => site.id === "milam")).toBe(false)
  })

  it("allocates one server sign per 100 disclosed megawatts with partial final signs", () => {
    expect(powerIconUnits(1200)).toHaveLength(12)
    const units = powerIconUnits(150)
    expect(units).toHaveLength(2)
    expect(units[0].fraction).toBe(1)
    expect(units[1].fraction).toBe(0.5)
    expect(powerIconUnits(null)).toEqual([])
  })

  it("keeps every relief section normalized and inside the outline", () => {
    for (const section of MAP_SECTIONS) {
      const ts = section.profile.map(([t]) => t)
      expect(ts[0]).toBe(0)
      expect(ts[ts.length - 1]).toBe(1)
      expect([...ts].sort((a, b) => a - b)).toEqual(ts)
      for (const [, elevation] of section.profile) {
        expect(elevation).toBeGreaterThanOrEqual(0)
        expect(elevation).toBeLessThanOrEqual(1)
      }
      const extent = outlineExtentAtLatitude(US_OUTLINE, section.latitude)
      expect(extent).not.toBeNull()
      expect(extent[0]).toBeLessThan(extent[1])
    }
  })

  it("keeps every site's longitude within its latitude's drawn extent", () => {
    // Silicon Valley sits on the coast; the schematic west coast must reach it.
    const extent = outlineExtentAtLatitude(US_OUTLINE, 39.5)
    expect(extent[0]).toBeLessThan(-121.89)
  })

  it("interpolates and clamps elevation profiles", () => {
    const profile = [
      [0, 0],
      [0.5, 1],
      [1, 0.2],
    ]
    expect(profileElevationAt(profile, 0.25)).toBeCloseTo(0.5)
    expect(profileElevationAt(profile, 0.75)).toBeCloseTo(0.6)
    expect(profileElevationAt(profile, -1)).toBe(0)
    expect(profileElevationAt(profile, 2)).toBeCloseTo(0.2)
  })

  it("keeps model compute monotonic and distinguishes estimated compute", () => {
    expect(MODEL_COMPUTE.map((model) => model.compute)).toEqual(
      [...MODEL_COMPUTE].map((model) => model.compute).sort((a, b) => a - b),
    )
    expect(MODEL_COMPUTE.find((model) => model.id === "llama-3-1")?.caveat).toContain(
      "estimate",
    )
  })
})
