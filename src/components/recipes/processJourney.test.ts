import { describe, expect, it } from "vitest"
import {
  createProcessJourneyLedger,
  processJourneyRows,
  updateProcessJourney
} from "./processJourney"

describe("process journey ledger", () => {
  it("reduces stage events into reach, repeat-visit, and regression rows", () => {
    const stages = [
      { id: "discovery", label: "Discovery" },
      { id: "activation", label: "Activation" },
      { id: "impact", label: "First Impact" }
    ]
    let ledger = createProcessJourneyLedger({
      stages,
      bodyIds: ["a", "b"]
    })
    const event = (bodyId: string, stageId: string, timestamp: number) => ({
      type: "region-enter" as const,
      bodyId,
      datum: { id: bodyId },
      observation: { timestamp } as never,
      region: {
        id: `stage:${stageId}`,
        metadata: { stageId },
        shape: { type: "aabb" as const, x: 0, y: 0, width: 10, height: 10 }
      }
    })

    ledger = updateProcessJourney(ledger, event("a", "discovery", 0.1))
    ledger = updateProcessJourney(ledger, event("a", "impact", 1.2))
    ledger = updateProcessJourney(ledger, event("a", "impact", 1.4))
    ledger = updateProcessJourney(ledger, event("a", "activation", 1.8))
    ledger = updateProcessJourney(ledger, event("b", "discovery", 0.2))
    const ignored = updateProcessJourney(
      ledger,
      event("b", "not-a-stage", 2)
    )
    const rows = processJourneyRows(ledger)

    expect(ignored).toBe(ledger)
    expect(ledger.entities.a).toMatchObject({
      currentStageId: "activation",
      furthestStageId: "impact",
      furthestStageIndex: 2,
      regressionCount: 1,
      visitsByStage: { discovery: 1, impact: 2, activation: 1 },
      firstEnteredAt: { discovery: 0.1, impact: 1.2, activation: 1.8 },
      lastEnteredAt: { discovery: 0.1, impact: 1.4, activation: 1.8 }
    })
    expect(rows).toEqual([
      {
        id: "discovery",
        label: "Discovery",
        reached: 2,
        entered: 2,
        total: 2,
        conversion: 1,
        fromPrevious: 1,
        dropoff: 0,
        visits: 2,
        repeatVisits: 0
      },
      {
        id: "activation",
        label: "Activation",
        reached: 1,
        entered: 1,
        total: 2,
        conversion: 0.5,
        fromPrevious: 0.5,
        dropoff: 1,
        visits: 1,
        repeatVisits: 0
      },
      {
        id: "impact",
        label: "First Impact",
        reached: 1,
        entered: 1,
        total: 2,
        conversion: 0.5,
        fromPrevious: 1,
        dropoff: 0,
        visits: 2,
        repeatVisits: 1
      }
    ])
  })
})
