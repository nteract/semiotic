import { describe, expect, it } from "vitest"
import { fromFlintChart } from "./fromFlintChart"

function temporal(values: unknown[], semanticType = "DateTime") {
  return fromFlintChart({
    data: { values: values.map((date, index) => ({ date, value: index + 1 })) },
    semantic_types: { date: semanticType },
    chart_spec: { chartType: "line", encodings: { x: "date", y: "value" } }
  })
}

describe("adapter temporal intent", () => {
  it("normalizes string and numeric Year semantics to calendar years", () => {
    const result = temporal(["2020", 2021, "2022"], "Year")
    expect(result.props.xScaleType).toBe("time")
    expect(result.props.data.map((row: { date: number }) => row.date)).toEqual([
      Date.UTC(2020, 0, 1),
      Date.UTC(2021, 0, 1),
      Date.UTC(2022, 0, 1)
    ])
    expect(result.warnings).toBeUndefined()
  })

  it("keeps raw numeric epoch values intact outside Year semantics", () => {
    expect(temporal([2020]).props.data[0].date).toBe(2020)
  })

  it("uses UTC consistently for date-only and timezone-free timestamps", () => {
    const result = temporal([
      "2020-01-01",
      "2020-01-01T00:00",
      "2020-01-01T05:30+0530"
    ])
    expect(result.props.data.map((row: { date: number }) => row.date)).toEqual(
      Array(3).fill(Date.UTC(2020, 0, 1))
    )
  })

  it("does not mutate authored temporal rows or normalize impossible dates", () => {
    const input = ["2024-02-30", "2024-02-29T00:00"]
    const result = temporal(input)
    expect(Number.isNaN(result.props.data[0].date)).toBe(true)
    expect(result.props.data[1].date).toBe(Date.UTC(2024, 1, 29))
    expect(input).toEqual(["2024-02-30", "2024-02-29T00:00"])
    expect(result.warnings).toContainEqual(
      expect.stringContaining("unparseable")
    )
  })
})
