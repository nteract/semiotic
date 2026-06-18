import { describe, expect, it } from "vitest"
import {
  buildTooltipEntries,
  extractTooltipDatum,
  formatTooltipValue,
} from "./customTooltip"

describe("custom tooltip helpers", () => {
  it("extracts useful datum fields from wrapped hover payloads", () => {
    const payload = {
      datum: {
        data: {
          category: "Planning",
          amount: 72,
          _transitionKey: "internal",
          onClick: () => null,
        },
      },
    }

    expect(extractTooltipDatum(payload)).toEqual({
      category: "Planning",
      amount: 72,
    })
  })

  it("builds filtered key/value entries with labels and max row count", () => {
    const entries = buildTooltipEntries(
      {
        data: {
          category: "Class 1",
          value: 124.25,
          rows: 42,
          survived: true,
        },
      },
      {
        labels: { category: "Passenger class" },
        maxEntries: 2,
      }
    )

    expect(entries).toEqual([
      { key: "category", label: "Passenger class", value: "Class 1", formatted: "Class 1" },
      { key: "value", label: "value", value: 124.25, formatted: "124.25" },
    ])
  })

  it("formats common tooltip values", () => {
    expect(formatTooltipValue(7)).toBe("7")
    expect(formatTooltipValue(false)).toBe("false")
    expect(formatTooltipValue(["a", "b"])).toBe("2 items")
    expect(formatTooltipValue({ id: "x" })).toBe('{"id":"x"}')
  })
})
