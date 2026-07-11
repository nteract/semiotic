import { afterEach, describe, expect, it, vi } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import type { OrdinalPipelineConfig, OrdinalSceneNode } from "./ordinalTypes"

/**
 * Dynamic-prop contract matrix
 *
 * Store tests elsewhere protect individual regressions. This file protects the
 * update lifecycle as a matrix: a retained store must converge on the same
 * data, extents/scales, and scene geometry as a freshly-created store after a
 * dynamic change. The frame companion covers presentation-only props whose
 * observable contract is a repaint rather than a scene rebuild.
 *
 * Covered here:
 *   data: add, update, remove, replace, reorder
 *   accessors: partial XY and ordinal updates against retained data
 *   dimensions: a resized retained scene matches a fresh layout
 *   styles/selection: custom-layout restyle is paint-only
 *   animation/pulse/window/layout callbacks: dynamic resources and contracts
 */

type XYRow = Datum & {
  id: string
  x: number
  x2: number
  y: number
  y2: number
}

type OrdinalRow = Datum & {
  id: string
  category: string
  category2: string
  value: number
  value2: number
}

const XY_LAYOUT = { width: 240, height: 120 }
const ORDINAL_LAYOUT = { width: 240, height: 120 }

const xyInitial: XYRow[] = [
  { id: "a", x: 1, x2: 10, y: 2, y2: 20 },
  { id: "b", x: 2, x2: 20, y: 4, y2: 40 },
  { id: "c", x: 3, x2: 30, y: 6, y2: 60 },
]

const ordinalInitial: OrdinalRow[] = [
  { id: "a", category: "A", category2: "North", value: 2, value2: 20 },
  { id: "b", category: "B", category2: "South", value: 4, value2: 40 },
  { id: "c", category: "C", category2: "West", value: 6, value2: 60 },
]

function makeXYConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    runtimeMode: "bounded",
    windowSize: 20,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0,
    xAccessor: "x",
    yAccessor: "y",
    pointIdAccessor: "id",
    ...overrides,
  }
}

