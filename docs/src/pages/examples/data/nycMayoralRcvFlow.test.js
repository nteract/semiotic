import { describe, expect, it } from "vitest"
import {
  NYC_RCV_METRICS,
  NYC_RCV_PROCESS_EDGES,
  ROUND_FIVE_TALLY,
  TRANSFER_ANALYSIS,
  TRANSFER_POOLS,
} from "./nycMayoralRcvFlow"

describe("NYC mayoral ranked-choice transfer ledger", () => {
  it("conserves every certified elimination pool", () => {
    for (const pool of TRANSFER_POOLS) {
      expect(pool.transfers.reduce((sum, row) => sum + row.value, 0)).toBe(pool.sourceTotal)
    }
  })

  it("reconstructs the certified final count exactly", () => {
    expect(NYC_RCV_METRICS).toMatchObject({
      countedBallots: 942031,
      roundFiveGap: 103922,
      finalAdams: 404513,
      finalGarcia: 397316,
      finalInactive: 140202,
      finalGap: 7197,
      adamsLateGain: 108715,
      garciaLateGain: 205440,
      gapClosed: 96725,
    })
    expect(
      NYC_RCV_METRICS.finalAdams +
      NYC_RCV_METRICS.finalGarcia +
      NYC_RCV_METRICS.finalInactive,
    ).toBe(NYC_RCV_METRICS.countedBallots)
  })

  it("gives each Round 5 ballot one opening route and each transfer an increasing time", () => {
    const opening = NYC_RCV_PROCESS_EDGES.filter((edge) => edge.kind === "opening-tally")
    expect(opening).toHaveLength(ROUND_FIVE_TALLY.length)
    expect(opening.reduce((sum, edge) => sum + edge.value, 0)).toBe(942031)
    expect(NYC_RCV_PROCESS_EDGES.every((edge) => edge.endTime > edge.startTime)).toBe(true)
  })

  it("tracks how much of the leader's gap each pool closes", () => {
    expect(TRANSFER_ANALYSIS.map((pool) => ({
      id: pool.id,
      before: pool.gapBefore,
      after: pool.gapAfter,
      closing: pool.netClosing,
    }))).toEqual([
      { id: "field", before: 103922, after: 93458, closing: 10464 },
      { id: "yang", before: 93458, after: 87725, closing: 5733 },
      { id: "wiley", before: 87725, after: 7197, closing: 80528 },
    ])
    expect(TRANSFER_ANALYSIS.every((pool) => pool.garciaGain > pool.adamsGain)).toBe(true)
  })
})
