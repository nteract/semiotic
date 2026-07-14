import { describe, expect, it } from "vitest"
import { FrameRuntime } from "./FrameRuntime"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoPipelineConfig } from "./geoTypes"

function makeConfig(clock: () => number): GeoPipelineConfig {
  return {
    projection: "mercator",
    xAccessor: "lon",
    yAccessor: "lat",
    windowSize: 3,
    pulse: { duration: 300 },
    clock
  }
}

describe("GeoPipelineStore frame runtime clock", () => {
  it("freezes pulse time across pause and hidden intervals without catch-up", () => {
    let wallTime = 0
    const runtime = new FrameRuntime({ clock: () => wallTime })
    const store = new GeoPipelineStore(makeConfig(runtime.now))

    store.pushPoint({ id: "point", lon: -122.4, lat: 37.8 })
    expect(store.hasActivePulses).toBe(true)

    wallTime = 40
    expect(store.hasActivePulses).toBe(true)

    runtime.setPaused(true)
    wallTime = 10_000
    expect(store.hasActivePulses).toBe(true)
    runtime.setPaused(false)

    wallTime = 10_050
    expect(store.hasActivePulses).toBe(true)

    runtime.setVisible(false)
    wallTime = 20_000
    expect(store.hasActivePulses).toBe(true)
    runtime.setVisible(true)

    wallTime = 20_150
    expect(store.hasActivePulses).toBe(true)
    wallTime = 20_220
    expect(store.hasActivePulses).toBe(false)
  })
})
