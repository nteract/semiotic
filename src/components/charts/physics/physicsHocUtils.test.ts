import { describe, expect, it } from "vitest"
import {
  physicsMarginForMode,
  resolvePhysicsChartSize,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsModes,
  resolvePhysicsTooltipProps
} from "./physicsHocUtils"

describe("resolvePhysicsModes", () => {
  it("treats legacy mode=mechanical as simulationMode", () => {
    expect(resolvePhysicsModes({ mode: "mechanical" })).toEqual({
      chartMode: undefined,
      simulationMode: "mechanical"
    })
  })

  it("keeps ChartMode and simulationMode orthogonal", () => {
    expect(
      resolvePhysicsModes({ mode: "context", simulationMode: "mechanical" })
    ).toEqual({
      chartMode: "context",
      simulationMode: "mechanical"
    })
  })

  it("defaults simulationMode to sample for display modes", () => {
    expect(resolvePhysicsModes({ mode: "sparkline" })).toEqual({
      chartMode: "sparkline",
      simulationMode: "sample"
    })
  })

  it("defaults both when mode is omitted", () => {
    expect(resolvePhysicsModes({})).toEqual({
      chartMode: undefined,
      simulationMode: "sample"
    })
  })
})

describe("physicsMarginForMode", () => {
  it("uses zero margins for primary (full-bleed physics)", () => {
    expect(physicsMarginForMode(false, "primary")).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    })
  })

  it("pads compact modes so chrome does not clip", () => {
    expect(physicsMarginForMode(true, "context")).toEqual({
      top: 8,
      right: 8,
      bottom: 8,
      left: 8
    })
    expect(physicsMarginForMode(true, "sparkline")).toEqual({
      top: 2,
      right: 2,
      bottom: 2,
      left: 2
    })
  })
})

describe("resolvePhysicsChartSize", () => {
  it("prefers explicit size over width/height/fallback", () => {
    expect(resolvePhysicsChartSize([100, 50], 200, 80, [700, 400])).toEqual([
      100, 50
    ])
  })

  it("falls through width/height then fallback", () => {
    expect(resolvePhysicsChartSize(undefined, 320, undefined, [700, 400])).toEqual([
      320, 400
    ])
    expect(resolvePhysicsChartSize(undefined, undefined, undefined, [700, 400])).toEqual([
      700, 400
    ])
  })
})

describe("resolvePhysicsTooltipProps", () => {
  it("disables hover when tooltip is false", () => {
    expect(resolvePhysicsTooltipProps(false, { enableHover: true })).toEqual({
      enableHover: false
    })
  })

  it("passes through frame enableHover when tooltip is undefined", () => {
    expect(resolvePhysicsTooltipProps(undefined, { enableHover: true })).toEqual({
      enableHover: true,
      tooltipContent: undefined
    })
  })
})

describe("resolvePhysicsFrameSharedProps", () => {
  it("forwards Semiotic chrome, observation, and mode extras to the frame", () => {
    const onObservation = () => undefined
    const onClick = () => undefined
    const annotations = [{ type: "label", x: 1, y: 2, label: "A" }]
    const shared = resolvePhysicsFrameSharedProps(
      {
        chartId: "flow-1",
        title: "User title",
        description: "desc",
        summary: "sum",
        color: "#abc",
        stroke: "#111",
        strokeWidth: 2,
        opacity: 0.5,
        emphasis: "secondary",
        annotations,
        onObservation,
        onClick,
        accessibleTable: false
      },
      { enableHover: true },
      [{ id: "s1", label: "Stage", x: 10, y: 10 }],
      {
        chartMode: "mobile",
        className: "semiotic-physics--mobile",
        title: "Mode title",
        margin: { top: 8, right: 8, bottom: 8, left: 8 },
        enableHover: false
      }
    )

    expect(shared.chartId).toBe("flow-1")
    expect(shared.chartMode).toBe("mobile")
    expect(shared.className).toBe("semiotic-physics--mobile")
    expect(shared.title).toBe("Mode title")
    expect(shared.annotations).toEqual(annotations)
    expect(shared.color).toBe("#abc")
    expect(shared.emphasis).toBe("secondary")
    expect(shared.accessibleTable).toBe(false)
    expect(shared.enableHover).toBe(false)
    expect(shared.margin).toEqual({ top: 8, right: 8, bottom: 8, left: 8 })
    expect(shared.semanticItems).toEqual([
      { id: "s1", label: "Stage", x: 10, y: 10 }
    ])
    expect(shared.onObservation).toBe(onObservation)
    // onClick is wrapped to drop the body field for BaseChartProps
    expect(typeof shared.onClick).toBe("function")
  })

  it("prefers HOC props over frameProps for description/summary", () => {
    const shared = resolvePhysicsFrameSharedProps(
      { description: "hoc", summary: "hoc-sum" },
      { description: "frame", summary: "frame-sum" }
    )
    expect(shared.description).toBe("hoc")
    expect(shared.summary).toBe("hoc-sum")
  })
})
