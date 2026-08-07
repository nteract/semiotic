import { describe, expect, it } from "vitest"
import {
  computeProcessSankeyLayout,
  type ProcessSankeyEdge,
  type ProcessSankeyNode,
} from "./algorithm"
// @ts-expect-error -- This authored docs fixture is JavaScript; its layout shape is asserted below.
import * as ballotFixture from "../../../../../docs/src/pages/examples/data/nycMayoralRcvFlow.js"

const {
  NYC_RCV_DOMAIN,
  NYC_RCV_PROCESS_EDGES,
  NYC_RCV_PROCESS_NODES,
} = ballotFixture

function expectHubCenteredInPartnerSpan(
  slotByNode: Readonly<Record<string, number>>,
  hubId: string,
  partnerIds: readonly string[],
): void {
  const partnerSlots = [...new Set(partnerIds.map((id) => slotByNode[id]))]
    .sort((a, b) => a - b)
  expect(partnerSlots.length).toBeGreaterThanOrEqual(3)

  const hubSlot = slotByNode[hubId]
  const first = partnerSlots[0]
  const last = partnerSlots.at(-1)!
  // A discrete midpoint may land on either of two rows. It must not inherit
  // an extreme lane merely because the largest branch shares that lane.
  expect(Math.abs(hubSlot * 2 - first - last)).toBeLessThanOrEqual(1)
}

describe("ballot transfer ledger layout", () => {
  it("centers the Round 5 feeder within the six-way opening tally", () => {
    const nodes = (NYC_RCV_PROCESS_NODES as ProcessSankeyNode[])
      .map((node) => ({ ...node }))
    const edges = (NYC_RCV_PROCESS_EDGES as ProcessSankeyEdge[])
      .map((edge) => ({ ...edge }))
    const domain = NYC_RCV_DOMAIN as [number, number]
    const layout = computeProcessSankeyLayout(nodes, edges, {
      // Desktop example: 580px tall with 28px/48px vertical margins.
      plotH: 504,
      pairing: "temporal",
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      maxValueScale: 0.00038,
      lanePlacement: "hug",
      ribbonLane: "both",
      lifetimeMode: "half",
      domain: [...domain],
    })

    const openingTargets = edges
      .filter((edge) => edge.source === "ROUND_FIVE_TALLY")
      .map((edge) => edge.target)
    expectHubCenteredInPartnerSpan(
      layout.slotByNode,
      "ROUND_FIVE_TALLY",
      openingTargets,
    )
    expect(layout.layoutQuality.crossings).toBe(0)
  })
})