function makeOrdinalConfig(
  overrides: Partial<OrdinalPipelineConfig> = {},
): OrdinalPipelineConfig {
  return {
    chartType: "bar",
    runtimeMode: "bounded",
    windowSize: 20,
    windowMode: "sliding",
    extentPadding: 0,
    projection: "vertical",
    oAccessor: "category",
    rAccessor: "value",
    dataIdAccessor: "id",
    // Keep this matrix focused on data mutation semantics. The default ordinal
    // sort intentionally gives bounded replacement and streaming append
    // different category-order policies; that policy is covered separately.
    oSort: false,
    ...overrides,
  }
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function datumId(datum: unknown): string {
  if (!datum || typeof datum !== "object" || !("id" in datum)) return ""
  return String((datum as Record<string, unknown>).id ?? "")
}

function xySceneSignature(store: PipelineStore) {
  return store.scene.map((node) => {
    if (node.type !== "point") return { type: node.type }
    return {
      type: node.type,
      id: datumId(node.datum),
      x: round(node.x),
      y: round(node.y),
      r: round(node.r),
    }
  })
}

function ordinalSceneSignature(store: OrdinalPipelineStore) {
  return store.scene.map((node: OrdinalSceneNode) => ({
    type: node.type,
    id: datumId(node.datum),
    x: "x" in node ? round(node.x) : undefined,
    y: "y" in node ? round(node.y) : undefined,
    w: "w" in node ? round(node.w) : undefined,
    h: "h" in node ? round(node.h) : undefined,
  }))
}

function seedXY(store: PipelineStore, data: XYRow[] = xyInitial): void {
  store.ingest({ inserts: data, bounded: true })
  store.computeScene(XY_LAYOUT)
}

function seedOrdinal(store: OrdinalPipelineStore, data: OrdinalRow[] = ordinalInitial): void {
  store.ingest({ inserts: data, bounded: true })
  store.computeScene(ORDINAL_LAYOUT)
}

function expectXYToMatchFresh(
  store: PipelineStore,
  data: XYRow[],
  config: Partial<PipelineConfig> = {},
  layout = XY_LAYOUT,
): void {
  const fresh = new PipelineStore(makeXYConfig(config))
  fresh.ingest({ inserts: data, bounded: true })
  fresh.computeScene(layout)
  store.computeScene(layout)

  expect(store.getData()).toEqual(data)
  expect(store.getExtents()).toEqual(fresh.getExtents())
  expect(xySceneSignature(store)).toEqual(xySceneSignature(fresh))
}

function expectOrdinalToMatchFresh(
  store: OrdinalPipelineStore,
  data: OrdinalRow[],
  config: Partial<OrdinalPipelineConfig> = {},
  layout = ORDINAL_LAYOUT,
): void {
  const fresh = new OrdinalPipelineStore(makeOrdinalConfig(config))
  fresh.ingest({ inserts: data, bounded: true })
  fresh.computeScene(layout)
  store.computeScene(layout)

  expect(store.getData()).toEqual(data)
  expect(store.scales?.o.domain()).toEqual(fresh.scales?.o.domain())
  expect(store.scales?.r.domain()).toEqual(fresh.scales?.r.domain())
  expect(ordinalSceneSignature(store)).toEqual(ordinalSceneSignature(fresh))
}

describe("dynamic-prop contract matrix — retained data", () => {
  const xyCases: Array<{
    name: string
    apply: (store: PipelineStore) => void
    expected: XYRow[]
  }> = [
    {
      name: "add",
      apply: (store) => store.ingest({
        inserts: [{ id: "d", x: 4, x2: 40, y: 8, y2: 80 }],
        bounded: false,
      }),
      expected: [...xyInitial, { id: "d", x: 4, x2: 40, y: 8, y2: 80 }],
    },
    {
      name: "update",
      apply: (store) => { store.update("b", (datum) => ({ ...datum, y: 44 })) },
      expected: xyInitial.map((datum) => datum.id === "b" ? { ...datum, y: 44 } : datum),
    },
    {
      name: "remove",
      apply: (store) => { store.remove("b") },
      expected: xyInitial.filter((datum) => datum.id !== "b"),
    },
    {
      name: "replace",
      apply: (store) => store.ingest({
        inserts: [
          { id: "d", x: 4, x2: 40, y: 8, y2: 80 },
          { id: "e", x: 5, x2: 50, y: 10, y2: 100 },
        ],
        bounded: true,
      }),
      expected: [
        { id: "d", x: 4, x2: 40, y: 8, y2: 80 },
        { id: "e", x: 5, x2: 50, y: 10, y2: 100 },
      ],
    },
    {
      name: "reorder",
      apply: (store) => store.ingest({ inserts: [...xyInitial].reverse(), bounded: true }),
      expected: [...xyInitial].reverse(),
    },
  ]

  const ordinalCases: Array<{
    name: string
    apply: (store: OrdinalPipelineStore) => void
    expected: OrdinalRow[]
  }> = [
    {
      name: "add",
      apply: (store) => store.ingest({
        inserts: [{ id: "d", category: "D", category2: "East", value: 8, value2: 80 }],
        bounded: false,
      }),
      expected: [...ordinalInitial, { id: "d", category: "D", category2: "East", value: 8, value2: 80 }],
    },
    {
      name: "update",
      apply: (store) => { store.update("b", (datum) => ({ ...datum, value: 44 })) },
      expected: ordinalInitial.map((datum) => datum.id === "b" ? { ...datum, value: 44 } : datum),
    },
    {
      name: "remove",
      apply: (store) => { store.remove("b") },
      expected: ordinalInitial.filter((datum) => datum.id !== "b"),
    },
    {
      name: "replace",
      apply: (store) => store.ingest({
        inserts: [
          { id: "d", category: "D", category2: "East", value: 8, value2: 80 },
          { id: "e", category: "E", category2: "Central", value: 10, value2: 100 },
        ],
        bounded: true,
      }),
      expected: [
        { id: "d", category: "D", category2: "East", value: 8, value2: 80 },
        { id: "e", category: "E", category2: "Central", value: 10, value2: 100 },
      ],
    },
    {
      name: "reorder",
      apply: (store) => store.ingest({ inserts: [...ordinalInitial].reverse(), bounded: true }),
      expected: [...ordinalInitial].reverse(),
    },
  ]

  for (const scenario of xyCases) {
    it(`converges XY ${scenario.name} mutations on the fresh-store result`, () => {
      const store = new PipelineStore(makeXYConfig())
      seedXY(store)
      scenario.apply(store)
      expectXYToMatchFresh(store, scenario.expected)
    })
  }

  for (const scenario of ordinalCases) {
    it(`converges ordinal ${scenario.name} mutations on the fresh-store result`, () => {
      const store = new OrdinalPipelineStore(makeOrdinalConfig())
      seedOrdinal(store)
      scenario.apply(store)
      expectOrdinalToMatchFresh(store, scenario.expected)
    })
  }
})

describe("dynamic-prop contract matrix — configuration lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rebuilds retained XY and ordinal data for partial accessor patches", () => {
    const xy = new PipelineStore(makeXYConfig())
    seedXY(xy)
    xy.updateConfig({ yAccessor: "y2" })
    expectXYToMatchFresh(xy, xyInitial, { yAccessor: "y2" })
    expect(xy.getXAccessor()(xyInitial[0])).toBe(1)

    const ordinal = new OrdinalPipelineStore(makeOrdinalConfig())
    seedOrdinal(ordinal)
    ordinal.updateConfig({ rAccessor: "value2" })
    expectOrdinalToMatchFresh(ordinal, ordinalInitial, { rAccessor: "value2" })
  })

  it("remaps retained XY and ordinal scenes to a resized layout", () => {
    const resizedXY = { width: 480, height: 240 }
    const xy = new PipelineStore(makeXYConfig())
    seedXY(xy)
    expectXYToMatchFresh(xy, xyInitial, {}, resizedXY)

    const resizedOrdinal = { width: 480, height: 240 }
    const ordinal = new OrdinalPipelineStore(makeOrdinalConfig())
    seedOrdinal(ordinal)
    expectOrdinalToMatchFresh(ordinal, ordinalInitial, {}, resizedOrdinal)
  })

  it("keeps custom selection styling paint-only and replaces layout callbacks", () => {
    const firstLayout = vi.fn((ctx: { data: Datum[] }) => ({
      nodes: ctx.data.map((datum, index) => ({
        type: "point" as const,
        datum,
        pointId: String(datum.id),
        x: index * 10,
        y: 10,
        r: 4,
        style: { fill: "#2563eb", opacity: 1 },
      })),
      restyle: (node: { datum: Datum }, selection: { id: string } | null) => ({
        opacity: selection && node.datum.id !== selection.id ? 0.1 : 1,
      }),
    }))
    const replacementLayout = vi.fn((ctx: { data: Datum[] }) => ({
      nodes: ctx.data.map((datum, index) => ({
        type: "point" as const,
        datum,
        pointId: String(datum.id),
        x: index * 20,
        y: 20,
        r: 5,
        style: { fill: "#dc2626", opacity: 1 },
      })),
    }))
    const store = new PipelineStore(makeXYConfig({
      chartType: "custom",
      customLayout: firstLayout as never,
    }))
    seedXY(store)
    expect(firstLayout).toHaveBeenCalledTimes(1)

    store.setLayoutSelection({ id: "a" } as never)
    store.restyleScene({ id: "a" } as never)
    expect(store.scene.find((node) => node.type === "point" && datumId(node.datum) === "b")?.style?.opacity).toBe(0.1)
    expect(store.consumeStylePaintPending()).toBe(true)
    expect(store.consumeStylePaintPending()).toBe(false)

    store.updateConfig({ customLayout: replacementLayout as never })
    store.computeScene(XY_LAYOUT)
    expect(replacementLayout).toHaveBeenCalledTimes(1)
    expect(store.scene.every((node) => node.type !== "point" || node.style.fill === "#dc2626")).toBe(true)
  })

  it("adds/removes pulse resources and keeps windowSize explicitly mount-only", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const store = new PipelineStore(makeXYConfig({ windowSize: 3 }))
    seedXY(store)
    const originalCapacity = store.getBuffer().capacity

    store.updateConfig({ pulse: { duration: 10_000, color: "#f97316" } })
    store.computeScene(XY_LAYOUT)
    expect(store.scene.some((node) => "_pulseIntensity" in node)).toBe(true)

    store.updateConfig({ pulse: undefined, windowSize: 8 })
    store.computeScene(XY_LAYOUT)
    expect(store.getBuffer().capacity).toBe(originalCapacity)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("windowSize changed after mount"))
    expect(store.scene.some((node) => "_pulseIntensity" in node)).toBe(false)
  })

  it("marks a newly configured animation as eligible for the next rebuild", () => {
    const store = new PipelineStore(makeXYConfig())
    seedXY(store)
    const state = store as unknown as { needsFullRebuild: boolean }
    expect(state.needsFullRebuild).toBe(false)

    store.updateConfig({ transition: { duration: 120, easing: "linear" } })
    expect(state.needsFullRebuild).toBe(true)
  })
})
