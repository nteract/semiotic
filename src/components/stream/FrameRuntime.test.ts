import { describe, expect, it } from "vitest"
import { FrameRuntime } from "./FrameRuntime"

describe("FrameRuntime", () => {
  it("freezes logical time while paused or hidden without catch-up on resume", () => {
    let wallTime = 100
    const runtime = new FrameRuntime({ clock: () => wallTime })

    expect(runtime.now()).toBe(100)
    wallTime = 120
    expect(runtime.now()).toBe(120)

    runtime.setPaused(true)
    wallTime = 1_000
    expect(runtime.now()).toBe(120)

    runtime.setPaused(false)
    expect(runtime.now()).toBe(120)
    wallTime = 1_016
    expect(runtime.now()).toBe(136)

    runtime.setVisible(false)
    wallTime = 2_000
    expect(runtime.now()).toBe(136)

    runtime.setVisible(true)
    wallTime = 2_025
    expect(runtime.now()).toBe(161)
  })

  it("uses a serializable seed deterministically and preserves an injected RNG seam", () => {
    const first = new FrameRuntime({ seed: 42 })
    const second = new FrameRuntime({ seed: 42 })
    expect([first.random(), first.random(), first.random()]).toEqual([
      second.random(), second.random(), second.random(),
    ])

    const injected = new FrameRuntime({ seed: 42, random: () => 0.25 })
    expect(injected.random()).toBe(0.25)
    expect(injected.snapshot().seed).toBe(42)
  })
})
