import { describe, expect, it } from "vitest"
import { findBarColumnAtX } from "./barColumnLookup"
import { buildBarScene } from "../xySceneBuilders/barScene"
import type { XYSceneContext } from "../xySceneBuilders/types"
import type { Datum } from "../../charts/shared/datumTypes"
import type { RectSceneNode } from "../types"
import { getSourceRows } from "../../store/selectionProvenance"

// 10px per data unit over a [0, 30] domain.
function sceneFor(data: Datum[], options: { domain?: [number, number]; stacked?: boolean } = {}) {
  const [d0, d1] = options.domain ?? [0, 30]
  const x = Object.assign((v: number) => (v - d0) * 10, { domain: () => [d0, d1], range: () => [0, (d1 - d0) * 10] })
  const y = Object.assign((v: number) => 100 - v * 10, { domain: () => [0, 10], range: () => [100, 0] })
  const ctx = {
    scales: { x, y },
    config: { binSize: 10, trackHoverRows: true, barColors: { North: "#f00", South: "#00f" } },
    getX: (d: Datum) => d.time,
    getY: (d: Datum) => d.value,
    ...(options.stacked !== false && { getCategory: (d: Datum) => d.category }),
  } as unknown as XYSceneContext
  return buildBarScene(ctx, data).nodes
}

const data = [
  { time: 2, value: 3, category: "North" },
  { time: 7, value: 1, category: "South" },
  { time: 12, value: 2, category: "South" },
]

describe("findBarColumnAtX", () => {
  it("lists a bin's segments bottom to top with their values and colors", () => {
    const column = findBarColumnAtX(sceneFor(data), 5)!
    expect(column.series.map(({ group, value, color }) => ({ group, value, color }))).toEqual([
      { group: "North", value: 3, color: "#f00" },
      { group: "South", value: 1, color: "#00f" },
    ])
    expect(column.xPx).toBe(50)
  })

  it("matches the half-open bin range in data space", () => {
    const scene = sceneFor(data)
    expect(findBarColumnAtX(scene, 0)?.datum.binStart).toBe(0)
    expect(findBarColumnAtX(scene, 9.999)?.datum.binStart).toBe(0)
    expect(findBarColumnAtX(scene, 10)?.datum.binStart).toBe(10)
  })

  it("resolves the space between bars and above a short stack to the bin", () => {
    // Gaps sit inside the bin edges: 0.3 data units is 3px, inside the 1px gap band.
    const column = findBarColumnAtX(sceneFor(data), 0.03)!
    expect(column.datum).toEqual({
      binStart: 0,
      binEnd: 10,
      total: 4,
      categories: [{ category: "North", value: 3 }, { category: "South", value: 1 }],
    })
    expect(getSourceRows(column.datum)).toEqual(data.slice(0, 2))
  })

  it("resolves a bin clipped at the domain edge", () => {
    const column = findBarColumnAtX(sceneFor(data, { domain: [5, 30] }), 6)!
    expect([column.datum.binStart, column.datum.binEnd]).toEqual([0, 10])
    const clipped = sceneFor(data, { domain: [5, 30] })[0] as RectSceneNode
    expect(column.xPx).toBe(clipped.x + clipped.w / 2)
  })

  it("returns null for an empty bin and ignores rects that are not bins", () => {
    const scene = sceneFor(data)
    const annotation: RectSceneNode = { type: "rect", x: 250, y: 0, w: 50, h: 100, style: { fill: "#eee" }, datum: { label: "note" } }
    expect(findBarColumnAtX([...scene, annotation], 25)).toBeNull()
  })

  it("uses an unstacked bar's own datum and total", () => {
    const scene = sceneFor(data, { stacked: false })
    const column = findBarColumnAtX(scene, 12)!
    expect(column.datum).toBe(scene[1].datum)
    expect(column.series.map(({ group, value }) => [group, value])).toEqual([["", 2]])
  })
})
