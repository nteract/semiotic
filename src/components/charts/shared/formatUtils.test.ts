import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  adaptiveTimeTicks,
  createTooltip,
  resolveAdaptiveTimeZone
} from "./formatUtils"

describe("createTooltip", () => {
  it("ignores inherited and malformed formatter or label-map entries", () => {
    const inheritedFormatter = vi.fn(() => "inherited")
    const formatters = Object.create({ constructor: inheritedFormatter }) as Record<
      string,
      (value: string | number | Date) => string
    >
    Object.defineProperty(formatters, "malformed", {
      value: "not-a-function",
      enumerable: true
    })
    const labels = Object.create({ constructor: "Inherited label" }) as Record<
      string,
      string
    >
    Object.defineProperty(labels, "malformed", {
      value: 42,
      enumerable: true
    })

    const markup = renderToStaticMarkup(
      createTooltip(
        ["constructor", "malformed"],
        formatters,
        labels
      )({ constructor: "raw", malformed: "plain" })
    )

    expect(markup).toContain("constructor: ")
    expect(markup).toContain("raw")
    expect(markup).toContain("malformed: ")
    expect(markup).toContain("plain")
    expect(inheritedFormatter).not.toHaveBeenCalled()
  })

  it("honors own prototype-named formatter and label entries", () => {
    const formatters = Object.fromEntries([
      ["constructor", (value: string | number | Date) => `own-${String(value)}`]
    ])
    const labels = Object.fromEntries([["constructor", "Own label"]])
    const markup = renderToStaticMarkup(
      createTooltip(["constructor"], formatters, labels)({ constructor: "value" })
    )

    expect(markup).toContain("Own label: ")
    expect(markup).toContain("own-value")
  })
})

describe("adaptiveTimeTicks", () => {
  it("keeps UTC as the backwards-compatible default", () => {
    const timestamp = Date.UTC(2026, 6, 29, 15, 14)
    expect(adaptiveTimeTicks("minutes")(timestamp, 0, [timestamp])).toBe("Jul 29, 2026 15:14")
  })

  it("can format ticks in the local timezone via utc: false", () => {
    const timestamp = Date.UTC(2026, 6, 29, 15, 14)
    const local = new Date(timestamp)
    const expected = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][local.getMonth()]} ${local.getDate()}, ${local.getFullYear()} ${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`

    expect(adaptiveTimeTicks("minutes", { utc: false })(timestamp, 0, [timestamp])).toBe(expected)
  })

  it("accepts timeZone: \"local\" as the preferred local-time option", () => {
    const timestamp = Date.UTC(2026, 6, 29, 15, 14)
    const viaFlag = adaptiveTimeTicks("minutes", { utc: false })(timestamp, 0, [timestamp])
    const viaZone = adaptiveTimeTicks("minutes", { timeZone: "local" })(timestamp, 0, [timestamp])
    expect(viaZone).toBe(viaFlag)
  })

  it("formats ticks in an explicit IANA timezone", () => {
    // 2026-07-29 15:14 UTC → 08:14 America/Los_Angeles (PDT, UTC-7)
    const timestamp = Date.UTC(2026, 6, 29, 15, 14)
    expect(
      adaptiveTimeTicks("minutes", { timeZone: "America/Los_Angeles" })(timestamp, 0, [timestamp]),
    ).toBe("Jul 29, 2026 08:14")
  })

  it("uses IANA calendar boundaries for subsequent ticks", () => {
    // 23:30 and 00:30 the next calendar day in America/New_York.
    // 2026-07-29 03:30 UTC = Jul 28 23:30 EDT; +1h = Jul 29 00:30 EDT.
    const first = Date.UTC(2026, 6, 29, 3, 30)
    const second = Date.UTC(2026, 6, 29, 4, 30)
    expect(
      adaptiveTimeTicks("minutes", { timeZone: "America/New_York" })(second, 1, [first, second]),
    ).toBe("Jul 29 00:30")
  })

  it("prefers timeZone over the legacy utc flag", () => {
    const timestamp = Date.UTC(2026, 6, 29, 15, 14)
    // utc: false would use local; timeZone: "UTC" must win.
    expect(
      adaptiveTimeTicks("minutes", { utc: false, timeZone: "UTC" })(timestamp, 0, [timestamp]),
    ).toBe("Jul 29, 2026 15:14")
  })

  it("uses local calendar boundaries for subsequent local-time ticks", () => {
    // The local getters in the expected value make this robust in every CI TZ,
    // while still catching an accidental UTC comparison in deltaLabel.
    const first = Date.UTC(2026, 6, 29, 23, 59)
    const second = first + 60_000
    const previous = new Date(first)
    const local = new Date(second)
    const expected = local.getDate() !== previous.getDate()
      ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][local.getMonth()]} ${local.getDate()} ${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`
      : local.getHours() !== previous.getHours()
        ? `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`
      : `:${String(local.getMinutes()).padStart(2, "0")}`

    expect(adaptiveTimeTicks("minutes", { utc: false })(second, 1, [first, second])).toBe(expected)
  })
})

