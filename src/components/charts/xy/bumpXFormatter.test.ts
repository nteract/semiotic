import { describe, expect, it } from "vitest"
import { createBumpXFormatter } from "./bumpData"
import { renderChart } from "../../server/renderToStaticSVG"

const utc = (iso: string) => new Date(iso)

describe("createBumpXFormatter default Date labels", () => {
  it("formats in UTC at the periods' alignment, independent of the machine's zone", () => {
    // Local toLocaleDateString would put a UTC-midnight period on the
    // previous day west of Greenwich.
    const yearly = createBumpXFormatter([utc("2022-01-01T00:00:00Z"), utc("2024-01-01T00:00:00Z")], undefined)
    expect(yearly(0)).toBe("2022")
    expect(yearly(1)).toBe("2024")

    const monthly = createBumpXFormatter([utc("2023-12-01T00:00:00Z"), utc("2024-03-01T00:00:00Z")], undefined)
    expect(monthly(0)).toBe("Dec 2023")
    expect(monthly(1)).toBe("Mar 2024")

    const weekly = createBumpXFormatter([utc("2024-03-04T00:00:00Z"), utc("2024-03-11T00:00:00Z")], undefined)
    expect(weekly(1)).toBe("Mar 11")
    const acrossYears = createBumpXFormatter([utc("2023-12-25T00:00:00Z"), utc("2024-01-08T00:00:00Z")], undefined)
    expect(acrossYears(1)).toBe("Jan 8, 2024")

    const hourly = createBumpXFormatter([utc("2024-03-04T09:00:00Z"), utc("2024-03-04T10:00:00Z")], undefined)
    expect(hourly(1)).toBe("10:00")
  })

  it("leaves non-Date values alone", () => {
    expect(createBumpXFormatter(["Q1", "Q2"], undefined)(1)).toBe("Q2")
    expect(createBumpXFormatter([2023, 2024], undefined)(0)).toBe("2023")
  })

  it("defers to an authored xFormat", () => {
    const format = createBumpXFormatter([utc("2024-01-01T00:00:00Z")], (value) => `x:${(value as Date).getUTCFullYear()}`)
    expect(format(0)).toBe("x:2024")
  })

  it("labels renderChart ticks with the same UTC text", () => {
    const data = ["2021", "2022", "2023"].flatMap((year, i) => [
      { year: utc(`${year}-01-01T00:00:00Z`), team: "A", score: 10 + i },
      { year: utc(`${year}-01-01T00:00:00Z`), team: "B", score: 12 - i },
    ])
    const svg = renderChart("BumpChart", { data, xAccessor: "year", yAccessor: "score", lineBy: "team", width: 500, height: 300 })
    expect(svg).toContain(">2021<")
    expect(svg).toContain(">2023<")
  })
})
