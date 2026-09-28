import { describe, expect, it, vi } from "vitest"
import { scaleLinear, scaleUtc } from "d3-scale"
import { generateXYTicks } from "./xyAxisTicks"
import { adaptiveTimeTicks } from "../charts/shared/formatUtils"

const HOUR = 3_600_000
const start = Date.UTC(2026, 8, 27, 12)
const everyHours = (hours: number, count: number, from = start) =>
  Array.from({ length: count }, (_, i) => from + i * hours * HOUR)
const labelsOf = (ticks: ReturnType<typeof generateXYTicks>) => ticks.map((tick) => tick.label)
const valuesOf = (ticks: ReturnType<typeof generateXYTicks>) => ticks.map((tick) => tick.value.valueOf())

describe("generateXYTicks with built-in formatters", () => {
  // Pinned to the output on main before index-aware relabeling existed.
  const numeric = scaleLinear().domain([0, 97]).range([0, 400])
  const day = scaleUtc().domain([start, start + 24 * HOUR]).range([0, 400])

  it("keeps numeric labels on both orientations", () => {
    const horizontal = generateXYTicks({ scale: numeric, size: 400, horizontal: true })
    expect(horizontal.map((tick) => [tick.value, tick.label])).toEqual([[0, "0"], [20, "20"], [40, "40"], [60, "60"], [80, "80"]])
    expect(labelsOf(generateXYTicks({ scale: numeric, size: 400 }))).toEqual(["0", "20", "40", "60", "80"])
    const withMax = generateXYTicks({ scale: numeric, size: 400, horizontal: true, axis: { orient: "bottom", includeMax: true } })
    expect(labelsOf(withMax)).toEqual(["0", "20", "40", "60", "80", "97"])
  })

  it("keeps date labels for explicit UTC ticks", () => {
    const ticks = generateXYTicks({
      scale: day,
      size: 400,
      horizontal: true,
      axis: { orient: "bottom", tickValues: everyHours(4, 7) },
    })
    // Repeated day labels collapse to the first tick of each day.
    expect(valuesOf(ticks)).toEqual(everyHours(12, 2))
    expect(labelsOf(ticks)).toEqual(["Sep 27", "Sep 28"])
  })
})

describe("generateXYTicks with index-aware formatters", () => {
  const day = scaleUtc().domain([start, start + 24 * HOUR]).range([0, 400])

  it("labels the rendered ticks, so thinning cannot hide a date change", () => {
    const ticks = generateXYTicks({
      scale: day,
      size: 400,
      horizontal: true,
      format: adaptiveTimeTicks(),
      axis: { orient: "bottom", tickValues: everyHours(4, 7) },
    })
    expect(valuesOf(ticks)).toEqual(everyHours(8, 4))
    expect(labelsOf(ticks)).toEqual(["Sep 27, 2026 12:00", "20:00", "Sep 28 04:00", "12:00"])
  })

  it("drops duplicates by rendered label, keeping ticks that only looked alike before thinning", () => {
    // Every fourth half-hour survives; each was ":30" against its dropped neighbour.
    const from = Date.UTC(2026, 8, 27, 12, 30)
    const scale = scaleUtc().domain([from, from + 6 * HOUR]).range([0, 400])
    const ticks = generateXYTicks({
      scale,
      size: 400,
      horizontal: true,
      format: adaptiveTimeTicks(),
      axis: { orient: "bottom", tickValues: everyHours(0.5, 13, from) },
    })
    expect(labelsOf(ticks)).toEqual(["Sep 27, 2026 12:30", "14:30", "16:30", "18:30"])
  })

  it("hands the formatter rendered indices and rendered tick values", () => {
    const format = vi.fn((value: number | Date | string, _index?: number, _allTicks?: number[]) => String(value))
    const ticks = generateXYTicks({
      scale: day,
      size: 400,
      horizontal: true,
      format,
      axis: { orient: "bottom", tickValues: everyHours(4, 7) },
    })
    const rendered = valuesOf(ticks)
    const finalCalls = format.mock.calls.slice(-rendered.length)
    expect(finalCalls.map(([value, index, allTicks]) => [Number(value), index, allTicks])).toEqual(
      rendered.map((value, index) => [value, index, rendered])
    )
  })

  it("labels an includeMax tick against the tick before it", () => {
    const scale = scaleUtc().domain([start, start + 44 * HOUR]).range([0, 600])
    const ticks = generateXYTicks({
      scale,
      size: 600,
      horizontal: true,
      format: adaptiveTimeTicks("hours"),
      axis: { orient: "bottom", includeMax: true },
    })
    expect(valuesOf(ticks).at(-1)).toBe(start + 44 * HOUR)
    expect(labelsOf(ticks)).toEqual(["Sep 27, 2026 12:00", "Sep 28 00:00", "12:00", "Sep 29 08:00"])
  })

  it("calls vertical formatters with the value only", () => {
    const format = vi.fn((value: number | Date | string) => String(value))
    generateXYTicks({ scale: scaleLinear().domain([0, 10]).range([100, 0]), size: 100, format })
    expect(format.mock.calls.every((call) => call.length === 1)).toBe(true)
  })
})
