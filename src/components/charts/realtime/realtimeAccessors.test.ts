import { describe, expect, it } from "vitest"
import { readRealtimeNumber, readRealtimeTime } from "./realtimeAccessors"
import { RealtimeAccumulator } from "./RealtimeAccumulator"

describe("realtime temporal normalization", () => {
  it.each(["2024-01", "2024-01-01", new Date(Date.UTC(2024, 0, 1))])(
    "preserves temporal identity for %s", time => {
      const resolved = readRealtimeTime({ time }, undefined, "time")
      expect(resolved).toBeInstanceOf(Date)
      expect(Number(resolved)).toBe(Date.UTC(2024, 0, 1))
    }
  )

  it.each([null, undefined, "", "bad date", new Date(NaN)])("rejects missing or invalid %s", time => {
    expect(readRealtimeTime({ time }, undefined, "time")).toBeNull()
  })

  it("leaves numeric axes and numeric values numeric", () => {
    expect(readRealtimeTime({ t: "100" }, "t", "time")).toBe(100)
    expect(readRealtimeNumber({ value: "2024-01-01" }, undefined, "value")).toBeNull()
  })

  it("places date strings into the correct aggregation windows", () => {
    const aggregate = { size: 86400000, stat: "sum" as const }
    const accumulator = new RealtimeAccumulator(aggregate)
    accumulator.push({ date: "2024-01-01T00:00:00Z", value: 2 }, "date")
    accumulator.push({ date: "2024-01-01T12:00:00Z", value: 3 }, "date")
    expect(accumulator.emit(aggregate)).toMatchObject([
      { time: Date.UTC(2024, 0, 1, 12), value: 5, count: 2, __aggStart: Date.UTC(2024, 0, 1), __aggEnd: Date.UTC(2024, 0, 2) }
    ])
  })
})
