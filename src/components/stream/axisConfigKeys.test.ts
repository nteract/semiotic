import { describe, expect, it } from "vitest"
import { findUnknownAxisConfigKeys } from "./axisConfigKeys"

describe("axis config keys", () => {
  it("reports keys no renderer reads, with the closest valid key", () => {
    expect(findUnknownAxisConfigKeys([{ orient: "bottom", tickz: 4, ticks: 3 }, { orient: "left" }])).toEqual([
      { index: 0, orient: "bottom", key: "tickz", suggestion: "ticks" },
    ])
    expect(findUnknownAxisConfigKeys([{ orient: "left", tickCount: 4, tickAnchor: "edges" }])).toEqual([])
    expect(findUnknownAxisConfigKeys(undefined)).toEqual([])
  })
})