describe("adaptiveTimeTicks axis label options", () => {
  const MIN = 60_000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR
  const series = (start: number, step: number, count: number) =>
    Array.from({ length: count }, (_, i) => start + i * step)
  const axis = (format: ReturnType<typeof adaptiveTimeTicks>, ticks: number[]) =>
    ticks.map((tick, index) => format(tick, index, ticks))
  const noon = Date.UTC(2026, 8, 27, 12)

  it("keeps the classic labels by default", () => {
    expect(axis(adaptiveTimeTicks(), series(noon, 10 * MIN, 7))).toEqual([
      "Sep 27, 2026 12:00", ":10", ":20", ":30", ":40", ":50", "13:00",
    ])
    expect(axis(adaptiveTimeTicks(), series(noon, 4 * HOUR, 7))).toEqual([
      "Sep 27, 2026 12:00", "16:00", "20:00", "Sep 28 00:00", "04:00", "08:00", "12:00",
    ])
    expect(axis(adaptiveTimeTicks(), series(Date.UTC(2026, 8, 20), 5 * DAY, 7))).toEqual([
      "Sep 20, 2026", "25", "30", "Oct 5", "10", "15", "20",
    ])
  })

  it("prints the minutes of hourly ticks that are not on the hour", () => {
    expect(axis(adaptiveTimeTicks("hours"), series(noon + 30 * MIN, 2 * HOUR, 3))).toEqual([
      "Sep 27, 2026 12:30", "14:30", "16:30",
    ])
  })

  it("drops the year inside the reference year with includeYear auto", () => {
    const days = series(Date.UTC(2026, 8, 20), 5 * DAY, 3)
    const inYear = adaptiveTimeTicks(undefined, { includeYear: "auto", referenceTime: Date.UTC(2026, 0, 5) })
    expect(axis(inYear, days)).toEqual(["Sep 20", "25", "30"])
    const otherYear = adaptiveTimeTicks(undefined, { includeYear: "auto", referenceTime: new Date(Date.UTC(2027, 0, 5)) })
    expect(axis(otherYear, days)).toEqual(["Sep 20, 2026", "25", "30"])
  })

  it("keeps the year at a year boundary unless includeYear is never", () => {
    const newYear = series(Date.UTC(2026, 11, 22), 5 * DAY, 3)
    const auto = adaptiveTimeTicks(undefined, { includeYear: "auto", referenceTime: Date.UTC(2026, 5, 1) })
    expect(axis(auto, newYear)).toEqual(["Dec 22, 2026", "27", "Jan 1, 2027"])
    expect(axis(adaptiveTimeTicks(undefined, { includeYear: "never" }), newYear)).toEqual(["Dec 22", "27", "Jan 1"])
    expect(axis(adaptiveTimeTicks("years", { includeYear: "never" }), [Date.UTC(2025, 0), Date.UTC(2026, 0)])).toEqual(["2025", "2026"])
  })

  it("shows only times for one calendar day with includeDate auto", () => {
    const oneDay = adaptiveTimeTicks(undefined, { includeDate: "auto" })
    expect(axis(oneDay, series(noon, 10 * MIN, 3))).toEqual(["12:00", ":10", ":20"])
    expect(axis(oneDay, series(noon, 4 * HOUR, 4))).toEqual(["Sep 27, 2026 12:00", "16:00", "20:00", "Sep 28 00:00"])
    expect(axis(adaptiveTimeTicks(undefined, { includeDate: "never" }), series(noon, 4 * HOUR, 4))).toEqual([
      "12:00", "16:00", "20:00", "00:00",
    ])
  })

  it("finds the calendar day in the configured time zone", () => {
    // 20:00 and 23:00 Los Angeles on Sep 27 are 03:00 and 06:00 UTC on Sep 28.
    const ticks = [Date.UTC(2026, 8, 28, 3), Date.UTC(2026, 8, 28, 6)]
    const la = adaptiveTimeTicks("hours", { includeDate: "auto", timeZone: "America/Los_Angeles" })
    expect(axis(la, ticks)).toEqual(["20:00", "23:00"])
    const utcSpan = [Date.UTC(2026, 8, 27, 23), Date.UTC(2026, 8, 28, 2)]
    expect(axis(adaptiveTimeTicks("hours", { includeDate: "auto" }), utcSpan)).toEqual(["Sep 27, 2026 23:00", "Sep 28 02:00"])
  })

  it("writes readable clock and date deltas with deltaStyle clock", () => {
    const clock = { deltaStyle: "clock" as const }
    expect(axis(adaptiveTimeTicks("minutes", clock), series(noon, 10 * MIN, 2))).toEqual(["Sep 27, 2026 12:00", "12:10"])
    expect(axis(adaptiveTimeTicks("seconds", clock), [noon + MIN, noon + MIN + 5000])).toEqual(["Sep 27, 2026 12:01:00", "12:01:05"])
    expect(axis(adaptiveTimeTicks("days", clock), [Date.UTC(2026, 9, 1), Date.UTC(2026, 9, 7)])).toEqual(["Oct 1, 2026", "Oct 7"])
  })

  it("keeps full labels for value-only calls such as tooltips", () => {
    const format = adaptiveTimeTicks("minutes", { includeYear: "never", includeDate: "never", deltaStyle: "clock" })
    expect(format(noon)).toBe("Sep 27, 2026 12:00")
    expect(format(noon, 2)).toBe("Sep 27, 2026 12:00")
  })
})

describe("resolveAdaptiveTimeZone", () => {
  it("defaults to UTC", () => {
    expect(resolveAdaptiveTimeZone()).toEqual({ kind: "utc" })
    expect(resolveAdaptiveTimeZone({})).toEqual({ kind: "utc" })
  })

  it("maps utc: false and timeZone aliases", () => {
    expect(resolveAdaptiveTimeZone({ utc: false })).toEqual({ kind: "local" })
    expect(resolveAdaptiveTimeZone({ timeZone: "local" })).toEqual({ kind: "local" })
    expect(resolveAdaptiveTimeZone({ timeZone: "UTC" })).toEqual({ kind: "utc" })
    expect(resolveAdaptiveTimeZone({ timeZone: "Europe/Berlin" })).toEqual({
      kind: "iana",
      id: "Europe/Berlin",
    })
  })
})
