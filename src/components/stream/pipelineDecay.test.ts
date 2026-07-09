import { describe, expect, it } from "vitest"
import { applyDecay, buildDatumIndexMap, computeDecayOpacity } from "./pipelineDecay"
import type { SceneNode } from "./types"

describe("pipelineDecay", () => {
  it("computeDecayOpacity linear ramps newest→1 and oldest→min", () => {
    expect(computeDecayOpacity({ type: "linear" }, 9, 10)).toBeCloseTo(1, 5)
    expect(computeDecayOpacity({ type: "linear", minOpacity: 0.2 }, 0, 10)).toBeCloseTo(0.2, 5)
  })

  it("buildDatumIndexMap preserves buffer order indices", () => {
    const a = { id: "a" }
    const b = { id: "b" }
    const map = buildDatumIndexMap([a, b])
    expect(map.get(a)).toBe(0)
    expect(map.get(b)).toBe(1)
  })

  it("applyDecay reuses a provided indexMap", () => {
    const d0 = { x: 0, y: 1 }
    const d1 = { x: 1, y: 2 }
    const data = [d0, d1]
    const map = buildDatumIndexMap(data)
    const nodes: SceneNode[] = [
      {
        type: "point",
        x: 0,
        y: 0,
        r: 3,
        style: {},
        datum: d1
      } as SceneNode
    ]
    applyDecay({ type: "linear", minOpacity: 0.1 }, nodes, data, map)
    // newest point (index 1 of 2) should be near full opacity
    expect((nodes[0] as { style?: { opacity?: number } }).style?.opacity).toBeCloseTo(1, 5)
  })
})
