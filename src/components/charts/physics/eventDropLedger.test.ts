import { describe, expect, it } from "vitest"
import { EventDropLedger } from "./eventDropLedger"
import { resolveEventDropAdmissions } from "./eventDropAdmission"
import { syntheticArrivals } from "../../recipes/syntheticArrivals"

describe("incremental EventDrop accounting", () => {
  it("starts missing-source idle deadlines at the stream origin for epoch times", () => {
    const ledger = new EventDropLedger(
      2500,
      { delay: 1000, perSource: true, idleTimeout: 5000 },
      ["a", "b"]
    )
    const start = 1700000000000
    ledger.append({ eventTime: start, arrivalTime: start, source: "a" })
    expect(ledger.getWatermark()).toBe(-Infinity)
    ledger.append({
      eventTime: start + 4999,
      arrivalTime: start + 4999,
      source: "a"
    })
    expect(ledger.getWatermark()).toBe(-Infinity)
    ledger.advance(start + 5000)
    expect(ledger.getWatermark()).toBe(start + 3999)
  })
  it("agrees with batch admission over 5,000 out-of-order event times", () => {
    const generator = syntheticArrivals(
      [{ id: "p1", interval: 100, jitter: "watermarks" }],
      37
    )
    const rows = Array.from({ length: 5000 }, () => generator.next().value!)
    const ledger = new EventDropLedger(2500, { delay: 1000 })
    const decisions = rows.map((row) => ledger.append(row))
    const batch = resolveEventDropAdmissions({
      data: rows,
      timeAccessor: "eventTime",
      arrivalAccessor: "arrivalTime",
      windowSize: 2500,
      watermark: { delay: 1000 }
    })
    expect(decisions.map((row) => row.late)).toEqual(
      batch.events.map((row) => row.late)
    )
    expect(ledger.getWatermark()).toBe(batch.watermarkValue)
    expect(
      ledger.getLedger().reduce((sum, row) => sum + row.accepted + row.late, 0)
    ).toBe(rows.length)
    for (const row of ledger.getLedger())
      expect(row.bySource.p1).toEqual({
        accepted: row.accepted,
        late: row.late
      })
    const events = ledger.drainEvents()
    const closes = events.filter((e) => e.type === "physics-window-close")
    expect(new Set(closes.map((e) => e.windowId)).size).toBe(closes.length)
    expect(
      events
        .filter((e) => e.type === "physics-watermark-advance")
        .every((e) => e.to! > e.from!)
    ).toBe(true)
    expect(ledger.drainEvents()).toEqual([])
  })

  it("holds the operator watermark until an idle source times out", () => {
    const ledger = new EventDropLedger(
      10,
      { delay: 1, perSource: true, idleTimeout: 10 },
      ["a", "b"]
    )
    ledger.append({ eventTime: 5, arrivalTime: 0, source: "b" })
    ledger.append({ eventTime: 30, arrivalTime: 1, source: "a" })
    expect(ledger.getWatermark()).toBe(4)
    ledger.append({ eventTime: 40, arrivalTime: 9, source: "a" })
    expect(ledger.getWatermark()).toBe(4)
    ledger.advance(10)
    expect(ledger.getWatermark()).toBe(39)
    expect(ledger.drainEvents()).toContainEqual({
      type: "physics-source-idle",
      sourceId: "b"
    })
  })

  it("records allowed-lateness updates and rejects after finalization", () => {
    const ledger = new EventDropLedger(10, { value: 12, allowedLateness: 5 })
    expect(
      ledger.append({ eventTime: 1, arrivalTime: 0, source: "a" }).late
    ).toBe(false)
    expect(
      ledger.append({ eventTime: 2, arrivalTime: 1, source: "a" }).late
    ).toBe(false)
    expect(ledger.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: "physics-window-update",
        accepted: 2,
        retractions: 1
      })
    )
    ledger.setWatermark({ value: 15, allowedLateness: 5 })
    expect(
      ledger.append({ eventTime: 3, arrivalTime: 2, source: "a" }).late
    ).toBe(true)
    expect(ledger.getLedger()[0]).toMatchObject({
      accepted: 2,
      late: 1,
      open: false
    })
  })

  it("freezes externally driven watermarks and protects historical rows from callers", () => {
    const ledger = new EventDropLedger(10, { external: () => 0 })
    ledger.append({ eventTime: 1, arrivalTime: 1, source: "a" })
    ledger.advance(1000)
    expect(ledger.getLedger()[0].open).toBe(true)
    const copy = ledger.getLedger()
    copy[0].bySource.a.accepted = 500
    expect(ledger.getLedger()[0].accepted).toBe(1)
    expect(ledger.getLedger()[0].bySource.a.accepted).toBe(1)
    expect(() => ledger.append({ eventTime: 0, arrivalTime: 2 })).toThrow(
      "nondecreasing"
    )
  })
})
