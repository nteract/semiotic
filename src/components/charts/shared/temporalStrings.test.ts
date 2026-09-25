import { describe, expect, it } from "vitest"
import { coerceTemporalStringRows, parseDateLikeString } from "./temporalStrings"
import { makeDateTickFormatter } from "../../stream/xyDateTicks"

describe("calendar date string timezone policy", () => {
  it.each(["2024-01", "2024-1", "2024-01-01", "2024-1-1"])(
    "parses %s at UTC midnight and labels the authored calendar day", input => {
      const parsed = parseDateLikeString(input)
      expect(parsed).toBe(Date.UTC(2024, 0, 1))
      expect(makeDateTickFormatter([parsed, parsed + 86400000])(parsed)).toBe("Jan 1")
      expect(coerceTemporalStringRows([{ date: input }], "date")).toEqual({
        data: [{ date: Date.UTC(2024, 0, 1) }], failed: false
      })
    }
  )

  it.each(["2024-00", "2024-13", "2024-02-30", "2023-2-29", "100", ""])(
    "does not silently normalize an invalid date %s", input => {
      expect(parseDateLikeString(input)).toBeNaN()
    }
  )

  it("preserves explicit offsets and local date-time semantics", () => {
    expect(parseDateLikeString("2024-01-01T00:00:00-08:00")).toBe(Date.UTC(2024, 0, 1, 8))
    expect(parseDateLikeString("2024-01-01T00:00")).toBe(new Date(2024, 0, 1).getTime())
  })
})
