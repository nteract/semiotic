import { describe, expect, it } from "vitest"
import { resolveChartSize } from "./chartSize"
import { CHART_PRIMARY_SIZES } from "./chartSizeDefaults"
import { CHART_SPECS, composeProps } from "./chartSpecs"

describe("public chart size resolution", () => {
  it("covers every chart in the public specification", () => {
    for (const name of Object.keys(CHART_SPECS)) {
      expect(
        name === "BigNumber" || Object.hasOwn(CHART_PRIMARY_SIZES, name),
        name
      ).toBe(true)
    }
  })

  it("resolves the range/candlestick defaults without caller dimensions", () => {
    expect(resolveChartSize("CandlestickChart")).toEqual({
      width: 600,
      height: 400
    })
    expect(resolveChartSize("CandlestickChart", { mode: "context" })).toEqual({
      width: 400,
      height: 250
    })
    expect(resolveChartSize("CandlestickChart", { mode: "sparkline" })).toEqual(
      { width: 120, height: 24 }
    )
    expect(resolveChartSize("CandlestickChart", { mode: "mobile" })).toEqual({
      width: 390,
      height: 300
    })
  })

  it("applies individual explicit dimensions and responsive rules", () => {
    expect(resolveChartSize("PieChart", { height: 180 })).toEqual({
      width: 400,
      height: 180
    })
    expect(
      resolveChartSize("CandlestickChart", {
        width: 320,
        responsiveRules: [
          {
            when: { maxWidth: 400 },
            transform: { mode: "context", height: 180 }
          }
        ]
      })
    ).toEqual({ width: 320, height: 180 })
  })

  it("uses measurements only on responsive axes and leaves inputs untouched", () => {
    const input = Object.freeze({
      width: 500,
      responsiveWidth: true,
      containerSize: { width: 317.8, height: 190 }
    })
    expect(resolveChartSize("CandlestickChart", input)).toEqual({
      width: 317,
      height: 400
    })
    expect(
      resolveChartSize("CandlestickChart", { responsiveWidth: true })
    ).toEqual({ width: 600, height: 400 })
    expect(
      resolveChartSize("CandlestickChart", { ...input, responsiveHeight: true })
    ).toEqual({ width: 317, height: 190 })
  })

  it("honors tuple precedence for realtime and physics charts", () => {
    for (const chart of [
      "RealtimeHistogram",
      "TemporalHistogram",
      "RealtimeHeatmap",
      "RealtimeLineChart",
      "RealtimeSwarmChart",
      "RealtimeWaterfallChart",
      "PhysicsCustomChart",
      "GaltonBoardChart"
    ] as const) {
      expect(
        resolveChartSize(chart, {
          mode: "sparkline",
          size: [300, 180],
          width: 700,
          responsiveRules: [{ when: { maxWidth: 800 }, transform: { width: 200, height: 100 } }]
        })
      ).toEqual({ width: 300, height: 180 })
    }
    expect(resolveChartSize("PhysicsCustomChart")).toEqual({
      width: 700,
      height: 380
    })
  })

  it("includes the minimap and preserves fixed-size composition modes", () => {
    expect(resolveChartSize("MinimapChart")).toEqual({
      width: 600,
      height: 480
    })
    expect(
      resolveChartSize("MinimapChart", {
        mode: "sparkline",
        minimap: { height: 40, margin: { top: 5, bottom: 10 } }
      })
    ).toEqual({ width: 600, height: 455 })
    expect(resolveChartSize("ProcessSankey", { mode: "context" })).toEqual({
      width: 600,
      height: 400
    })
  })

  it("reports matrix grid dimensions and value-card CSS sizes explicitly", () => {
    expect(
      resolveChartSize("ScatterplotMatrix", { fields: ["x", "y"] })
    ).toEqual({ width: 348, height: 348 })
    expect(resolveChartSize("BigNumber")).toEqual({ width: 280, height: 184 })
    expect(resolveChartSize("BigNumber", { mode: "inline" })).toEqual({
      width: undefined,
      height: undefined
    })
    expect(resolveChartSize("BigNumber", { width: "100%" })).toEqual({
      width: "100%",
      height: 184
    })
  })

  it("keeps schema defaults tied to runtime primary overrides", () => {
    for (const [name, size] of Object.entries(CHART_PRIMARY_SIZES)) {
      if (!size || !CHART_SPECS[name]) continue
      const props = composeProps(CHART_SPECS[name])
      if (props.width) expect(props.width.default, name).toBe(size.width)
      if (props.height) expect(props.height.default, name).toBe(size.height)
    }
  })
})
