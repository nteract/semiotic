import { describe, expect, it } from "vitest"
import {
  makeDateTickFormatter,
  formatDateMonthDay,
  isEpochMsDomain,
  isEpochTickFormatter,
  resolveAutoDateTickFormatter
} from "./xyDateTicks"

describe("automatic UTC date ticks", () => {
  const start = Date.UTC(2026, 0, 1)

  it("distinguishes seconds and milliseconds in short domains", () => {
    const seconds = makeDateTickFormatter([start, start + 60000])
    expect(seconds(start + 15000)).toBe("00:00:15")
    expect(seconds(start + 30000)).toBe("00:00:30")
    const milliseconds = makeDateTickFormatter([start, start + 1000])
    expect(milliseconds(start + 250)).toBe("00:00:00.250")
    expect(milliseconds(start + 500)).toBe("00:00:00.500")
  })

  it.each([
    1000,
    60000,
    3600000,
    86400000,
    2 * 365 * 86400000,
    10 * 365 * 86400000
  ])("uses the same resolution on reversed %dms domains", (span) => {
    expect(makeDateTickFormatter([start + span, start])(start)).toBe(
      makeDateTickFormatter([start, start + span])(start)
    )
  })

  it("uses UTC for the standalone date fallback as well", () => {
    expect(formatDateMonthDay(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "Jan 1"
    )
  })

  it("labels with exactly the precision the rendered ticks need", () => {
    // Sub-10s domain whose ticks fall on whole seconds: no trailing .000.
    const seconds = makeDateTickFormatter([start, start + 5000])
    const wholeSeconds = [start + 1000, start + 2000, start + 3000]
    expect(seconds(start + 2000, 1, wholeSeconds)).toBe("00:00:02")
    // Sub-second ticks keep milliseconds so neighbours stay distinct.
    const subSecond = [start + 200, start + 400, start + 600]
    expect(subSecond.map((v, i) => seconds(v, i, subSecond))).toEqual([
      "00:00:00.200",
      "00:00:00.400",
      "00:00:00.600"
    ])
    // A long domain whose ticks are off the minute gains seconds.
    const long = makeDateTickFormatter([start, start + 600000])
    const offMinute = [start + 100000, start + 200000]
    expect(long(start + 100000, 0, offMinute)).toBe("00:01:40")
    expect(long(start + 120000, 0, [start + 60000, start + 120000])).toBe("00:02")
    // Callers without tick values keep span-based resolution.
    expect(seconds(start + 2000)).toBe("00:00:02.000")
  })

  it("auto-formats epoch-ms streaming domains but not other numeric axes", () => {
    const epoch = [start, start + 1000]
    expect(isEpochMsDomain(epoch)).toBe(true)
    expect(isEpochMsDomain([0, 1000])).toBe(false)
    expect(isEpochMsDomain([new Date(start), new Date(start + 1000)])).toBe(false)

    const streaming = resolveAutoDateTickFormatter({
      xIsDate: false,
      streaming: true,
      domain: epoch
    })
    expect(streaming?.(start + 250)).toBe("00:00:00.250")
    expect(isEpochTickFormatter(streaming)).toBe(true)
    // Bounded charts may plot large non-time numbers (e.g. currency).
    expect(
      resolveAutoDateTickFormatter({ xIsDate: false, streaming: false, domain: epoch })
    ).toBeUndefined()
    expect(
      resolveAutoDateTickFormatter({ xIsDate: false, streaming: true, domain: [0, 500] })
    ).toBeUndefined()
    const dates = resolveAutoDateTickFormatter({
      xIsDate: true,
      streaming: false,
      domain: [new Date(start), new Date(start + 1000)]
    })
    expect(dates?.(start + 250)).toBe("00:00:00.250")
    expect(isEpochTickFormatter(dates)).toBe(false)
  })
})
