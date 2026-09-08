import { scaleBand, scaleLinear } from "d3-scale"
import {
  buildBoxplotScene,
  buildViolinScene,
  buildHistogramScene,
  buildRidgelineScene
} from "./statisticalScene"
import type { OrdinalSceneContext } from "./types"

const layout = { width: 400, height: 300 }

function makeContext(
  values: Array<number | null>,
  projection: "vertical" | "horizontal" = "vertical"
): OrdinalSceneContext {
  return {
    scales: {
      o: scaleBand<string>().domain(["A"]).range([0, 400]),
      r: scaleLinear().domain([0, 4]).range([300, 0]),
      projection
    },
    columns: {
      A: {
        name: "A",
        x: 0,
        y: 0,
        width: 80,
        middle: 40,
        padding: 0,
        pct: 1,
        pctStart: 0,
        pieceData: values.map((value) => ({ category: "A", value }))
      }
    },
    config: {
      chartType: "boxplot",
      windowSize: 200,
      windowMode: "sliding",
      extentPadding: 0,
      projection,
      bins: 2
    },
    getR: (d) => d.value,
    getO: (d) => d.category,
    multiScales: [],
    rAccessors: [(d) => d.value],
    resolvePieceStyle: () => ({ fill: "blue" }),
    resolveSummaryStyle: () => ({ fill: "blue" }),
    getRawRange: () => null
  }
}

describe("distribution statistics", () => {
  for (const [name, build] of [
    ["boxplot", buildBoxplotScene],
    ["violin", buildViolinScene],
    ["ridgeline", buildRidgelineScene]
  ] as const) {
    it.each(["vertical", "horizontal"] as const)(
      `${name} retains quartiles and source data (%s)`,
      (projection) => {
        const ctx = makeContext([4, null, 0, 2, NaN, 2], projection)
        const source = ctx.columns.A.pieceData
        const original = source.slice()
        const [node] = build(ctx, layout)
        expect(node.type).toBe(name === "boxplot" ? "boxplot" : "violin")
        if (node.type !== "boxplot" && node.type !== "violin")
          throw new Error("Missing distribution")
        expect(node.stats).toEqual({
          n: 4,
          min: 0,
          q1: 1.5,
          median: 2,
          q3: 2.5,
          max: 4,
          mean: 2
        })
        expect(node.datum).toBe(source)
        expect(source).toEqual(original)
        if (name === "violin" && node.type === "violin") {
          expect(node.iqrLine).toEqual({
            q1Pos: 187.5,
            medianPos: 150,
            q3Pos: 112.5,
            centerPos: 40,
            isVertical: projection === "vertical"
          })
        }
      }
    )

    it(`${name} handles a constant distribution`, () => {
      const [node] = build(makeContext([2, 2, 2, 2]), layout)
      if (node.type !== "boxplot" && node.type !== "violin")
        throw new Error("Missing distribution")
      expect(node.stats).toEqual({
        n: 4,
        min: 2,
        q1: 2,
        median: 2,
        q3: 2,
        max: 2,
        mean: 2
      })
      if (node.type === "violin") {
        expect(node.pathString).not.toMatch(/NaN|Infinity/)
      }
    })
  }

  it("keeps boxplot whiskers separate from the full distribution and retains outlier identities", () => {
    const ctx = makeContext([100, 3, 1, -100, 5, 4, 2])
    const [box] = buildBoxplotScene(ctx, layout)
    if (box.type !== "boxplot" || !box.outliers)
      throw new Error("Missing boxplot outliers")
    expect(box.stats).toEqual({
      n: 7,
      min: 1,
      q1: 1.5,
      median: 3,
      q3: 4.5,
      max: 5,
      mean: 15 / 7
    })
    expect(box.outliers.map(({ value }) => value)).toEqual([100, -100])
    expect(box.outliers[0].datum).toBe(ctx.columns.A.pieceData[0])
    expect(box.outliers[1].datum).toBe(ctx.columns.A.pieceData[3])

    const [violin] = buildViolinScene(ctx, layout)
    if (violin.type !== "violin") throw new Error("Missing violin")
    expect(violin.stats).toEqual({ ...box.stats, min: -100, max: 100 })
  })

  it("handles a single observation in a boxplot", () => {
    const [node] = buildBoxplotScene(makeContext([2]), layout)
    if (node.type !== "boxplot") throw new Error("Missing boxplot")
    expect(node.stats).toEqual({
      n: 1,
      min: 2,
      q1: 2,
      median: 2,
      q3: 2,
      max: 2,
      mean: 2
    })
    expect(node.outliers).toEqual([])
  })
})

describe("distribution bins", () => {
  it("excludes values outside the domain and includes its upper endpoint", () => {
    const ctx = makeContext([-1, 0, 1, 2, 3, 4, 5])
    ctx.config.normalize = true
    const nodes = buildHistogramScene(ctx, layout)
    expect(nodes).toHaveLength(2)
    expect(nodes.map((node) => node.datum?.count)).toEqual([2, 3])
    expect(nodes.map((node) => node.datum?.range)).toEqual([
      [0, 2],
      [2, 4]
    ])
    for (const node of nodes) {
      if (node.type !== "rect" || !node.datum)
        throw new Error("Missing histogram bin")
      expect(node.h).toBeCloseTo((node.datum.count / 7) * 80 * 0.9)
    }
  })
})
