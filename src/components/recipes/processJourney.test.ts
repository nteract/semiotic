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

  it("preserves prototype-named entity and stage ids without reading inherited state", () => {
    const stages = [
      { id: "constructor" },
      { id: "__proto__" },
      { id: "fallback" }
    ]
    let ledger = createProcessJourneyLedger({ stages })
    const event = (
      bodyId: string,
      regionId: string,
      metadata: Record<string, unknown>
    ) => ({
      type: "region-enter" as const,
      bodyId,
      datum: { id: bodyId },
      observation: { timestamp: 1 } as never,
      region: {
        id: regionId,
        metadata,
        shape: { type: "aabb" as const, x: 0, y: 0, width: 10, height: 10 }
      }
    })

    ledger = updateProcessJourney(
      ledger,
      event("constructor", "unused", { stageId: "constructor" })
    )
    ledger = updateProcessJourney(
      ledger,
      event("constructor", "unused", { stageId: "__proto__" })
    )
    const inheritedMetadata = Object.create({ stageId: "constructor" }) as Record<
      string,
      unknown
    >
    ledger = updateProcessJourney(
      ledger,
      event("constructor", "fallback", inheritedMetadata)
    )

    expect(Object.prototype.hasOwnProperty.call(ledger.entities, "constructor")).toBe(true)
    expect(ledger.entities["constructor"].visitsByStage["constructor"]).toBe(1)
    expect(ledger.entities["constructor"].visitsByStage["__proto__"]).toBe(1)
    expect(ledger.entities["constructor"].visitsByStage.fallback).toBe(1)
    expect(processJourneyRows(ledger).map((row) => row.visits)).toEqual([1, 1, 1])
  })

  it("falls back safely for malformed serialized entity state", () => {
    const ledger = createProcessJourneyLedger({
      stages: [{ id: "constructor" }],
      bodyIds: ["constructor"]
    })
    ledger.entities["constructor"] = {
      id: "constructor",
      visitsByStage: "malformed"
    } as never

    expect(processJourneyRows(ledger)[0]).toMatchObject({
      visits: 0,
      entered: 0
    })
  })
})
