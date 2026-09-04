import { describe, expect, it } from "vitest"
import { scaleLinear } from "d3-scale"
import {
  buildAreaNode,
  buildLineNode,
  buildStackedAreaNodes
} from "./SceneGraph"
import { findAllNodesAtX, findNearestNode } from "./CanvasHitTester"
import { extractXYNavPoints } from "./keyboardNav"
import { extractAllRows } from "./accessibleDataRows"
import {
  buildAreaScene,
  buildStackedAreaScene
} from "./xySceneBuilders/areaScene"
import { buildMixedScene } from "./xySceneBuilders/mixedScene"
import { buildRibbonForGroup } from "./xySceneBuilders/ribbonScene"
import type { Datum } from "../charts/shared/datumTypes"
import type { XYSceneContext } from "./xySceneBuilders/types"
import type { SceneNode, StreamScales } from "./types"

const getX = (d: Datum) => d.x
const getY = (d: Datum) => d.y
const style = { fill: "blue", stroke: "blue" }

function context(scales: StreamScales): XYSceneContext {
  return {
    scales,
    config: {},
    getX,
    getY,
    groupData: (data) => [{ key: "series", data }],
    resolveLineStyle: () => style,
    resolveAreaStyle: () => style,
    resolveBoundsStyle: () => style,
    resolveColorMap: () => new Map(),
    resolveGroupColor: () => null
  }
}

const builders: [
  string,
  (data: Datum[], scales: StreamScales) => SceneNode[]
][] = [
  ["line", (data, scales) => [buildLineNode(data, scales, getX, getY, style)]],
  [
    "area",
    (data, scales) => [buildAreaNode(data, scales, getX, getY, 0, style)]
  ],
  ["area scene", (data, scales) => buildAreaScene(context(scales), data)],
  [
    "mixed area",
    (data, scales) =>
      buildMixedScene(
        {
          ...context(scales),
          config: { areaGroups: new Set(["series"]) }
        },
        data
      )
  ],
  [
    "stacked area",
    (data, scales) => buildStackedAreaScene(context(scales), data)
  ],
  [
    "interactive ribbon",
    (data, scales) => {
      const node = buildRibbonForGroup(context(scales), data, "series", {
        kind: "band",
        getTop: getY,
        getBottom: () => 0,
        perSeries: true,
        interactive: true
      })
      return node ? [node] : []
    }
  ]
]

describe.each(builders)("%s semantic vertex alignment", (_label, build) => {
  it.each([false, true])(
    "agrees across geometry, hover, keyboard, and tables (reversed=%s)",
    (reversed) => {
      const scales = {
        x: scaleLinear()
          .domain([0, 30])
          .range(reversed ? [30, 0] : [0, 30]),
        y: scaleLinear().domain([0, 10]).range([0, 10])
      }
      const rows = [
        { id: "invalid", x: 0, y: NaN },
        { id: "right", x: 20, y: 2 },
        { id: "left", x: 10, y: 1 },
        { id: "infinite", x: Infinity, y: 3 }
      ]
      const before = rows.slice()
      const scene = build(rows, scales)
      expect(scene).toHaveLength(1)
      const node = scene[0]
      if (node.type !== "line" && node.type !== "area")
        throw new Error("Expected series")
      const path = node.type === "line" ? node.path : node.topPath
      expect(path).toHaveLength(2)
      expect(path[0][0]).toBeLessThan(path[1][0])
      const expected = [rows[1], rows[2]].sort(
        (a, b) => scales.x(a.x) - scales.x(b.x)
      )
      expect(node.datum).toEqual(expected)
      expect(extractAllRows(scene).map(({ values }) => values.id)).toEqual(
        expected.map(({ id }) => id)
      )
      expect(extractXYNavPoints(scene).map(({ datum }) => datum)).toEqual(
        expected
      )
      for (const row of expected) {
        expect(findNearestNode(scene, scales.x(row.x), row.y)?.datum).toBe(row)
        expect(findAllNodesAtX(scene, scales.x(row.x))[0]?.datum).toBe(row)
      }
      expect(rows).toEqual(before)
    }
  )
})

describe("stacked area segments", () => {
  const scales = {
    x: scaleLinear().domain([0, 10]).range([0, 10]),
    y: scaleLinear().domain([0, 10]).range([0, 10])
  }

  it.each(["zero", "diverging", "wiggle", "silhouette"] as const)(
    "keeps each gap-separated segment's own source rows (%s)",
    (baseline) => {
      const rows = [5, 1, 3, 4, 2].map((x) => ({
        id: String(x),
        x,
        y: x === 3 ? 0 : x
      }))
      const { nodes } = buildStackedAreaNodes(
        [{ key: "a", data: rows }],
        scales,
        getX,
        getY,
        () => style,
        false,
        undefined,
        baseline
      )
      expect(nodes).toHaveLength(2)
      expect(nodes.map((node) => node.datum?.map(({ x }) => x))).toEqual([
        [1, 2],
        [4, 5]
      ])
      expect(extractXYNavPoints(nodes).map(({ datum }) => datum?.x)).toEqual([
        1, 2, 4, 5
      ])
      expect(extractAllRows(nodes).map(({ values }) => values.x)).toEqual([
        1, 2, 4, 5
      ])
    }
  )

  it.each([false, true])(
    "preserves aggregate values and contributors (normalized=%s)",
    (normalize) => {
      const rows = [
        { x: 2, y: 4 },
        { x: 1, y: 2 },
        { x: 1, y: 3 }
      ]
      const { nodes } = buildStackedAreaNodes(
        [{ key: "a", data: rows }],
        scales,
        getX,
        getY,
        () => style,
        normalize
      )
      expect(nodes[0].rawValues).toEqual([5, 4])
      expect(nodes[0].datum?.[0]).toMatchObject({
        x: 1,
        __aggregateValue: 5,
        __aggregateCount: 2,
        __aggregateRows: [rows[1], rows[2]]
      })
      expect(findAllNodesAtX(nodes, 1)[0].datum).toBe(nodes[0].datum?.[0])
      expect(extractAllRows(nodes)[0].values).toEqual({
        x: 1,
        value: 5,
        group: "a",
        observations: 2
      })
      expect(rows[1]).toEqual({ x: 1, y: 2 })
    }
  )

  it("omits invalid baselines and scaled coordinates together with their data", () => {
    const rows = [
      { x: 1, y: 1, low: NaN },
      { x: 2, y: 2, low: 0 },
      { x: 3, y: 3, low: 1 }
    ]
    const node = buildAreaNode(
      rows,
      scales,
      getX,
      getY,
      0,
      style,
      undefined,
      (d) => d.low
    )
    expect(node.datum).toEqual(rows.slice(1))
    expect(node.rawValues).toEqual([2, 3])
    const loglike = {
      ...scales,
      x: (() => NaN) as unknown as StreamScales["x"]
    }
    expect(buildAreaNode(rows, loglike, getX, getY, 0, style).datum).toEqual([])
    expect(buildLineNode(rows, loglike, getX, getY, style).datum).toEqual([])
    expect(
      buildStackedAreaNodes(
        [{ key: "a", data: rows }],
        loglike,
        getX,
        getY,
        () => style
      ).nodes
    ).toEqual([])
  })
})
