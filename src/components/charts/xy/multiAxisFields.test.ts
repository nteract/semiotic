import { describe, expect, it } from "vitest"
import { resolveMultiAxisSeriesColors } from "./multiAxisFields"
import { DEFAULT_COLORS } from "../shared/colorUtils"
import { schemeTableau10 } from "../shared/colorPalettes"

const series = [
  { yAccessor: "temp", label: "Temp" },
  { yAccessor: "humidity", label: "Humidity" },
]

describe("resolveMultiAxisSeriesColors", () => {
  it("resolves a named categorical scheme in series order", () => {
    expect(resolveMultiAxisSeriesColors(series, "tableau10", undefined)).toEqual([
      schemeTableau10[0],
      schemeTableau10[1],
    ])
  })

  it("maps an object scheme by series label", () => {
    expect(resolveMultiAxisSeriesColors(series, {
      Humidity: "#00aa00",
      Temp: "#aa0000",
    }, undefined)).toEqual(["#aa0000", "#00aa00"])
  })

  it("lets per-series color win over a named scheme", () => {
    expect(resolveMultiAxisSeriesColors(
      [
        { label: "Temp", color: "#111111" },
        { label: "Humidity" },
      ],
      "tableau10",
      undefined,
    )).toEqual(["#111111", schemeTableau10[1]])
  })

  it("falls back to DEFAULT_COLORS when no scheme or theme is set", () => {
    expect(resolveMultiAxisSeriesColors(series, undefined, undefined)[0]).toBe(DEFAULT_COLORS[0])
  })
})
