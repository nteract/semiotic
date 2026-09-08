import { bench, describe } from "vitest"
import { scaleBand, scaleLinear } from "d3-scale"
import { buildConnectors } from "../../src/components/stream/ordinalSceneBuilders/connectorScene"
import {
  buildBoxplotScene,
  buildViolinScene,
  buildRidgelineScene
} from "../../src/components/stream/ordinalSceneBuilders/statisticalScene"
import type { OrdinalSceneContext } from "../../src/components/stream/ordinalSceneBuilders/types"
import type { PointSceneNode } from "../../src/components/stream/types"

const style = { fill: "#4682b4" }
const layout = { width: 800, height: 600 }

function makeContext(categories: string[]): OrdinalSceneContext {
  return {
    scales: {
      o: scaleBand<string>().domain(categories).range([0, layout.width]),
      r: scaleLinear().domain([0, 1000]).range([layout.height, 0]),
      projection: "vertical"
    },
    columns: {},
    config: {
      chartType: "boxplot",
      windowSize: 100_000,
      windowMode: "sliding",
      extentPadding: 0,
      projection: "vertical"
    },
    getR: (d) => d.value,
    getO: (d) => d.category,
    getConnector: (d) => d.series,
    multiScales: [],
    rAccessors: [(d) => d.value],
    resolvePieceStyle: () => style,
    resolveSummaryStyle: () => style,
    getRawRange: () => null
  }
}

describe("Ordinal distribution scenes", () => {
  for (const size of [10_000, 100_000]) {
    const ctx = makeContext(["A"])
    ctx.columns.A = {
      name: "A",
      x: 0,
      y: 0,
      width: 800,
      middle: 400,
      padding: 0,
      pct: 1,
      pctStart: 0,
      pieceData: Array.from({ length: size }, (_, i) => ({
        category: "A",
        value: (i * 7919) % 1000
      }))
    }
    for (const [name, build] of [
      ["boxplot", buildBoxplotScene],
      ["violin", buildViolinScene],
      ["ridgeline", buildRidgelineScene]
    ] as const) {
      bench(`${name}-${size}`, () => {
        build(ctx, layout)
      })
    }
  }
})

describe("Ordinal connectors", () => {
  const categories = Array.from({ length: 1000 }, (_, i) => `category-${i}`)
  const ctx = makeContext(categories)
  const pieces: PointSceneNode[] = []
  for (let series = 0; series < 10; series++) {
    for (let i = 0; i < categories.length; i++) {
      const rank = (i * 7919) % categories.length
      pieces.push({
        type: "point",
        x: rank,
        y: series,
        r: 3,
        style,
        datum: { category: categories[rank], series: `series-${series}` }
      })
    }
  }
  bench("connectors-1000-categories-10-series", () => {
    buildConnectors(ctx, pieces, layout)
  })
})
