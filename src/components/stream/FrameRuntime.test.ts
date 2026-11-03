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
    for (const runtime of [first, second]) {
      expect([runtime.random(), runtime.random(), runtime.random()]).toEqual([
        0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
      ])
    }

    const injected = new FrameRuntime({ seed: 42, random: () => 0.25 })
    expect(injected.random()).toBe(0.25)
    expect(injected.snapshot().seed).toBe(42)
  })

  it("preserves the seeded sequence after millions of particle samples", () => {
    const runtime = new FrameRuntime({ seed: 0 })
    // Exact uint32-state reference values. An unbounded accumulator loses
    // integer precision at draw 4,917,759 even though the seed is valid.
    for (let draw = 0; draw < 4_917_757; draw++) runtime.random()
    expect([runtime.random(), runtime.random(), runtime.random()]).toEqual([
      0.29623389709740877, 0.8771766452118754, 0.9146185866557062,
    ])
  })
})
