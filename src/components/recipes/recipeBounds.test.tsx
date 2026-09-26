import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleBand, scaleLinear } from "d3-scale"
import { bulletLayout } from "./bullet"
import { intervalLanesLayout } from "./intervalLanes"
import { waffleLayout } from "./waffle"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"

function context<C>(data: Datum[], config: C, height = 180, width = 400) {
  return {
    data,
    config,
    dimensions: {
      width,
      height,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 10, y: 20, width, height }
    },
    scales: {
      o: scaleBand<string>(),
      r: scaleLinear(),
      projection: "vertical" as const,
      x: scaleLinear(),
      y: scaleLinear()
    },
    theme: { semantic: {}, categorical: ["blue"] },
    resolveColor: () => "blue"
  }
}

const bulletConfig = {
  categoryAccessor: "metric",
  valueAccessor: "actual",
  targetAccessor: "target",
  rangesAccessor: "ranges"
}
const kpis = ["Revenue", "Profit", "Orders", "Retention"].map((metric) => ({
  metric,
  actual: 60,
  target: 80,
  ranges: [50, 100]
}))

describe("recipe bounds and omission disclosure (#1505)", () => {
  it.each([
    { rows: 0 },
    { columns: 1.5 },
    { rows: Infinity },
    { gutter: -1 },
    { gutter: NaN },
    { gutter: 100 }
  ])("discloses invalid empty waffle grids %j", (config) => {
    const result = waffleLayout(context([], config))
    expect(result.nodes).toEqual([])
    const svg = renderToStaticMarkup(result.overlays)
    expect(svg).toContain("0 of 0 rows shown")
    expect(svg).toContain(
      "The grid needs positive integer dimensions and enough space for its gutters."
    )
    expect(svg).toContain('role="img"')
  })

  it("keeps valid empty waffle and bullet charts free of omission notices", () => {
    expect(
      waffleLayout(context([], { rows: 2, columns: 2 })).overlays
    ).toBeNull()
    expect(
      renderToStaticMarkup(bulletLayout(context([], bulletConfig)).overlays)
    ).not.toContain("rows shown")
  })

  it("preserves waffle category order when remainders tie", () => {
    const result = waffleLayout(
      context(
        [
          { cat: "Z", value: 1 },
          { cat: "A", value: 3 }
        ],
        { rows: 1, columns: 2, categoryAccessor: "cat", valueAccessor: "value" }
      )
    )
    expect((result.nodes as RectSceneNode[]).map((n) => n.group)).toEqual([
      "Z",
      "A"
    ])
    expect(result.overlays).toBeNull()
  })
  it("keeps every interval inside a short lane, including concurrent tracks", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      lane: String(i % 10),
      start: 0,
      end: 1
    }))
    const result = intervalLanesLayout(
      context(
        data,
        {
          laneAccessor: "lane",
          startAccessor: "start",
          endAccessor: "end",
          domain: [0, 1],
          lanes: Array.from({ length: 10 }, (_, i) => String(i))
        },
        100
      )
    )
    expect(result.nodes).toHaveLength(20)
    for (const node of result.nodes as RectSceneNode[]) {
      const top = 20 + Number(node.group) * 10
      expect(node.h).toBeGreaterThan(0)
      expect(node.y).toBeGreaterThanOrEqual(top)
      expect(node.y + node.h).toBeLessThanOrEqual(top + 10)
    }
    const svg = renderToStaticMarkup(result.overlays)
    const labels = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(
      (m) => m[1]
    )
    expect(labels.slice(10)).toEqual(["0", "0.2", "0.4", "0.6", "0.8", "1"])
  })

  it.each([
    [NaN, 1],
    [0, Infinity],
    [1, 0]
  ])("rejects an invalid lane domain %s–%s", (min, max) => {
    expect(
      intervalLanesLayout(
        context([{ lane: "A", start: 0, end: 1 }], {
          laneAccessor: "lane",
          startAccessor: "start",
          endAccessor: "end",
          domain: [min, max]
        })
      ).nodes
    ).toEqual([])
  })

  it("discloses overflow and reserves room for the notice below bullet ticks", () => {
    const result = bulletLayout(context(kpis, bulletConfig))
    const actual = (result.nodes as RectSceneNode[]).filter(
      (n) => n.group === "actual"
    )
    expect(actual.map((n) => n.datum?.metric)).toEqual([
      "Revenue",
      "Profit",
      "Orders"
    ])
    const svg = renderToStaticMarkup(result.overlays)
    expect(svg).toContain("3 of 4 rows shown")
    expect(svg).toContain("enough plot space")
    // Last row + its tick labels end above the disclosure's 18px strip.
    const lastRange = (result.nodes as RectSceneNode[])
      .filter((n) => n.group === "range-1")
      .at(-1)!
    expect(lastRange.y + lastRange.h + 14).toBeLessThanOrEqual(20 + 180 - 18)
  })

  it("compacts skipped zero rows and discloses them", () => {
    const result = bulletLayout(
      context(
        [
          { metric: "Empty", actual: 0, target: 0, ranges: [] },
          ...kpis.slice(0, 2)
        ],
        bulletConfig
      )
    )
    const first = (result.nodes as RectSceneNode[]).find(
      (n) => n.group === "range-0"
    )!
    expect(first.y).toBe(20)
    expect(first.datum?.metric).toBe("Revenue")
    expect(renderToStaticMarkup(result.overlays)).toContain("2 of 3 rows shown")
  })

  it("discloses bullets that cannot fit horizontally", () => {
    const result = bulletLayout(context(kpis, bulletConfig, 180, 90))
    expect(result.nodes).toEqual([])
    expect(renderToStaticMarkup(result.overlays)).toContain("0 of 4 rows shown")
  })

  it("keeps tiny configured bullet marks inside their row", () => {
    const result = bulletLayout(
      context(kpis.slice(0, 1), { ...bulletConfig, rowHeight: 1 })
    )
    for (const node of result.nodes as RectSceneNode[]) {
      expect(node.h).toBeGreaterThan(0)
      expect(node.y).toBeGreaterThanOrEqual(20)
      expect(node.y + node.h).toBeLessThanOrEqual(21)
    }
  })

  it("discloses zero-cell categories without changing proportional allocation", () => {
    const result = waffleLayout(
      context(
        [
          { cat: "Large", value: 100 },
          { cat: "Tiny", value: 0.001 },
          { cat: "Zero", value: 0 }
        ],
        { rows: 2, columns: 2, categoryAccessor: "cat", valueAccessor: "value" }
      )
    )
    expect(result.nodes).toHaveLength(4)
    for (const node of result.nodes as RectSceneNode[]) {
      expect(node.group).toBe("Large")
      expect(node.y + node.h).toBeLessThanOrEqual(20 + 180 - 18)
    }
    const svg = renderToStaticMarkup(result.overlays)
    expect(svg).toContain("1 of 3 categories shown")
    expect(svg).toContain("rounded to zero cells")
  })

  it.each([0, -1, 1.5, NaN, Infinity])(
    "discloses invalid waffle dimensions %s",
    (rows) => {
      const result = waffleLayout(context([{ cat: "A", value: 1 }], { rows }))
      expect(result.nodes).toEqual([])
      expect(renderToStaticMarkup(result.overlays)).toContain(
        "0 of 1 rows shown"
      )
    }
  )

  it("discloses a grid consumed by gutters and an all-zero dataset", () => {
    const data = [{ cat: "A", value: 0 }]
    const crowded = waffleLayout(context(data, { gutter: 100 }))
    expect(crowded.nodes).toEqual([])
    expect(renderToStaticMarkup(crowded.overlays)).toContain(
      "enough space for its gutters"
    )
    const empty = waffleLayout(
      context(data, { categoryAccessor: "cat", valueAccessor: "value" })
    )
    expect(empty.nodes).toEqual([])
    expect(renderToStaticMarkup(empty.overlays)).toContain(
      "0 of 1 categories shown"
    )
  })
})
