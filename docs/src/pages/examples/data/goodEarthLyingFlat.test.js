import { describe, expect, it } from "vitest"
import {
  GOOD_EARTH_NODE_HATCHES,
  GOOD_EARTH_PROCESS_EDGES,
  GOOD_EARTH_PROCESS_NODES,
  GOOD_EARTH_STAGES,
  GOOD_EARTH_WEIGHT_SEMANTICS,
} from "./goodEarthLyingFlat"

describe("goodEarthLyingFlat data adapter", () => {
  it("preserves the authored six-stage causal structure", () => {
    expect(GOOD_EARTH_STAGES).toHaveLength(6)
    expect(GOOD_EARTH_PROCESS_NODES).toHaveLength(20)
    expect(GOOD_EARTH_PROCESS_EDGES).toHaveLength(35)
    expect(GOOD_EARTH_PROCESS_EDGES.every((edge) => edge.startTime <= edge.endTime)).toBe(true)
  })

  it("keeps causal confidence and lens metadata on every claim", () => {
    expect(GOOD_EARTH_PROCESS_EDGES.map((edge) => edge.confidence)).toContain("low")
    expect(GOOD_EARTH_PROCESS_EDGES.every((edge) => edge.claimLens && edge.confidenceOpacity > 0)).toBe(true)
    expect(GOOD_EARTH_WEIGHT_SEMANTICS).toMatch(/interpretive/i)
  })

  it("uses HatchFill descriptors to carry incoming and outgoing flow colors on nodes", () => {
    expect(GOOD_EARTH_NODE_HATCHES.involution).toMatchObject({
      type: "hatch",
      background: "#33b1ff",
      stroke: "#a56eff",
    })
    expect(GOOD_EARTH_NODE_HATCHES.confidence_loss).toMatchObject({
      type: "hatch",
      background: "#33b1ff",
      stroke: "#a56eff",
    })
  })
})
