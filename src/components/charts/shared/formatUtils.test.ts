import { describe, expect, it } from "vitest"
import { adaptiveTimeTicks } from "./formatUtils"

describe("adaptiveTimeTicks", () => {
  it("keeps UTC as the backwards-compatible default", () => {
    const timestamp = Date.UTC(2026, 6, 29, 15, 14)
    expect(adaptiveTimeTicks("minutes")(timestamp, 0, [timestamp])).toBe("Jul 29, 2026 15:14")
  })

  it("can format ticks in the local timezone", () => {
    const timestamp = Date.UTC(2026, 6, 29, 15, 14)
    const local = new Date(timestamp)
    const expected = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][local.getMonth()]} ${local.getDate()}, ${local.getFullYear()} ${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`

    expect(adaptiveTimeTicks("minutes", { utc: false })(timestamp, 0, [timestamp])).toBe(expected)
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
