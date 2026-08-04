import { describe, expect, it } from "vitest"
import type { ProcessSankeyBandSpec } from "./streamingLayout"
import { staggerProcessSankeyLabels, staggerVerticalProcessSankeyLabels } from "./labelPlacement"

function band(id: string, labelX: number, labelY = 100): ProcessSankeyBandSpec {
  return {
    id,
    pathD: "M0,0Z",
    fill: "#000",
    rawDatum: { id },
    labelX,
    labelY,
    labelText: id,
  }
}

describe("staggerProcessSankeyLabels", () => {
  it("stacks colliding labels only within the same reused row", () => {
    const result = staggerProcessSankeyLabels(
      [band("Low pass", 205), band("Lunar surface", 210), band("Recovery", 380)],
      { "Low pass": 1, "Lunar surface": 1, Recovery: 1 },
      300,
    )

    expect(result[1].labelY - result[0].labelY).toBeGreaterThanOrEqual(16)
    expect(result[2].labelY).toBe(100)
  })

  it("stagger labels from different rows when hug placement brings their text together", () => {
    const result = staggerProcessSankeyLabels(
      [band("A", 100), band("B", 101)],
      { A: 0, B: 1 },
      300,
    )
    expect(result[1].labelY - result[0].labelY).toBeGreaterThanOrEqual(16)
  })

  it("leaves different rows alone when their text rectangles do not collide", () => {
    const result = staggerProcessSankeyLabels(
      [band("A", 100, 80), band("B", 101, 120)],
      { A: 0, B: 1 },
      300,
    )
    expect(result.map((item) => item.labelY)).toEqual([80, 120])
  })

  it("stacks same-stage vertical labels into the available timeline gap", () => {
    const first = band("Long western state", 80, 100)
    const second = band("Long eastern state", 90, 100)
    first.labelAnchor = "middle"
    second.labelAnchor = "middle"
    const result = staggerVerticalProcessSankeyLabels([first, second], 300, 400)

    expect(result[0].labelY - result[1].labelY).toBeGreaterThanOrEqual(14)
    expect(result.every((item) => item.labelX === 80 || item.labelX === 90)).toBe(true)
  })
})
