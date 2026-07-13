import { describe, expect, it } from "vitest"
import { createSeededFrameRandom } from "./FrameRuntime"
import { GeoParticlePool } from "./GeoParticlePool"

describe("GeoParticlePool runtime randomness", () => {
  it("uses its supplied random source for deterministic and injected offsets", () => {
    const first = new GeoParticlePool(1)
    const second = new GeoParticlePool(1)
    const firstParticle = first.spawn(0, createSeededFrameRandom(17))
    const secondParticle = second.spawn(0, createSeededFrameRandom(17))

    expect(firstParticle?.offset).toBe(secondParticle?.offset)

    const injected = new GeoParticlePool(1)
    const particle = injected.spawn(0, () => 0.25)
    expect(particle?.offset).toBeCloseTo(-0.15)
  })
})
