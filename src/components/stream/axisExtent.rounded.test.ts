import { describe, expect, it } from "vitest"
import { scaleLinear, scaleUtc } from "d3-scale"
import { resolveAxisTickCount } from "./axisTickUtils"
import { generateXYTicks } from "./xyAxisTicks"
import { heatmapBandScale } from "./heatmapBandTicks"
import { roundScaleDomain } from "./roundScaleDomain"
import { makePipelineScale } from "./pipelineDomainResolution"

describe("shared tick-count rule", () => {
  it("caps requested ticks using final plot size, with ticks winning over tickCount", () => {
    expect(resolveAxisTickCount({ size: 130 })).toBe(4)
    expect(resolveAxisTickCount({ size: 72 })).toBe(2)
    expect(resolveAxisTickCount({ size: 400, orientation: "horizontal" })).toBe(
      5
    )
    expect(
      resolveAxisTickCount({ size: 130, axis: { ticks: 3, tickCount: 9 } })
    ).toBe(3)
    expect(resolveAxisTickCount({ size: 130, axis: { tickCount: 3 } })).toBe(3)
    expect(resolveAxisTickCount({ size: 130, axis: { ticks: 0 } })).toBe(0)
    expect(resolveAxisTickCount({ size: 30, axis: { extent: "exact" } })).toBe(
      5
    )
    expect(
      resolveAxisTickCount({
        size: 130,
        axis: { extent: "nice" },
        axisExtent: "exact"
      })
    ).toBe(4)
  })
  it("normalizes negative zero after rounding", () => {
    const scale = scaleLinear().domain([-0, 1.1])
    roundScaleDomain(scale, 4, [false, false])
    expect(scale.domain()).toEqual([0, 1.2])
    expect(Object.is(scale.domain()[0], -0)).toBe(false)
  })
  it.each(["time", "utc"] as const)(
    "retains Date bounds when rounding a %s scale",
    (type) => {
      const start = Date.UTC(2024, 0, 1, 1)
      const end = Date.UTC(2024, 0, 1, 23)
      const scale = makePipelineScale(type, [start, end], [130, 0])
      roundScaleDomain(scale, 4, [true, false])
      const domain = scale.domain().map(Number)
      expect(domain[0]).toBe(start)
      expect(domain[1]).toBeGreaterThanOrEqual(end)
      const ticks = generateXYTicks({ scale, size: 130, axisExtent: "rounded" })
      expect(Number(ticks[ticks.length - 1].value)).toBe(domain[1])
      expect(Number.isFinite(scale(end))).toBe(true)
    }
  )
})

describe("includeMin", () => {
  it("adds the lower endpoint, drops a nearby tick, and can include both ends", () => {
    const scale = scaleLinear().domain([-97, 97]).range([130, 0])
    const ticks = generateXYTicks({
      scale,
      size: 130,
      axis: { orient: "left", includeMin: true, includeMax: true }
    })
    expect(ticks.map((tick) => tick.value)).toEqual([-97, -50, 0, 50, 97])
    const near = scaleLinear().domain([-103, 100]).range([130, 0])
    expect(
      generateXYTicks({
        scale: near,
        size: 130,
        axis: { orient: "left", includeMin: true }
      }).map((tick) => tick.value)
    ).toEqual([-103, -50, 0, 50, 100])
  })
  it("does not duplicate an endpoint already within one pixel", () => {
    const scale = scaleLinear().domain([-100.5, 100]).range([130, 0])
    expect(
      generateXYTicks({
        scale,
        size: 130,
        axis: { orient: "left", includeMin: true }
      }).map((tick) => tick.value)
    ).toEqual([-100, -50, 0, 50, 100])
  })
  it("respects explicit ticks, exact mode, zero ticks, and band ticks", () => {
    const scale = scaleLinear().domain([-97, 97]).range([130, 0])
    for (const axis of [
      { orient: "left" as const, tickValues: [-50, 50] },
      { orient: "left" as const, extent: "exact" as const },
      { orient: "left" as const, ticks: 0 }
    ]) {
      expect(
        generateXYTicks({
          scale,
          size: 130,
          axis: { ...axis, includeMin: true }
        })
      ).toEqual(generateXYTicks({ scale, size: 130, axis }))
    }
    const band = heatmapBandScale(["A", "B"], [130, 0])
    expect(
      generateXYTicks({
        scale: band,
        size: 130,
        axis: { orient: "left", includeMin: true }
      })
    ).toEqual(generateXYTicks({ scale: band, size: 130 }))
  })
  it("relabels horizontal ticks with the final index and list, including Date endpoints", () => {
    const start = new Date(Date.UTC(2024, 0, 1, 1))
    const scale = scaleUtc()
      .domain([start, new Date(Date.UTC(2024, 0, 2))])
      .range([0, 600])
    const ticks = generateXYTicks({
      scale,
      size: 600,
      horizontal: true,
      axis: { orient: "bottom", includeMin: true },
      format: (value, index, all) => `${index}/${all?.length}:${Number(value)}`
    })
    expect(ticks[0].value).toEqual(start)
    expect(ticks.map((tick) => tick.label)).toEqual(
      ticks.map((tick, i) => `${i}/${ticks.length}:${Number(tick.value)}`)
    )
  })
})
