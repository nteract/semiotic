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
