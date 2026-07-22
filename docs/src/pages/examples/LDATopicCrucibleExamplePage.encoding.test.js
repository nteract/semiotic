import { describe, expect, it } from "vitest"
import { distinctivenessTint, normalizedTopicExclusivity } from "./LDATopicCrucibleExamplePage"

describe("Latent Crucible topic-word encodings", () => {
  it("normalizes topic share from the four-topic uniform baseline to exclusivity", () => {
    expect(normalizedTopicExclusivity(0.25, 1, 4)).toEqual({
      share: 0.25,
      distinctiveness: 0,
    })
    expect(normalizedTopicExclusivity(0.5, 1, 4)).toEqual({
      share: 0.5,
      distinctiveness: 1 / 3,
    })
    expect(normalizedTopicExclusivity(1, 1, 4)).toEqual({
      share: 1,
      distinctiveness: 1,
    })
    expect(normalizedTopicExclusivity(0.1, 1, 4).distinctiveness).toBe(0)
  })

  it("quantizes normalized exclusivity into the requested four tints", () => {
    expect([0, 0.25, 0.5, 0.75, 1].map(distinctivenessTint)).toEqual([0, 0, 0.25, 0.5, 1])
  })
})
