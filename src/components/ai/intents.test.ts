import { describe, expect, it } from "vitest"

import { expandComposedIntentScores, registerIntent } from "./intents"

describe("registered intent composition", () => {
  it("blends existing scores with normalized weights", () => {
    registerIntent({
      id: "weighted-composition-test",
      label: "Weighted composition",
      description: "Test-only composed intent.",
      composes: ["trend", "change-detection"],
      weights: { trend: 1, "change-detection": 3 }
    })

    const scores = expandComposedIntentScores(
      { trend: 5, "change-detection": 1 },
      ["weighted-composition-test"]
    )
    expect(scores["weighted-composition-test"]).toBe(2)
  })

  it("supports nested composition and preserves an explicit capability score", () => {
    registerIntent({
      id: "nested-base-test",
      label: "Nested base",
      description: "Test-only nested intent.",
      composes: ["trend", "change-detection"]
    })
    registerIntent({
      id: "nested-outer-test",
      label: "Nested outer",
      description: "Test-only outer intent.",
      composes: ["nested-base-test", "outlier-detection"]
    })

    const nested = expandComposedIntentScores(
      { trend: 5, "change-detection": 3, "outlier-detection": 2 },
      ["nested-outer-test"]
    )
    expect(nested["nested-outer-test"]).toBe(3)

    const explicit = expandComposedIntentScores(
      {
        trend: 5,
        "change-detection": 3,
        "nested-outer-test": 4.75
      },
      ["nested-outer-test"]
    )
    expect(explicit["nested-outer-test"]).toBe(4.75)
  })

  it("terminates cyclic compositions without inventing a positive score", () => {
    registerIntent({
      id: "cycle-a-test",
      label: "Cycle A",
      description: "Test-only cycle endpoint.",
      composes: ["cycle-b-test"]
    })
    registerIntent({
      id: "cycle-b-test",
      label: "Cycle B",
      description: "Test-only cycle endpoint.",
      composes: ["cycle-a-test"]
    })

    expect(
      expandComposedIntentScores({}, ["cycle-a-test"])["cycle-a-test"]
    ).toBe(0)
  })
})
