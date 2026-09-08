import { describe, expect, it } from "vitest"
import { makeDateTickFormatter, formatDateMonthDay } from "./xyDateTicks"

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
})
