// @vitest-environment node
import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Scatterplot } from "../charts/xy/Scatterplot"
import { BubbleChart } from "../charts/xy/BubbleChart"
import { AreaChart } from "../charts/xy/AreaChart"
import { WaterfallChart } from "../charts/xy/WaterfallChart"
import { BarChart } from "../charts/ordinal/BarChart"
import { PieChart } from "../charts/ordinal/PieChart"
import { SwarmPlot } from "../charts/ordinal/SwarmPlot"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import { Treemap } from "../charts/network/Treemap"
import { CirclePack } from "../charts/network/CirclePack"
import { ProportionalSymbolMap } from "../charts/geo/ProportionalSymbolMap"

// An intro animation starts from a zero state (r=0 points, zero-height bars,
// zero-sweep arcs, collapsed network nodes). The server render, and the
// hydration pass that must match it, has no canvas to animate on, so it must
// serialize the final state rather than the first intro frame.
const xy = [
  { x: 1, y: 2, size: 3 },
  { x: 2, y: 5, size: 6 },
  { x: 3, y: 3, size: 2 }
]
const categories = [
  { category: "a", value: 3 },
  { category: "b", value: 5 }
]
const edges = [
  { source: "a", target: "b", value: 2 },
  { source: "b", target: "c", value: 1 }
]
const tree = { name: "root", children: [{ name: "a", value: 3 }, { name: "b", value: 5 }] }
const points = [
  { lon: -120, lat: 40, value: 3 },
  { lon: -100, lat: 35, value: 6 }
]

const cases: Array<[string, (animate: boolean) => React.ReactElement]> = [
  ["Scatterplot", (animate) => <Scatterplot data={xy} width={300} height={200} animate={animate} />],
  ["BubbleChart", (animate) => <BubbleChart data={xy} sizeBy="size" width={300} height={200} animate={animate} />],
  ["AreaChart", (animate) => <AreaChart data={xy} width={300} height={200} animate={animate} />],
  ["WaterfallChart", (animate) => <WaterfallChart data={xy} width={300} height={200} animate={animate} />],
  ["BarChart", (animate) => <BarChart data={categories} width={300} height={200} animate={animate} />],
  ["PieChart", (animate) => <PieChart data={categories} width={300} height={200} animate={animate} />],
  ["SwarmPlot", (animate) => <SwarmPlot data={categories} width={300} height={200} animate={animate} />],
  ["SankeyDiagram", (animate) => <SankeyDiagram edges={edges} width={300} height={200} animate={animate} />],
  ["Treemap", (animate) => <Treemap data={tree} width={300} height={200} animate={animate} />],
  ["CirclePack", (animate) => <CirclePack data={tree} width={300} height={200} animate={animate} />],
  [
    "ProportionalSymbolMap",
    (animate) => <ProportionalSymbolMap points={points} sizeBy="value" width={300} height={200} animate={animate} />
  ]
]

// Cancelling an ordinal intro writes the resolved target opacity back onto the
// mark (`opacity="1"`), which is the same visible result as leaving it unset.
const normalize = (markup: string) => markup.replaceAll(' opacity="1"', "")

describe("SSR with animate renders the final state", () => {
  it.each(cases)("%s server markup matches the non-animated render", (_name, make) => {
    const animated = renderToString(make(true))
    expect(animated).toContain("<svg")
    expect(normalize(animated)).toBe(normalize(renderToString(make(false))))
  })
})
