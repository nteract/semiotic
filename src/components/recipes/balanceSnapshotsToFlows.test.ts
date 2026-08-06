import { describe, expect, it } from "vitest"
import { balanceSnapshotsToFlows } from "./balanceSnapshotsToFlows"

const options = {
  beforeId: (datum: { id: string; value: number }) => datum.id,
  beforeValue: (datum: { id: string; value: number }) => datum.value,
}

describe("balanceSnapshotsToFlows", () => {
  it("preserves stays and deterministically routes residual movement", () => {
    const result = balanceSnapshotsToFlows(
      [
        { id: "a", value: 60 },
        { id: "b", value: 40 },
      ],
      [
        { id: "a", value: 20 },
        { id: "b", value: 50 },
        { id: "c", value: 30 },
      ],
      options,
    )

    expect(result).toMatchObject({ beforeTotal: 100, afterTotal: 100, balanced: true })
    expect(result.flows).toEqual([
      { sourceId: "a", targetId: "a", value: 20, kind: "stay" },
      { sourceId: "b", targetId: "b", value: 40, kind: "stay" },
      { sourceId: "a", targetId: "b", value: 10, kind: "move" },
      { sourceId: "a", targetId: "c", value: 30, kind: "move" },
    ])
    expect(result.unmatchedBefore).toEqual([])
    expect(result.unmatchedAfter).toEqual([])
  })

  it("rejects unequal totals by default and reports residuals on request", () => {
    const before = [{ id: "a", value: 10 }]
    const after = [{ id: "a", value: 6 }]
    expect(() => balanceSnapshotsToFlows(before, after, options)).toThrow(/totals must match/i)
    expect(
      balanceSnapshotsToFlows(before, after, { ...options, allowImbalance: true }),
    ).toMatchObject({
      balanced: false,
      unmatchedBefore: [{ id: "a", value: 4 }],
      unmatchedAfter: [],
    })
  })

  it("rejects duplicate identities and negative values", () => {
    expect(() =>
      balanceSnapshotsToFlows(
        [{ id: "a", value: 1 }, { id: "a", value: 1 }],
        [{ id: "a", value: 2 }],
        options,
      ),
    ).toThrow(/duplicate id/i)
    expect(() =>
      balanceSnapshotsToFlows([{ id: "a", value: -1 }], [{ id: "a", value: -1 }], options),
    ).toThrow(/non-negative/i)
  })

  it("supports different snapshot shapes and numeric identities", () => {
    const result = balanceSnapshotsToFlows(
      [{ category: 1, count: 2 }],
      [{ key: 1, amount: 1 }, { key: 2, amount: 1 }],
      {
        beforeId: (datum) => datum.category,
        beforeValue: (datum) => datum.count,
        afterId: (datum) => datum.key,
        afterValue: (datum) => datum.amount,
      },
    )

    expect(result.flows).toEqual([
      { sourceId: "1", targetId: "1", value: 1, kind: "stay" },
      { sourceId: "1", targetId: "2", value: 1, kind: "move" },
    ])
  })

  it("handles empty conserved snapshots", () => {
    expect(balanceSnapshotsToFlows([], [], options)).toEqual({
      flows: [],
      beforeTotal: 0,
      afterTotal: 0,
      balanced: true,
      unmatchedBefore: [],
      unmatchedAfter: [],
    })
  })
})
