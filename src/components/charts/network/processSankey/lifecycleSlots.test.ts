import { expect, it } from "vitest"
import { buildEdgeIndex, computeNode, computeProcessSankeyLayout, buildBandCutoutsForNode } from "./algorithm"
import { projectBandSections } from "./bandPaths"

it("paints the whole remaining inventory across a partial side transfer", () => {
  const nodes = [{ id: "Input" }, { id: "Stage" }, { id: "Output" }]
  const edges = [
    { id: "top-in", source: "Input", target: "Stage", startTime: 0, endTime: 10, value: 13, systemOutTime: 45 },
    { id: "bot-in", source: "Input", target: "Stage", startTime: 0, endTime: 10, value: 5, systemOutTime: 45 },
    { id: "top-out", source: "Stage", target: "Output", startTime: 20, endTime: 40, value: 5 },
    { id: "bot-out", source: "Stage", target: "Output", startTime: 30, endTime: 40, value: 10 }
  ]
  const sides = new Map([
    ["top-in", { targetSide: "top" as const }], ["bot-in", { targetSide: "bot" as const }],
    ["top-out", { sourceSide: "top" as const }], ["bot-out", { sourceSide: "bot" as const }]
  ])
  const data = computeNode(nodes[1], buildEdgeIndex(nodes, edges), sides)
  const layout = computeProcessSankeyLayout(nodes, edges, {
    plotH: 400, pairing: "temporal", packing: "reuse", laneOrder: "insertion", lifetimeMode: "full"
  })
  layout.nodeData.Stage = data
  layout.centerlines.Stage = 0
  layout.valueScale = 1
  const identity = (x: number) => x
  const contour = projectBandSections(data.samples, 0, 1, identity, null, "smooth")
  const section = contour.find(knot => knot.x === 30)!
  expect(section.bottom - section.top).toBe(13)
  const stubs = buildBandCutoutsForNode("Stage", edges, layout, identity, null, undefined, contour)
  const painted = stubs.map(({ pathD }) => {
    const ys: number[] = []
    let previous: number[] = []
    for (const match of pathD.matchAll(/([MLC])([^MLCZ]+)/g)) {
      const [x, y] = match[2].trim().split(/\s+/).at(-1)!.split(",").map(Number)
      if (x === 30 || (match[1] === "L" && y === previous[1] &&
        Math.min(x, previous[0]) < 30 && 30 < Math.max(x, previous[0]))) ys.push(y)
      previous = [x, y]
    }
    return [Math.min(...ys), Math.max(...ys)]
  }).sort(([a], [b]) => a - b)
  expect(painted).toEqual([[section.top, 0], [0, section.bottom]])
})
