import { describe, expect, it } from "vitest"
import { auditData, formatNumericRequirements } from "../semiotic-ai-data-audit"

describe("formatNumericRequirements", () => {
  it("puts blocking input requirements first and preserves the complete structured audit", () => {
    const data = Array.from({ length: 7 }, (_, i) => ({
      time: 10,
      revenue: i - 5
    }))
    const result = auditData("LineChart", {
      data,
      xAccessor: "time",
      yAccessor: "revenue",
      yScaleType: "log"
    })
    const original = result.diagnoses.map((item) => item.code)
    expect(original).toEqual(["ZERO_SPAN_DOMAIN", "LOG_NON_POSITIVE"])
    expect(formatNumericRequirements(result, 1)).toBe(
      '[LOG_NON_POSITIVE] A log y-axis requires "revenue" > 0. Found non-positive values in 6 rows.\n1 more numeric finding.'
    )
    expect(formatNumericRequirements(result)).toContain(
      '[ZERO_SPAN_DOMAIN] The x scale needs variation in "time" to infer a range. All 7 rows have the value 10.'
    )
    expect(result.diagnoses.map((item) => item.code)).toEqual(original)
    expect(result.diagnoses[1]).toMatchObject({
      count: 6,
      rows: [0, 1, 2, 3, 4]
    })
  })

  it("uses the active custom contract for positivity, finiteness, and required fields", () => {
    const result = auditData(
      "Yield",
      { data: [{ v: 1 }, { v: NaN }, {}, { v: -5 }] },
      undefined,
      {
        contracts: {
          fields: [
            {
              role: "yield",
              accessor: "valueAccessor",
              defaultAccessor: "v",
              requirements: ["positive"]
            }
          ]
        }
      }
    )
    expect(formatNumericRequirements(result)).toBe(
      [
        '[NON_FINITE_VALUE] "v" requires finite values. Found NaN or infinity in 1 row.',
        '[MISSING_NUMERIC_VALUE] The yield input requires "v". It is missing in 1 row.',
        '[NON_POSITIVE_VALUE] The yield input requires "v" > 0. Found non-positive values in 1 row.'
      ].join("\n")
    )
  })

  it("distinguishes an empty input, a single observation, and a checked domain", () => {
    const report = (data: Array<{ x: number; y: number }>) =>
      formatNumericRequirements(auditData("Scatterplot", { data }))
    expect(report([])).toContain(
      '[EMPTY_DATA] "data" needs at least one row to render numeric inputs. It has 0 rows.'
    )
    expect(report([{ x: 1, y: 4 }])).toBe(
      '[SINGLE_ROW_DOMAIN] A quantitative domain needs at least two observations to show variation. "data" has 1 row.'
    )
    expect(
      report([
        { x: 1, y: 4 },
        { x: 2, y: 5 }
      ])
    ).toBe("Scatterplot has no numeric findings across 2 rows.")
    expect(formatNumericRequirements(auditData("Unknown", {}))).toBe(
      "Unknown has no checked numeric requirements."
    )
  })
})
