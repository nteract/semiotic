import { describe, expect, it } from "vitest"

import {
  FRAME_TEXT_POSITIONS,
  resolveFrameTextPosition
} from "./frameTextAnnotation"

describe("resolveFrameTextPosition", () => {
  it("maps every plot anchor to deterministic coordinates and alignment", () => {
    const expected = {
      "top-left": [0, 0, "start", "hanging"],
      "top-center": [50, 0, "middle", "hanging"],
      "top-right": [100, 0, "end", "hanging"],
      "middle-left": [0, 40, "start", "middle"],
      center: [50, 40, "middle", "middle"],
      "middle-right": [100, 40, "end", "middle"],
      "bottom-left": [0, 80, "start", "auto"],
      "bottom-center": [50, 80, "middle", "auto"],
      "bottom-right": [100, 80, "end", "auto"]
    } as const

    for (const position of FRAME_TEXT_POSITIONS) {
      const resolved = resolveFrameTextPosition({ position }, 100, 80)
      expect([
        resolved.x,
        resolved.y,
        resolved.textAnchor,
        resolved.dominantBaseline
      ]).toEqual(expected[position])
    }
  })

  it("applies finite offsets and explicit alignment overrides", () => {
    expect(
      resolveFrameTextPosition(
        {
          position: "top-right",
          dx: -4,
          dy: 12,
          textAnchor: "middle",
          dominantBaseline: "middle"
        },
        120,
        60
      )
    ).toEqual({
      x: 116,
      y: 12,
      textAnchor: "middle",
      dominantBaseline: "middle"
    })
  })
})
