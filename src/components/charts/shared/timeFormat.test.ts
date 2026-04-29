import { describe, it, expect } from "vitest"
import { timeFormat } from "./timeFormat"

// Locks in parity with the strftime-token subset semiotic charts
// emit on time axes. Tests use a fixed date so any TZ shift in the
// runtime would surface here — local-tz format matches d3-time-format's
// `timeFormat()` (use `utcFormat()` for UTC, which we don't currently
// expose).
const SAMPLE = new Date(2026, 2, 24, 14, 33, 52, 123) // 2026-03-24 14:33:52.123 local

describe("timeFormat — strftime token subset", () => {
  it("formats `%Y-%m-%d`", () => {
    expect(timeFormat("%Y-%m-%d")(SAMPLE)).toBe("2026-03-24")
  })

  it("formats `%y` (2-digit year, zero-padded)", () => {
    const y2099 = new Date(2099, 0, 1)
    expect(timeFormat("%y")(y2099)).toBe("99")
    const y2005 = new Date(2005, 0, 1)
    expect(timeFormat("%y")(y2005)).toBe("05")
  })

  it("formats `%H:%M:%S`", () => {
    expect(timeFormat("%H:%M:%S")(SAMPLE)).toBe("14:33:52")
  })

  it("formats `%I` (12-hour) with `%p` (AM/PM)", () => {
    const morning = new Date(2026, 2, 24, 9, 0)
    expect(timeFormat("%I:%M %p")(morning)).toBe("09:00 AM")
    const afternoon = new Date(2026, 2, 24, 14, 0)
    expect(timeFormat("%I:%M %p")(afternoon)).toBe("02:00 PM")
    const midnight = new Date(2026, 2, 24, 0, 0)
    expect(timeFormat("%I %p")(midnight)).toBe("12 AM")
  })

  it("formats `%L` (3-digit milliseconds)", () => {
    expect(timeFormat("%S.%L")(SAMPLE)).toBe("52.123")
    const earlyMs = new Date(2026, 0, 1, 0, 0, 0, 7)
    expect(timeFormat("%L")(earlyMs)).toBe("007")
  })

  it("formats `%e` (space-padded day)", () => {
    const earlyDay = new Date(2026, 2, 4)
    expect(timeFormat("%e")(earlyDay)).toBe(" 4")
    const lateDay = new Date(2026, 2, 24)
    expect(timeFormat("%e")(lateDay)).toBe("24")
  })

  it("formats `%b` and `%B` via Intl.DateTimeFormat (pinned en-US)", () => {
    // The shim pins Intl.DateTimeFormat to "en-US" so output stays
    // stable across CI runners regardless of system locale, matching
    // d3-time-format's default-locale behavior. Asserting on the
    // literal strings is therefore safe.
    expect(timeFormat("%b")(SAMPLE)).toBe("Mar")
    expect(timeFormat("%B")(SAMPLE)).toBe("March")
  })

  it("formats `%a` and `%A` via Intl.DateTimeFormat (pinned en-US)", () => {
    // 2026-03-24 is a Tuesday in any locale, but the en-US name is
    // what the shim emits regardless of runtime locale. See above.
    expect(timeFormat("%a")(SAMPLE)).toBe("Tue")
    expect(timeFormat("%A")(SAMPLE)).toBe("Tuesday")
  })

  it("formats `%j` (day of year, 1-based, zero-padded)", () => {
    const jan1 = new Date(2026, 0, 1)
    expect(timeFormat("%j")(jan1)).toBe("001")
    // 2026 is non-leap; March 24 is day 31+28+24 = 83.
    expect(timeFormat("%j")(SAMPLE)).toBe("083")
  })

  it("emits `%%` as a literal `%`", () => {
    expect(timeFormat("100%%")(SAMPLE)).toBe("100%")
  })

  it("preserves literal text between tokens", () => {
    expect(timeFormat("Year %Y at %H:%M")(SAMPLE)).toBe("Year 2026 at 14:33")
  })

  it("preserves unknown tokens literally so the spec is debuggable", () => {
    // d3 throws on `%q`. We degrade to `%q` so a chart axis still
    // renders — the user sees their typo in the label rather than
    // an empty axis.
    expect(timeFormat("%q")(SAMPLE)).toBe("%q")
  })

  it("matches semiotic's default `%b %d, %Y` format", () => {
    // Pinned-en-US output, stable across runners.
    expect(timeFormat("%b %d, %Y")(SAMPLE)).toBe("Mar 24, 2026")
  })
})
