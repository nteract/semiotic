import { describe, expect, it } from "vitest"
import { normalizeValueBands, valueBandSegments } from "./valueBands"
import { buildBarScene } from "./barScene"
import type { XYSceneContext } from "./types"
import type { Datum } from "../../charts/shared/datumTypes"
import type { HatchFill } from "../../charts/shared/hatchFill"

const hatch: HatchFill = { type: "hatch", stroke: "#b45309", spacing: 5 }

describe("value band segmentation", () => {
  it("orders bands and keeps an open last band", () => {
    expect(normalizeValueBands([{ fill: "#f00" }, { upTo: 10, fill: hatch }, { upTo: 5, fill: "#00f" }])).toEqual([
      { upTo: 5, fill: "#00f" },
      { upTo: 10, fill: hatch },
      { upTo: Infinity, fill: "#f00" },
    ])
    expect(normalizeValueBands([])).toBeUndefined()
    expect(normalizeValueBands(undefined)).toBeUndefined()
  })

  it("splits a bar at the band edges it crosses", () => {
    const bands = normalizeValueBands([{ upTo: 5, fill: "#00f" }, { upTo: 10, fill: hatch }, { fill: "#f00" }])!
    expect(valueBandSegments(bands, 0, 12, "#base")).toEqual([
      { from: 0, to: 5, fill: "#00f" },
      { from: 5, to: 10, fill: hatch },
      { from: 10, to: 12, fill: "#f00" },
    ])
    expect(valueBandSegments(bands, 0, 3, "#base")).toEqual([{ from: 0, to: 3, fill: "#00f" }])
    expect(valueBandSegments(bands, 0, 0, "#base")).toEqual([])
  })

  it("leaves values above the last bounded band in the bar's own fill", () => {
    const bands = normalizeValueBands([{ upTo: 5, fill: "#00f" }])!
    expect(valueBandSegments(bands, 0, 8, "#base")).toEqual([
      { from: 0, to: 5, fill: "#00f" },
      { from: 5, to: 8, fill: "#base" },
    ])
  })
})

describe("buildBarScene valueBands", () => {
  const yScale = Object.assign((v: number) => 100 - v * 5, { domain: () => [0, 20], range: () => [100, 0] })
  const xScale = Object.assign((v: number) => v, { domain: () => [0, 100], range: () => [0, 100] })
  const ctx = (config: XYSceneContext["config"]): XYSceneContext => ({
    scales: { x: xScale, y: yScale } as unknown as XYSceneContext["scales"],
    config,
    getX: (d) => d.x,
    getY: (d) => d.y,
    resolveLineStyle: () => ({}),
    resolveAreaStyle: () => ({}),
    resolveBoundsStyle: () => ({}),
    resolveColorMap: () => new Map(),
    resolveGroupColor: () => null,
    groupData: (data: Datum[]) => [{ key: "default", data }],
  })

  it("keeps one mark per bin and paints its value bands", () => {
    const { nodes } = buildBarScene(
      ctx({
        binSize: 10,
        barStyle: { fill: "#base", valueBands: [{ upTo: 5, fill: "#00f" }, { upTo: 10, fill: hatch }, { fill: "#f00" }] },
      }),
      [{ x: 1, y: 12 }, { x: 15, y: 4 }],
    )
    expect(nodes).toHaveLength(2)
    const [tall, short] = nodes
    expect(tall.datum).toMatchObject({ binStart: 0, binEnd: 10, total: 12 })
    expect(tall.style.fill).toBe("#base")
    expect(tall.fillBands).toEqual([
      { y0: 100, y1: 75, fill: "#00f" },
      { y0: 75, y1: 50, fill: hatch },
      { y0: 50, y1: 40, fill: "#f00" },
    ])
    expect(short.fillBands).toEqual([{ y0: 100, y1: 80, fill: "#00f" }])
  })

  it("ignores valueBands on stacked bins", () => {
    const { nodes } = buildBarScene(
      {
        ...ctx({ binSize: 10, barStyle: { valueBands: [{ upTo: 5, fill: "#00f" }] } }),
        getCategory: (d: Datum) => d.kind,
      },
      [{ x: 1, y: 12, kind: "a" }],
    )
    expect(nodes).toHaveLength(1)
    expect(nodes[0].fillBands).toBeUndefined()
  })
})
