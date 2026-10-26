import { describe, expect, it } from "vitest"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import {
  advanceTransition,
  snapshotPositions,
  startTransition,
  type PrevPath,
  type PrevPosition,
  type TransitionContext,
  type TransitionState
} from "./pipelineTransitions"
import type { OrdinalChartType } from "./ordinalTypes"
import type { SceneNode, Style, TransitionConfig } from "./types"

const context: TransitionContext = {
  runtimeMode: "streaming",
  getX: (d) => d.x,
  getY: (d) => d.y
}
const transition: TransitionConfig = { duration: 300, easing: "linear" }
const styles: Array<[string, Style]> = [
  ["fill only", { fillOpacity: 0.7 }],
  ["stroke only", { strokeOpacity: 0.4 }],
  [
    "independent channels",
    { opacity: 0.5, fillOpacity: 0.8, strokeOpacity: 0.3 }
  ],
  ["transparent channels", { opacity: 0.5, fillOpacity: 0, strokeOpacity: 0 }],
  ["transparent mark", { opacity: 0, fillOpacity: 0.8, strokeOpacity: 0.3 }],
  ["default channels", {}]
]
const marks: SceneNode[] = [
  { type: "point", x: 20, y: 30, r: 5, style: {}, datum: { x: 1, y: 2 } },
  { type: "rect", x: 20, y: 30, w: 10, h: 40, style: {}, datum: {} },
  {
    type: "glyph",
    x: 20,
    y: 30,
    size: 10,
    color: "red",
    glyph: { parts: [{ d: "M0 0L10 0L10 10Z" }] },
    style: {},
    datum: {}
  },
  { type: "heatcell", x: 20, y: 30, w: 10, h: 40, fill: "red", datum: {} },
  {
    type: "candlestick",
    x: 20,
    openY: 30,
    closeY: 40,
    highY: 20,
    lowY: 50,
    bodyWidth: 10,
    upColor: "red",
    downColor: "blue",
    wickColor: "black",
    wickWidth: 1,
    isUp: true,
    datum: { x: 1, y: 2 }
  },
  {
    type: "line",
    path: [
      [0, 0],
      [20, 30]
    ],
    style: {},
    datum: []
  },
  {
    type: "area",
    topPath: [
      [0, 0],
      [20, 30]
    ],
    bottomPath: [
      [0, 50],
      [20, 50]
    ],
    style: {},
    datum: []
  }
]

function expectFade(
  style: Style | undefined,
  authored: Style,
  remaining: number
) {
  expect(style?.fillOpacity).toBe(authored.fillOpacity)
  expect(style?.strokeOpacity).toBe(authored.strokeOpacity)
  expect(style?.opacity).toBeCloseTo((authored.opacity ?? 1) * remaining)
  // Check effective paint alpha too: channel opacity must not be folded into
  // the animated multiplier and then multiplied a second time by the renderer.
  for (const channel of ["fillOpacity", "strokeOpacity"] as const) {
    expect((style?.opacity ?? 1) * (style?.[channel] ?? 1)).toBeCloseTo(
      (authored.opacity ?? 1) * (authored[channel] ?? 1) * remaining
    )
  }
}

describe.each(marks)("XY $type exits", (mark) => {
  it.each(styles)("fades from authored %s", (_label, authored) => {
    const source = { ...mark, style: { ...authored } }
    const positions = new Map<string, PrevPosition>()
    const paths = new Map<string, PrevPath>()
    snapshotPositions(context, [source], positions, paths)
    const state: TransitionState = {
      scene: [],
      exitNodes: [],
      activeTransition: null
    }
    startTransition(context, transition, state, positions, paths, 100)
    expect(state.exitNodes).toHaveLength(1)
    const exit = state.exitNodes[0]
    expect(exit.type).toBe(mark.type)
    expectFade(exit.style, authored, 1)

    for (const elapsed of [0, 150, 300]) {
      advanceTransition(100 + elapsed, transition, state, positions, paths)
      expectFade(exit.style, authored, 1 - elapsed / 300)
      expect(source.style).toEqual(authored)
    }
    expect(state.scene).toEqual([])
    expect(state.exitNodes).toEqual([])
    expect(state.activeTransition).toBeNull()
  })
})

describe.each<OrdinalChartType>(["point", "bar", "pie"])(
  "Ordinal %s exits",
  (chartType) => {
    it.each(styles)(
      "fades from authored %s after data replacement",
      (_label, authored) => {
        const store = new OrdinalPipelineStore({
          chartType,
          windowSize: 100,
          windowMode: "sliding",
          extentPadding: 0.05,
          projection: chartType === "pie" ? "radial" : "vertical",
          oAccessor: "category",
          rAccessor: "value",
          pieceStyle: () => ({ ...authored }),
          transition,
          clock: () => 100,
          introAnimation: false
        })
        const retained = { category: "A", value: 10 }
        store.ingest({
          inserts: [retained, { category: "B", value: 20 }],
          bounded: true
        })
        store.computeScene({ width: 400, height: 300 })
        expect(store.scene).toHaveLength(2)
        const source = store.scene[1]
        expect(source.style).toMatchObject(authored)
        const initialStyle = { ...source.style }

        store.ingest({ inserts: [retained], bounded: true })
        store.computeScene({ width: 400, height: 300 })
        expect(store.exitNodes).toHaveLength(1)
        const exit = store.exitNodes[0]
        expect(exit.type).toBe(source.type)
        expectFade(exit.style, initialStyle, 1)
        const start = store.activeTransition!.startTime
        for (const elapsed of [0, 150, 300]) {
          store.advanceTransition(start + elapsed)
          expectFade(exit.style, initialStyle, 1 - elapsed / 300)
          expect(source.style).toEqual(initialStyle)
        }
        expect(store.scene).toHaveLength(1)
        expect(store.scene).not.toContain(exit)
        expect(store.exitNodes).toEqual([])
        expect(store.activeTransition).toBeNull()
      }
    )
  }
)
