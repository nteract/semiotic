import { bench, describe } from "vitest"
import { bondProcessSankeyNodeData } from "../../src/components/charts/network/processSankey/groupBonding"
import type { ProcessSankeyNodeData } from "../../src/components/charts/network/processSankey/algorithm"
import { chordLayoutPlugin } from "../../src/components/stream/layouts/chordLayoutPlugin"
import type {
  RealtimeNode,
  RealtimeEdge,
  NetworkPipelineConfig
} from "../../src/components/stream/networkTypes"

describe("ProcessSankey group bonding", () => {
  for (const sampleCount of [500, 2000]) {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: `node-${i}`,
      group: "group"
    }))
    const data: Record<string, ProcessSankeyNodeData> = Object.fromEntries(
      nodes.map((node, i) => [
        node.id,
        {
          samples: Array.from({ length: sampleCount }, (_, j) => ({
            t: j * 2 + (i % 3),
            topMass: 1 + (j % 7),
            botMass: 2 + (j % 5)
          })),
          peak: 13,
          topPeak: 7,
          botPeak: 6,
          localAttachments: new Map()
        }
      ])
    )
    const slots = nodes.map((node) => ({
      group: "group",
      peak: { topPeak: 7, botPeak: 6 },
      occupants: [{ id: node.id, end: sampleCount * 2 }]
    }))
    const slotByNode = Object.fromEntries(nodes.map((node, i) => [node.id, i]))
    const centerlines = Object.fromEntries(
      nodes.map((node, i) => [node.id, i * 15])
    )
    bench(`bond-20-bands-${sampleCount}-samples`, () => {
      bondProcessSankeyNodeData(nodes, data, slots, slotByNode, centerlines, 1)
    })
  }
})

describe("Chord layout and scene", () => {
  for (const nodeCount of [100, 500]) {
    const nodes: RealtimeNode[] = Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i}`,
      x: 0,
      y: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      width: 0,
      height: 0,
      value: 0
    }))
    const edges: RealtimeEdge[] = nodes.flatMap((node, i) =>
      [1, 5, 7].map((offset) => ({
        source: node.id,
        target: nodes[(i + offset) % nodeCount].id,
        value: 1 + (i % 10),
        y0: 0,
        y1: 0,
        sankeyWidth: 0
      }))
    )
    const config: NetworkPipelineConfig = {
      chartType: "chord",
      nodeStyle: () => ({ fill: "blue", stroke: "white" }),
      edgeStyle: () => ({ fill: "blue", fillOpacity: 0.5 })
    }
    const size: [number, number] = [600, 600]
    chordLayoutPlugin.computeLayout(nodes, edges, config, size)
    bench(`chord-layout-${nodeCount}-nodes`, () => {
      chordLayoutPlugin.computeLayout(nodes, edges, config, size)
    })
    bench(`chord-scene-${nodeCount}-nodes`, () => {
      chordLayoutPlugin.buildScene(nodes, edges, config, size)
    })
  }
})
