import { describe, expect, it } from "vitest"
import {
  packedClusterMatrix,
  type PackedClusterMatrixConfig
} from "./packedClusterMatrix"
import { symbolExtent } from "../stream/symbolPath"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { NetworkSymbolNode } from "../stream/networkTypes"

type Row = { id: string; column: string; row: string; size: unknown }

function layout(
  rows: Row[],
  config: PackedClusterMatrixConfig = {},
  width = 600,
  height = 400
) {
  const ctx: NetworkLayoutContext<PackedClusterMatrixConfig> = {
    nodes: rows.map((data) => ({
      id: data.id,
      data
    })) as unknown as NetworkLayoutContext["nodes"],
    edges: [],
    dimensions: { width, height, plot: { x: 0, y: 0, width, height } },
    theme: { semantic: { primary: "#4e79a7" }, categorical: ["#4e79a7"] },
    resolveColor: () => "#4e79a7",
    config: { sizeAccessor: "size", ...config },
    selection: null
  }
  return (packedClusterMatrix(ctx).sceneNodes ?? []) as NetworkSymbolNode[]
}

function diagonal(count = 600): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    column: i < count / 2 ? "A" : "B",
    row: i < count / 2 ? "one" : "two",
    size: (i % 7) + 1
  }))
}

function assertSeparated(
  marks: NetworkSymbolNode[],
  width: number,
  height: number
) {
  const radii = marks.map((m) => symbolExtent(m.symbolType, m.size))
  let worst = 1
  for (let i = 0; i < marks.length; i++) {
    const a = marks[i],
      r = radii[i]
    expect([a.cx, a.cy, a.size].every(Number.isFinite)).toBe(true)
    expect(a.size).toBeGreaterThan(0)
    expect(a.cx - r).toBeGreaterThanOrEqual(-1e-8)
    expect(a.cx + r).toBeLessThanOrEqual(width + 1e-8)
    expect(a.cy - r).toBeGreaterThanOrEqual(-1e-8)
    expect(a.cy + r).toBeLessThanOrEqual(height + 1e-8)
    for (let j = i + 1; j < marks.length; j++) {
      worst = Math.min(
        worst,
        Math.hypot(a.cx - marks[j].cx, a.cy - marks[j].cy) / (r + radii[j])
      )
    }
  }
  expect(worst).toBeGreaterThanOrEqual(1 - 1e-8)
}

describe("packed matrix integrity", () => {
  it.each(["banded", "stacked"] as const)(
    "fits pointy glyphs with large gaps and zero relaxation in %s cells",
    (rowMode) => {
      const rows = diagonal(90).map((r, i) => ({
        ...r,
        column: `c${i % 5}`,
        row: `r${i % 3}`
      }))
      const marks = layout(
        rows,
        {
          rowMode,
          cellSizing: "uniform",
          defaultSymbol: "star",
          columnOrder: [],
          rowOrder: [],
          columnGap: 100,
          rowGap: 100,
          packPadding: 8,
          iterations: 0,
          showRowLabels: false,
          showColumnHeaders: false
        },
        60,
        40
      )
      expect(marks).toHaveLength(rows.length)
      assertSeparated(marks, 60, 40)
    }
  )

  it("uses the same glyph size for equal values in cells with different occupancy", () => {
    const rows = diagonal(200).map((r, i) => ({
      ...r,
      column: i < 190 ? "A" : "B",
      size: 1
    }))
    const marks = layout(rows)
    expect(new Set(marks.map((m) => m.size)).size).toBe(1)
    assertSeparated(marks, 600, 400)
  })

  it("handles entirely invalid size data and an explicit finite size domain", () => {
    const rows = diagonal(40).map((r) => ({ ...r, size: "missing" }))
    const marks = layout(rows, { sizeDomain: [10, 100] })
    expect(marks).toHaveLength(rows.length)
    expect(marks.map((m) => m.size)).toEqual(Array(40).fill(4 * Math.PI))
    assertSeparated(marks, 600, 400)
  })

  it("does not reuse geometry for fractional plot changes", () => {
    const rows = diagonal(40)
    const a = layout(rows, {}, 600.1)
    const b = layout(rows, {}, 600.4)
    expect(b.map((m) => m.cx)).not.toEqual(a.map((m) => m.cx))
    expect(layout(rows, {}, 600.1).map((m) => m.cx)).toEqual(a.map((m) => m.cx))
  })
  it.each(["banded", "stacked"] as const)(
    "preserves unlisted categories and ignores duplicate/unknown order entries in %s mode",
    (rowMode) => {
      const rows = diagonal(60).map((r, i) => ({
        ...r,
        row: i % 2 ? "two" : "one"
      }))
      const marks = layout(rows, {
        columnOrder: ["missing", "B", "B"],
        rowOrder: ["two", "two"],
        rowMode
      })
      expect(marks.map((m) => m.id)).toEqual(rows.map((r) => r.id))
      expect(marks.find((m) => m.id === "n30")!.cx).toBeLessThan(marks[0].cx)
      expect(marks[1].cy).toBeGreaterThan(marks[0].cy)
    }
  )

  it.each(["n/a", NaN, Infinity, -Infinity])(
    "treats invalid size %s as the domain minimum without poisoning neighbors",
    (invalid) => {
      const rows = diagonal(80)
      rows[3].size = invalid
      const actual = layout(rows)
      const expected = layout(
        rows.map((r) => (r.id === "n3" ? { ...r, size: 1 } : r))
      )
      expect(actual.map(({ cx, cy, size }) => ({ cx, cy, size }))).toEqual(
        expected.map(({ cx, cy, size }) => ({ cx, cy, size }))
      )
      assertSeparated(actual, 600, 400)
    }
  )

  it.each(["banded", "stacked"] as const)(
    "keeps skewed %s cells finite and separated on resize, preserving size ratios",
    (rowMode) => {
      const rows = diagonal()
      const roomy = layout(rows, { rowMode }, 1600, 1000)
      for (const [width, height] of [
        [600, 400],
        [240, 180]
      ]) {
        const marks = layout(rows, { rowMode }, width, height)
        expect(marks).toHaveLength(rows.length)
        assertSeparated(marks, width, height)
        const factor = marks[0].size / roomy[0].size
        marks.forEach((mark, i) =>
          expect(mark.size / roomy[i].size).toBeCloseTo(factor, 10)
        )
      }
    }
  )
})
