import { describe, expect, it } from "vitest"
import { US_WARS, WAR_DOMAIN, WAR_PERIODS } from "./usWars"

describe("U.S. war timeline data", () => {
  it("extends the timeline through the July 2026 snapshot", () => {
    expect(WAR_DOMAIN).toEqual([1770, 2026])
    expect(WAR_PERIODS.at(-1)).toEqual({
      name: "Empire",
      start: 1952,
      end: 2026,
    })
  })

  it("includes documented post-2015 operations", () => {
    const names = new Set(US_WARS.map((war) => war.name))
    for (const name of [
      "Operation Odyssey Lightning",
      "Shayrat missile strike",
      "2018 strikes against Syrian chemical weapons sites",
      "U.S.–Houthi hostilities in Yemen",
      "2025 Iran–Israel War / Operation Midnight Hammer",
      "2026 U.S.–Iran War / Operation Epic Fury",
    ]) {
      expect(names.has(name)).toBe(true)
    }
  })

  it("resolves ongoing operations to the snapshot boundary", () => {
    const ongoing = US_WARS.filter((war) => war.ongoing)
    expect(ongoing.length).toBeGreaterThan(0)
    expect(ongoing.every((war) => war.endYear === WAR_DOMAIN[1])).toBe(true)
  })
})
