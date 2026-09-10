import { describe, expect, it } from "vitest"
import {
  resolveEventDropAdmissions,
  type EventDropAdmissionOptions
} from "./eventDropAdmission"

function replay(
  data: EventDropAdmissionOptions["data"],
  overrides: Partial<EventDropAdmissionOptions> = {}
) {
  return resolveEventDropAdmissions({
    data,
    timeAccessor: "time",
    arrivalAccessor: "arrival",
    windowSize: 10,
    watermark: { delay: 5 },
    ...overrides
  })
}

describe("EventDrop historical admission", () => {
  it("keeps ordered events accepted when later windows close", () => {
    const data = [0, 10, 20].map((time) => ({
      id: String(time),
      time,
      arrival: time
    }))
    const first = replay(data)
    expect(first.events.map(({ late }) => late)).toEqual([false, false, false])
    expect(
      first.events.map(({ watermarkAtArrival }) => watermarkAtArrival)
    ).toEqual([-5, 5, 15])
    expect(first.watermarkValue).toBe(15)
    expect(
      replay([...data, { id: "100", time: 100, arrival: 100 }]).events.slice(
        0,
        3
      )
    ).toEqual(first.events)
  })

  it("changes admission when the same events arrive out of order", () => {
    const result = replay([
      { id: "old", time: 0, arrival: 20 },
      { id: "middle", time: 10, arrival: 10 },
      { id: "new", time: 20, arrival: 0 }
    ])
    expect(result.events.map(({ late }) => late)).toEqual([true, false, false])
    expect(
      result.events.map(({ watermarkAtArrival }) => watermarkAtArrival)
    ).toEqual([15, 15, 15])
  })

  it("resolves tied arrivals in source order and never moves the watermark backward", () => {
    const data = [
      { time: 0, arrival: 1 },
      { time: 20, arrival: 1 }
    ]
    expect(replay(data).events.map(({ late }) => late)).toEqual([false, false])
    expect(
      replay(data.slice().reverse()).events.map(({ late }) => late)
    ).toEqual([false, true])
    expect(
      replay([{ time: 20 }, { time: 0 }], {
        watermark: (latest) => latest - 5
      }).events.map(({ late }) => late)
    ).toEqual([false, false])
  })

  it("preserves a recorded admission while the current watermark advances", () => {
    const data = [
      { time: 0, arrival: 1, admittedAt: -4 },
      { time: 0, arrival: 20, admittedAt: 10 }
    ]
    for (const value of [15, 100]) {
      const result = replay(data, {
        watermark: { value },
        watermarkAtArrivalAccessor: "admittedAt"
      })
      expect(result.events.map(({ late }) => late)).toEqual([false, true])
      expect(result.watermarkValue).toBe(value)
    }
  })

  it("supports fixed policy snapshots and exact window-end equality", () => {
    expect(
      replay([{ time: 9 }, { time: 10 }], {
        watermark: { value: 10 }
      }).events.map(({ late }) => late)
    ).toEqual([true, false])
  })

  it("replays corrected IDs once and skips invalid event times", () => {
    const result = replay([
      { id: "row", time: 0, arrival: 100 },
      { id: "row", time: 20, arrival: 1 },
      { id: "invalid", time: Infinity }
    ])
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({
      datum: { id: "row" },
      eventTime: 20,
      late: false
    })
  })

  it.each([0, -1, NaN, Infinity])(
    "rejects an invalid window size %s before allocating windows",
    (windowSize) => {
      expect(() => replay([{ time: 1 }], { windowSize })).toThrow(
        "windows.size must be a finite positive number"
      )
    }
  )
})
