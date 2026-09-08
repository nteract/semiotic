import { describe, expect, it } from "vitest"
import { bondProcessSankeyNodeData } from "./groupBonding"
import type { ProcessSankeyNodeData, ProcessSankeySample } from "./algorithm"

const nodes = [
  { id: "A", group: "group" },
  { id: "B", group: "group" }
]
const slots = nodes.map((node) => ({
  group: "group",
  peak: { topPeak: 4, botPeak: 4 },
  occupants: [{ id: node.id, end: 4 }]
}))

function nodeData(samples: ProcessSankeySample[]): ProcessSankeyNodeData {
  return {
    samples,
    peak: 8,
    topPeak: 4,
    botPeak: 4,
    localAttachments: new Map()
  }
}

function bond(data: Record<string, ProcessSankeyNodeData>, valueScale = 1) {
  return bondProcessSankeyNodeData(
    nodes,
    data,
    slots,
    { A: 0, B: 1 },
    { A: 0, B: 10 },
    valueScale
  )
}

function fixture() {
  return {
    A: nodeData([
      { t: 0, topMass: 2, botMass: 0 },
      { t: 1, topMass: 1, botMass: 0 },
      { t: 1, topMass: 3, botMass: 1, boundaryOffset: 1 },
      { t: 1, topMass: 2, botMass: 2, boundaryOffset: 5 },
      { t: 2, topMass: 0, botMass: 0 },
      { t: 4, topMass: 2, botMass: 0 }
    ]),
    B: nodeData([
      { t: 0.5, topMass: 2, botMass: 0 },
      { t: 1.5, topMass: 2, botMass: 0 },
      { t: 3, topMass: 2, botMass: 0 }
    ])
  }
}

describe("ProcessSankey group bonding", () => {
  it("keeps every same-time state and uses the last maximum-mass state for placement", () => {
    const result = bond(fixture())
    expect(result.A.samples.filter((sample) => sample.t === 1)).toEqual([
      { t: 1, topMass: 1, botMass: 0, boundaryOffset: -1 },
      { t: 1, topMass: 3, botMass: 1, boundaryOffset: 0 },
      { t: 1, topMass: 2, botMass: 2, boundaryOffset: 4 }
    ])
  })

  it("carries the final recorded state between timestamps without extending empty bands", () => {
    const result = bond(fixture())
    expect(result.A.samples.find((sample) => sample.t === 1.5)).toEqual({
      t: 1.5,
      topMass: 2,
      botMass: 2,
      boundaryOffset: 4
    })
    expect(result.A.samples.find((sample) => sample.t === 2)).toEqual({
      t: 2,
      topMass: 0,
      botMass: 0
    })
    expect(result.A.samples.some((sample) => sample.t === 3)).toBe(false)
    expect(result.B.samples.some((sample) => sample.t === 0)).toBe(false)
  })

  it("translates attachments with their band and leaves input records untouched", () => {
    const data = fixture()
    data.A.localAttachments.set("edge", {
      time: 1,
      side: "top",
      kind: "out",
      value: 1,
      sideMassBefore: 3,
      sideMassAfter: 2,
      boundaryOffset: 5
    })
    const original = structuredClone(data)
    const result = bond(data)
    expect(result.A.localAttachments.get("edge")).toEqual({
      ...original.A.localAttachments.get("edge"),
      boundaryOffset: 4
    })
    expect(result.A.localAttachments.get("edge")).not.toBe(
      data.A.localAttachments.get("edge")
    )
    expect(result.A.samples[0]).not.toBe(data.A.samples[0])
    expect(data).toEqual(original)
    expect(bond(data)).toEqual(result)
  })

  it("preserves exact matches and recorded-prefix fallback for out-of-order samples", () => {
    const result = bond({
      A: nodeData([
        { t: 3, topMass: 2, botMass: 0 },
        { t: 0, topMass: 1, botMass: 0 },
        { t: 2, topMass: 3, botMass: 0 }
      ]),
      B: nodeData([
        { t: 1, topMass: 2, botMass: 0 },
        { t: 4, topMass: 2, botMass: 0 }
      ])
    })
    expect(result.A.samples.map((sample) => sample.t)).toEqual([0, 2, 3, 4])
    expect(result.A.samples.at(-1)?.topMass).toBe(3)
  })

  it("handles an empty band beside a populated band", () => {
    const result = bond({ A: nodeData([]), B: fixture().B })
    expect(result.A.samples).toEqual([])
    expect(result.B.samples).toHaveLength(3)
  })

  it("returns the original records when bonding is disabled", () => {
    const data = fixture()
    expect(bond(data, 0)).toBe(data)
    expect(
      bondProcessSankeyNodeData([{ id: "A" }], data, slots, {}, {}, 1)
    ).toBe(data)
  })
})
